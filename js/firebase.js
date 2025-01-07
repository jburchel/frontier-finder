import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    getDocs, 
    addDoc, 
    deleteDoc, 
    doc, 
    query, 
    orderBy,
    updateDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { config } from './config.js';

class FirebaseService {
    constructor() {
        this.db = null;
        this.initialized = false;
        this.collectionName = 'top100';
    }

    async initialize() {
        if (this.initialized) return;

        try {
            console.log('Initializing Firebase...');
            const app = initializeApp(config.firebase);
            this.db = getFirestore(app);
            this.initialized = true;
            console.log('Firebase initialized successfully');
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            throw error;
        }
    }

    async getTop100() {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            console.log('Fetching Top 100 list...');
            const top100Ref = collection(this.db, this.collectionName);
            
            try {
                const snapshot = await getDocs(top100Ref);
                const results = snapshot.docs.map(doc => {
                    const data = doc.data();
                    // Ensure ID is always included and not empty
                    if (!doc.id) {
                        console.warn(`Document found with no ID:`, data);
                    }
                    return {
                        id: doc.id || null,
                        ...data
                    };
                });
                
                // Log any items without IDs
                const itemsWithoutIds = results.filter(item => !item.id);
                if (itemsWithoutIds.length > 0) {
                    console.warn(`Found ${itemsWithoutIds.length} items without IDs:`, itemsWithoutIds);
                }
                
                console.log(`Retrieved ${results.length} items from Top 100:`, results);
                return results;
            } catch (error) {
                console.error('Error getting documents:', error);
                throw error;
            }
        } catch (error) {
            console.error('Failed to get Top 100:', error);
            throw error;
        }
    }

    async addToTop100(item) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Import pronunciations
            const { pronunciationMap } = await import('./data/pronunciations.js');

            const cleanItem = {
                ...item,
                pronunciation: pronunciationMap[item.name] || null,
                addedAt: new Date().toISOString()
            };

            const docRef = await addDoc(collection(this.db, this.collectionName), cleanItem);
            console.log('Added item to Top 100:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('Failed to add to Top 100:', error);
            throw error;
        }
    }

    async removeFromTop100(itemId) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const docRef = doc(this.db, this.collectionName, itemId);
            await deleteDoc(docRef);
            console.log('Removed item from Top 100:', itemId);
        } catch (error) {
            console.error('Failed to remove from Top 100:', error);
            throw error;
        }
    }

    async updateDocument(id, data) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Only proceed if we have a valid ID
            if (!id) {
                console.warn('Skipping update for document with no ID');
                return;
            }

            const docRef = doc(this.db, this.collectionName, id);
            await updateDoc(docRef, data);
            console.log('Updated document:', id, 'with data:', data);
        } catch (error) {
            console.error(`Failed to update document ${id}:`, error);
            throw error;
        }
    }
}

// Create and export a single instance
export const firebaseService = new FirebaseService();
export default firebaseService;
