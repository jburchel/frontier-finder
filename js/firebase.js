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

    // Helper method to get collection reference
    getCollectionRef() {
        return collection(this.db, 'top100');
    }

    // Helper method to get document reference
    getDocRef(docId) {
        return doc(this.db, 'top100', docId);
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
            const snapshot = await getDocs(this.getCollectionRef());
            
            const results = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`Retrieved ${results.length} items from Top 100:`, results);
            return results;
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

            const { pronunciationMap } = await import('./data/pronunciations.js');

            const cleanItem = {
                ...item,
                pronunciation: pronunciationMap[item.name] || null,
                addedAt: new Date().toISOString()
            };

            const docRef = await addDoc(this.getCollectionRef(), cleanItem);
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

            const docRef = this.getDocRef(itemId);
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

            if (!id) {
                console.warn('Skipping update for document with no ID');
                return;
            }

            const docRef = this.getDocRef(id);
            await updateDoc(docRef, data);
            console.log('Updated document:', id, 'with data:', data);
        } catch (error) {
            console.error(`Failed to update document ${id}:`, error);
            throw error;
        }
    }

    async removeInvalidEntries() {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            console.log('Removing invalid entries...');
            const snapshot = await getDocs(this.getCollectionRef());
            
            const deletePromises = snapshot.docs
                .filter(doc => !doc.id || doc.id === '')
                .map(doc => deleteDoc(doc.ref));
            
            await Promise.all(deletePromises);
            console.log('Invalid entries removed');
        } catch (error) {
            console.error('Failed to remove invalid entries:', error);
            throw error;
        }
    }

    async cleanupInvalidEntries() {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            console.log('Starting cleanup of invalid entries...');
            const snapshot = await getDocs(this.getCollectionRef());
            
            // Find all documents without IDs or pronunciations
            const invalidDocs = snapshot.docs.filter(doc => {
                const data = doc.data();
                return !doc.id || !data.pronunciation;
            });

            console.log(`Found ${invalidDocs.length} invalid entries to remove`);

            // Delete each invalid document
            for (const doc of invalidDocs) {
                try {
                    await deleteDoc(doc.ref);
                    console.log(`Removed invalid entry: ${doc.data()?.name}`);
                } catch (error) {
                    console.error(`Failed to remove entry: ${doc.data()?.name}`, error);
                }
            }

            console.log('Cleanup complete');
        } catch (error) {
            console.error('Failed to cleanup invalid entries:', error);
            throw error;
        }
    }

    async savePronunciation(peopleName, pronunciation) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Save to a pronunciations collection
            const pronunciationsRef = collection(this.db, 'pronunciations');
            await addDoc(pronunciationsRef, {
                name: peopleName,
                pronunciation: pronunciation,
                generatedAt: new Date().toISOString(),
                isGenerated: true
            });

            console.log(`Saved pronunciation for ${peopleName}`);
        } catch (error) {
            console.error('Failed to save pronunciation:', error);
        }
    }
}

// Create and export a single instance
export const firebaseService = new FirebaseService();
export default firebaseService;
