// Top 100 List Management
class Top100Manager {
    constructor() {
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.selectedGroups = new Set();
        this.top100List = [];
        
        this.initializeUI();
        this.setupEventListeners();
        this.setupAuthStateListener();
    }

    initializeUI() {
        this.addToTop100Button = document.getElementById('addToTop100');
        this.listCountSpan = document.getElementById('listCount');
        this.top100ListContainer = document.getElementById('top100List');
    }

    setupEventListeners() {
        this.addToTop100Button.addEventListener('click', () => this.addSelectedToTop100());
        
        // Listen for changes in the results sections
        document.getElementById('uupgList').addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                this.handleCheckboxChange(e.target);
            }
        });
        
        document.getElementById('fpgList').addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                this.handleCheckboxChange(e.target);
            }
        });
    }

    setupAuthStateListener() {
        this.auth.onAuthStateChanged(user => {
            if (user) {
                this.loadTop100List();
            } else {
                // Handle not logged in state
                this.promptLogin();
            }
        });
    }

    async promptLogin() {
        try {
            // For now, use anonymous auth
            await this.auth.signInAnonymously();
        } catch (error) {
            console.error('Error signing in:', error);
        }
    }

    handleCheckboxChange(checkbox) {
        const groupId = checkbox.value;
        
        if (checkbox.checked) {
            if (this.top100List.length + this.selectedGroups.size >= 100) {
                alert('You can only have up to 100 groups in your list.');
                checkbox.checked = false;
                return;
            }
            this.selectedGroups.add(groupId);
        } else {
            this.selectedGroups.delete(groupId);
        }

        this.updateUI();
    }

    updateUI() {
        const totalSelected = this.top100List.length + this.selectedGroups.size;
        this.listCountSpan.textContent = `${totalSelected}/100 Groups Selected`;
        this.addToTop100Button.disabled = this.selectedGroups.size === 0;
    }

    async loadTop100List() {
        try {
            const snapshot = await this.db.collection('top100Lists')
                .doc(this.auth.currentUser.uid)
                .get();

            this.top100List = snapshot.exists ? snapshot.data().groups : [];
            this.renderTop100List();
            this.updateUI();
        } catch (error) {
            console.error('Error loading Top 100 list:', error);
        }
    }

    async addSelectedToTop100() {
        if (!this.auth.currentUser) {
            await this.promptLogin();
            if (!this.auth.currentUser) return;
        }

        try {
            // Convert selected groups to array and get their data
            const newGroups = Array.from(this.selectedGroups).map(id => {
                const [type, groupId] = id.split('-');
                const resultsList = document.getElementById(`${type}List`);
                const groupElement = resultsList.querySelector(`[data-id="${groupId}"]`);
                
                return {
                    id: groupId,
                    type: type, // 'uupg' or 'fpg'
                    name: groupElement.dataset.name,
                    country: groupElement.dataset.country,
                    population: parseInt(groupElement.dataset.population),
                    language: groupElement.dataset.language,
                    religion: groupElement.dataset.religion,
                    addedAt: new Date().toISOString()
                };
            });

            // Check if adding these would exceed 100
            if (this.top100List.length + newGroups.length > 100) {
                alert('Adding these groups would exceed the 100 group limit.');
                return;
            }

            // Add new groups to the list
            this.top100List = [...this.top100List, ...newGroups];

            // Save to Firestore
            await this.db.collection('top100Lists')
                .doc(this.auth.currentUser.uid)
                .set({
                    groups: this.top100List,
                    updatedAt: new Date().toISOString()
                });

            // Clear selections and update UI
            this.selectedGroups.clear();
            this.uncheckAllCheckboxes();
            this.renderTop100List();
            this.updateUI();
        } catch (error) {
            console.error('Error adding groups to Top 100:', error);
            alert('Error adding groups to your Top 100 list. Please try again.');
        }
    }

    uncheckAllCheckboxes() {
        ['uupg', 'fpg'].forEach(type => {
            const checkboxes = document.getElementById(`${type}List`)
                .querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => checkbox.checked = false);
        });
    }

    renderTop100List() {
        this.top100ListContainer.innerHTML = '';
        
        if (this.top100List.length === 0) {
            this.top100ListContainer.innerHTML = '<p class="empty-list">No groups added to your Top 100 list yet.</p>';
            return;
        }

        const list = document.createElement('ul');
        list.className = 'top-100-items';

        this.top100List.forEach((group, index) => {
            const li = document.createElement('li');
            li.className = 'top-100-item';
            li.innerHTML = `
                <span class="rank">${index + 1}</span>
                <div class="group-info">
                    <h3>${group.name}</h3>
                    <p>
                        <span class="country">${group.country}</span> |
                        <span class="population">Pop: ${group.population.toLocaleString()}</span> |
                        <span class="type">${group.type.toUpperCase()}</span>
                    </p>
                    <p>
                        <span class="language">Language: ${group.language}</span> |
                        <span class="religion">Religion: ${group.religion}</span>
                    </p>
                </div>
                <button class="remove-button" data-index="${index}">×</button>
            `;

            // Add remove button functionality
            li.querySelector('.remove-button').addEventListener('click', () => this.removeFromTop100(index));
            list.appendChild(li);
        });

        this.top100ListContainer.appendChild(list);
    }

    async removeFromTop100(index) {
        try {
            this.top100List.splice(index, 1);
            await this.db.collection('top100Lists')
                .doc(this.auth.currentUser.uid)
                .set({
                    groups: this.top100List,
                    updatedAt: new Date().toISOString()
                });

            this.renderTop100List();
            this.updateUI();
        } catch (error) {
            console.error('Error removing group from Top 100:', error);
            alert('Error removing group from your Top 100 list. Please try again.');
        }
    }
}

// Initialize Top 100 Manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.top100Manager = new Top100Manager();
});
