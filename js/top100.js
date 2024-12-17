// Import Firebase configuration and Firestore functions
import { db, collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from './firebase-config.js';

// Top 100 List Management
class Top100Manager {
    constructor() {
        this.top100List = [];
        this.currentSort = { field: 'rank', order: 'asc' };
        this.currentFilter = '';
        this.initialized = false;
        this.loadingIndicator = document.getElementById('loading');
        this.errorContainer = document.getElementById('error');
    }

    async initialize() {
        try {
            console.log('Initializing Top100Manager...');
            await this.initializeUI();
            this.setupEventListeners();
            await this.loadTop100List(); // Load the list immediately
            this.initialized = true;
            console.log('Top100Manager initialized successfully');
        } catch (error) {
            console.error('Error in Top100Manager initialization:', error);
            const container = document.getElementById('top100List');
            if (container) {
                container.innerHTML = `<p class="error">Error initializing Top 100 list: ${error.message}</p>`;
            }
            throw error;
        }
    }

    async initializeUI() {
        console.log('Initializing UI...');
        this.top100ListContainer = document.getElementById('top100List');
        this.regionFilter = document.getElementById('regionFilter');
        
        if (!this.top100ListContainer || !this.regionFilter) {
            throw new Error('Required UI elements not found');
        }
        
        await this.populateRegionFilter();
        console.log('UI initialized successfully');
    }

    setupEventListeners() {
        // Sort buttons
        const sortButtons = document.querySelectorAll('.sort-button');
        sortButtons.forEach(button => {
            button.addEventListener('click', () => {
                const sortField = button.dataset.sort;
                if (this.currentSort.field === sortField) {
                    // Toggle order if clicking the same field
                    this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
                } else {
                    // Set new field with default ascending order
                    this.currentSort = { field: sortField, order: 'asc' };
                }
                this.sortList();
                this.displayList();
            });
        });

        // Region filter
        if (this.regionFilter) {
            this.regionFilter.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.displayList();
            });
        }
    }

    async loadTop100List() {
        try {
            console.log('Loading Top 100 list...');
            if (this.loadingIndicator) this.loadingIndicator.style.display = 'block';
            if (this.errorContainer) this.errorContainer.style.display = 'none';

            const querySnapshot = await getDocs(collection(db, 'top100'));
            console.log('Fetched documents:', querySnapshot.size);
            
            // Create a map to track unique entries
            const uniqueGroups = new Map();
            const duplicates = [];
            const itemsToUpdate = [];

            // First, process all documents and collect their IDs
            querySnapshot.docs.forEach(doc => {
                const data = doc.data();
                const key = `${data.name}-${data.country}`.toLowerCase();
                
                // Create item with ID from document
                const item = {
                    ...data,     // Spread the data first
                    id: doc.id   // Then set ID to override any potential id in data
                };
                
                console.log('Processing document:', {
                    id: item.id,
                    name: item.name,
                    country: item.country
                });

                if (!uniqueGroups.has(key)) {
                    uniqueGroups.set(key, item);
                    console.log('Added unique item:', {
                        id: item.id,
                        name: item.name,
                        key: key
                    });
                } else {
                    // If we find a duplicate, keep the newer one
                    const existing = uniqueGroups.get(key);
                    const existingDate = new Date(existing.dateAdded || 0);
                    const newDate = new Date(data.dateAdded || 0);
                    
                    if (newDate > existingDate) {
                        // Keep the newer one, delete the older one
                        duplicates.push(existing.id);
                        uniqueGroups.set(key, item);
                        console.log('Replaced older item with newer version:', {
                            oldId: existing.id,
                            newId: item.id,
                            name: item.name
                        });
                    } else {
                        // Keep the existing one, delete the newer one
                        duplicates.push(doc.id);
                        console.log('Keeping older item, marking newer as duplicate:', {
                            keepingId: existing.id,
                            duplicateId: doc.id,
                            name: item.name
                        });
                    }
                }
            });

            // Delete duplicates from Firestore
            if (duplicates.length > 0) {
                console.log('Deleting duplicates:', duplicates);
                await Promise.all(duplicates.map(async (id) => {
                    console.log('Deleting duplicate:', id);
                    try {
                        await deleteDoc(doc(db, 'top100', id));
                    } catch (error) {
                        console.error('Error deleting duplicate:', id, error);
                    }
                }));
                console.log('Duplicates removed successfully');
            }

            // Convert map values to array
            this.top100List = Array.from(uniqueGroups.values());
            
            // Verify all items have IDs and fix any that don't
            const missingIds = this.top100List.filter(item => !item.id);
            if (missingIds.length > 0) {
                console.log('Found items missing IDs:', missingIds);
                
                // Add new documents for items missing IDs
                const updatedItems = await Promise.all(missingIds.map(async (item) => {
                    try {
                        // Create a new document
                        const docRef = await addDoc(collection(db, 'top100'), {
                            ...item,
                            dateAdded: item.dateAdded || new Date().toISOString()
                        });
                        console.log('Created new document for:', item.name, 'with ID:', docRef.id);
                        return { ...item, id: docRef.id };
                    } catch (error) {
                        console.error('Error creating new document for:', item.name, error);
                        return item;
                    }
                }));

                // Update the list with the new IDs
                this.top100List = this.top100List.map(item => {
                    const updatedItem = updatedItems.find(updated => 
                        updated.name === item.name && 
                        updated.country === item.country
                    );
                    return updatedItem || item;
                });
            }

            // Sort the list by rank
            this.sortList();
            this.displayList();
            
            if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';
            console.log('Top 100 list loaded successfully');
        } catch (error) {
            console.error('Error loading Top 100 list:', error);
            if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';
            if (this.errorContainer) {
                this.errorContainer.style.display = 'block';
                this.errorContainer.textContent = `Error loading Top 100 list: ${error.message}`;
            }
            throw error;
        }
    }

    async deleteItem(id) {
        try {
            console.log('Starting delete operation for item:', id);
            if (this.loadingIndicator) this.loadingIndicator.style.display = 'block';
            
            if (!id) {
                throw new Error('No item ID provided for deletion');
            }

            // Delete from Firestore
            console.log('Attempting to delete from Firestore, collection: top100, id:', id);
            const docRef = doc(db, 'top100', id);
            await deleteDoc(docRef);
            console.log('Successfully deleted from Firestore');
            
            // Remove from local list
            const beforeLength = this.top100List.length;
            this.top100List = this.top100List.filter(item => item.id !== id);
            const afterLength = this.top100List.length;
            console.log(`Local list updated. Items removed: ${beforeLength - afterLength}`);
            
            // Update display
            this.displayList();
            console.log('Display updated successfully');
        } catch (error) {
            console.error('Error in deleteItem:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                name: error.name,
                stack: error.stack
            });
            if (this.errorContainer) {
                this.errorContainer.innerHTML = `<p>Error deleting item: ${error.message}</p>`;
                this.errorContainer.style.display = 'block';
            }
            throw error; // Re-throw to handle in the click handler
        } finally {
            if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';
        }
    }

    displayList() {
        if (!this.top100ListContainer) return;

        const filteredList = this.filterList();
        console.log('Displaying filtered list:', filteredList.map(item => ({
            id: item.id,
            name: item.name
        })));

        const html = filteredList.map((item, index) => {
            const typeClass = item.type === 'FPG' ? 'fpg-type' : 'uupg-type';
            console.log('Generating HTML for item:', { id: item.id, name: item.name });
            
            if (!item.id) {
                console.error('Missing ID for item:', item);
            }

            return `
                <div class="upg-card" 
                    draggable="true" 
                    data-id="${item.id || ''}" 
                    data-rank="${index + 1}"
                    ${item.id ? '' : 'disabled'}>
                    <div class="upg-header">
                        <div class="upg-title-container">
                            <div class="rank-badge">#${item.rank || index + 1}</div>
                            <h3 class="upg-title">${item.name}</h3>
                        </div>
                        <button class="rank-badge delete-button" data-id="${item.id || ''}" ${item.id ? '' : 'disabled'}>Delete</button>
                    </div>
                    <div class="upg-details">
                        <div class="upg-column">
                            <p><strong>Type:</strong> <span class="${typeClass}">${item.type.toUpperCase()}</span></p>
                            <p><strong>Country:</strong> ${item.country}</p>
                            <p><strong>Population:</strong> ${item.population.toLocaleString()}</p>
                        </div>
                        <div class="upg-column">
                            <p><strong>Language:</strong> ${item.language}</p>
                            <p><strong>Religion:</strong> ${item.religion}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.top100ListContainer.innerHTML = html;
        
        // Add event listeners for delete buttons
        const deleteButtons = this.top100ListContainer.querySelectorAll('.delete-button');
        deleteButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                // Get the ID from the clicked button, handling event delegation
                const button = e.target.closest('.delete-button');
                const id = button ? button.dataset.id : null;
                console.log('Delete button clicked, element:', button);
                console.log('Delete button clicked for id:', id);
                
                if (!id) {
                    console.error('No item ID found on delete button');
                    alert('Error: Could not identify item to delete');
                    return;
                }
                
                if (confirm('Are you sure you want to remove this people group from the Top 100 list?')) {
                    try {
                        await this.deleteItem(id);
                        console.log('Delete operation completed successfully');
                    } catch (error) {
                        console.error('Error in delete button handler:', error);
                        alert('Failed to delete item. Please try again.');
                    }
                }
            });
        });

        // Add drag and drop event listeners
        const cards = this.top100ListContainer.querySelectorAll('.upg-card');
        cards.forEach(card => {
            // Don't make delete button draggable
            const deleteButton = card.querySelector('.delete-button');
            deleteButton.draggable = false;
            
            card.addEventListener('dragstart', (e) => {
                console.log('Drag started:', card.dataset.id);
                card.classList.add('dragging');
                e.dataTransfer.setData('text/plain', card.dataset.id);
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
            });

            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                const draggingCard = this.top100ListContainer.querySelector('.dragging');
                if (draggingCard === card) return;
                
                const cards = [...this.top100ListContainer.querySelectorAll('.upg-card:not(.dragging)')];
                const draggedOverCard = card;
                draggedOverCard.classList.add('drag-over');
            });

            card.addEventListener('dragleave', () => {
                card.classList.remove('drag-over');
            });

            card.addEventListener('drop', async (e) => {
                e.preventDefault();
                card.classList.remove('drag-over');
                
                const draggedId = e.dataTransfer.getData('text/plain');
                const droppedOnId = card.dataset.id;
                
                if (draggedId === droppedOnId) return;
                
                console.log('Dropping', draggedId, 'onto', droppedOnId);
                
                // Find the indices of both cards
                const draggedIndex = this.top100List.findIndex(item => item.id === draggedId);
                const droppedIndex = this.top100List.findIndex(item => item.id === droppedOnId);
                
                if (draggedIndex === -1 || droppedIndex === -1) {
                    console.error('Could not find indices:', { draggedIndex, droppedIndex });
                    return;
                }

                // Reorder the array
                const [draggedItem] = this.top100List.splice(draggedIndex, 1);
                this.top100List.splice(droppedIndex, 0, draggedItem);

                // Update ranks
                this.top100List.forEach((item, index) => {
                    item.rank = index + 1;
                });

                // Update Firestore documents with new ranks
                try {
                    console.log('Updating ranks in Firestore...');
                    await Promise.all(this.top100List.map(item => 
                        updateDoc(doc(db, 'top100', item.id), { rank: item.rank })
                    ));
                    console.log('Ranks updated successfully');
                } catch (error) {
                    console.error('Error updating ranks:', error);
                    alert('Failed to update ranks. Please refresh the page.');
                }

                // Refresh the display
                this.displayList();
            });
        });
    }

    filterList() {
        return this.top100List.filter(item => !this.currentFilter || item.region === this.currentFilter);
    }

    sortList() {
        this.top100List.sort((a, b) => {
            let valueA = a[this.currentSort.field];
            let valueB = b[this.currentSort.field];

            // Handle numeric values
            if (this.currentSort.field === 'population') {
                valueA = parseInt(valueA) || 0;
                valueB = parseInt(valueB) || 0;
            }

            // Handle string values
            if (typeof valueA === 'string') valueA = valueA.toLowerCase();
            if (typeof valueB === 'string') valueB = valueB.toLowerCase();

            if (valueA < valueB) return this.currentSort.order === 'asc' ? -1 : 1;
            if (valueA > valueB) return this.currentSort.order === 'asc' ? 1 : -1;
            return 0;
        });
    }

    async populateRegionFilter() {
        try {
            // Get unique regions from the list
            const regions = [...new Set(this.top100List.map(item => item.region))].filter(Boolean);
            regions.sort();

            // Create options HTML
            const optionsHtml = [
                '<option value="">All Regions</option>',
                ...regions.map(region => `<option value="${region}">${region}</option>`)
            ].join('');

            this.regionFilter.innerHTML = optionsHtml;
        } catch (error) {
            console.error('Error populating region filter:', error);
            this.regionFilter.innerHTML = '<option value="">Error loading regions</option>';
        }
    }
}

// Initialize Top 100 Manager when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    window.top100Manager = new Top100Manager();
    await window.top100Manager.initialize();
});
