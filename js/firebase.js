import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
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
        this.initializationPromise = null;
    }

    // Helper method to get Firestore database instance
    async getFirestore() {
        if (!this.db) {
            // Initialize if not already done
            await this.initialize();
        }
        return this.db;
    }
    
    // Helper method to get collection reference
    getCollectionRef() {
        if (!this.db) {
            throw new Error('Firebase not initialized. Call initialize() first.');
        }
        return collection(this.db, this.collectionName);
    }

    // Helper method to get document reference
    getDocRef(docId) {
        if (!this.db) {
            throw new Error('Firebase not initialized. Call initialize() first.');
        }
        return doc(this.db, this.collectionName, docId);
    }

    async initialize() {
        console.log('[Firebase] initialize() called');
        
        // If already initialized, return immediately
        if (this.initialized) {
            console.log('[Firebase] Already initialized, returning existing db instance');
            return this.db;
        }
        
        // If initialization is in progress, return the existing promise
        if (this.initializationPromise) {
            console.log('[Firebase] Initialization in progress, returning existing promise');
            return this.initializationPromise;
        }
        
        console.log('[Firebase] Starting new initialization');
        
        // Create a new initialization promise
        this.initializationPromise = new Promise(async (resolve, reject) => {
            try {
                console.log('[Firebase] Initializing with config:', {
                    projectId: config.firebase?.projectId ? '(configured)' : '(missing)',
                    appId: config.firebase?.appId ? '(configured)' : '(missing)',
                    apiKey: config.firebase?.apiKey ? '(configured)' : '(missing)'
                });
                
                // Validate Firebase config
                if (!config.firebase || !config.firebase.apiKey || !config.firebase.projectId) {
                    const errorMsg = 'Firebase configuration is missing or incomplete. Check config.js file.';
                    console.error('[Firebase]', errorMsg);
                    reject(new Error(errorMsg));
                    return;
                }
                
                // Initialize Firebase app - handle case where app is already initialized
                let app;
                try {
                    console.log('[Firebase] Initializing Firebase app...');
                    app = initializeApp(config.firebase);
                    console.log('[Firebase] Firebase app initialized successfully');
                } catch (initError) {
                    console.warn('[Firebase] Firebase app already initialized, getting existing app');
                    // If app is already initialized, get the existing app
                    const apps = getApps();
                    if (apps.length > 0) {
                        app = apps[0];
                        console.log('[Firebase] Using existing Firebase app instance');
                    } else {
                        const errorMsg = 'Failed to initialize Firebase app: ' + initError.message;
                        console.error('[Firebase]', errorMsg);
                        reject(new Error(errorMsg));
                        return;
                    }
                }
                
                try {
                    console.log('[Firebase] Getting Firestore instance...');
                    this.db = getFirestore(app);
                    console.log('[Firebase] Firestore instance created');
                    
                    // Test connection by getting collection reference
                    console.log('[Firebase] Testing Firestore connection...');
                    const collectionRef = collection(this.db, this.collectionName);
                    console.log('[Firebase] Successfully got collection reference, connection test passed');
                    
                    this.initialized = true;
                    console.log('[Firebase] Initialization completed successfully');
                    resolve(this.db);
                } catch (firestoreError) {
                    const errorMsg = `Firestore initialization failed: ${firestoreError.message}`;
                    console.error('[Firebase]', errorMsg, firestoreError);
                    reject(new Error(errorMsg));
                }
            } catch (error) {
                console.error('Firebase initialization failed:', error);
                this.initialized = false;
                this.initializationPromise = null; // Reset the promise so we can try again
                reject(error);
            }
        });
        
        return this.initializationPromise;
    }

    async getTop100() {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            console.log('Fetching Top 100 list...');
            const snapshot = await getDocs(this.getCollectionRef());
            
            const results = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Convert Firestore timestamp to Date if it exists
                    dateAdded: data.addedAt ? new Date(data.addedAt) : new Date()
                };
            });
            
            console.log(`Retrieved ${results.length} items from Top 100`);
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

            // Get pronunciation from the item if it exists, or generate it
            let pronunciation = item.pronunciation;
            if (!pronunciation) {
                try {
                    const { pronunciationService } = await import('./services/pronunciationService.js');
                    pronunciation = await pronunciationService.generatePronunciation(item.name);
                } catch (error) {
                    console.warn('Failed to generate pronunciation:', error);
                    pronunciation = null;
                }
            }

            const cleanItem = {
                ...item,
                pronunciation: pronunciation,
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
