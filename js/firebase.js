/**
 * Firebase/Firestore service for Frontier Finder
 */
class FirebaseService {
    constructor() {
        console.group('Firebase Initialization');
        console.log('Initializing Firebase service');

        // Firebase project configuration
        this.projectId = 'crossover-people-finder';
        this.baseUrl = `https://firestore.googleapis.com/v1beta1/projects/${this.projectId}/databases/(default)/documents`;
        this.apiKey = 'AIzaSyBtzaibXTCspENsEVaN8XF5DkuizsjxVX4';
        
        console.log('Firebase initialized');
        console.groupEnd();
    }

    /**
     * Add a people group to Top 100 list
     * @param {Object} peopleGroup - People group data
     * @returns {Promise<string>} - Document ID
     */
    async addToTop100(peopleGroup) {
        try {
            // Check if we're at the limit
            const currentCount = await this.getTop100Count();
            if (currentCount >= 100) {
                throw new Error('Top 100 list is full');
            }
            
            // Add timestamp and format data
            const docData = {
                ...peopleGroup,
                addedAt: new Date(),
                type: peopleGroup.IsUUPG ? 'UUPG' : 'FPG'
            };

            const response = await fetch(`${this.baseUrl}/top100`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fields: this.convertToFirestoreFields(docData)
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result.name.split('/').pop(); // Extract ID from document path
        } catch (error) {
            console.error('Failed to add to Top 100:', error);
            throw error;
        }
    }

    /**
     * Remove a people group from Top 100 list
     * @param {string} docId - Document ID to remove
     */
    async removeFromTop100(docId) {
        try {
            const response = await fetch(`${this.baseUrl}/top100/${docId}?key=${this.apiKey}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to remove from Top 100:', error);
            throw error;
        }
    }

    /**
     * Get current Top 100 list
     * @returns {Promise<Array>} - Array of people groups
     */
    async getTop100() {
        console.group('Fetching Top 100');
        try {
            console.log('Executing Firestore query...');
            try {
                // Construct proper Firestore REST API URL with structured query
                const url = new URL(`${this.baseUrl}:runQuery`);
                url.searchParams.append('key', this.apiKey);
                
                const structuredQuery = {
                    structuredQuery: {
                        from: [{ collectionId: 'top100' }],
                        orderBy: [{ field: { fieldPath: 'addedAt' }, direction: 'DESCENDING' }],
                        limit: 100
                    }
                };
                
                const response = await fetch(url.toString(), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(structuredQuery)
                });
                
                if (!response.ok) {
                    console.error('API Error:', await response.text());
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('Raw API response:', data);
                
                const results = data
                    .filter(doc => doc.document) // Filter out empty results
                    .map(doc => {
                        const id = doc.document.name.split('/').pop();
                        const fields = this.convertFirestoreFields(doc.document.fields);
                        return { id, ...fields };
                    });
                
                console.log('Processed results:', results);
                console.groupEnd();
                return results;
            } catch (e) {
                console.error('Failed to fetch data:', e);
                return [];
            }
        } catch (error) {
            console.error('Failed to get Top 100:', error);
            console.groupEnd();
            throw error;
        }
    }

    /**
     * Get current count of Top 100 list
     * @returns {Promise<number>} - Current count
     */
    async getTop100Count() {
        try {
            const response = await fetch(`${this.baseUrl}/top100?pageSize=1&key=${this.apiKey}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.documents?.length || 0;
        } catch (error) {
            console.error('Failed to get Top 100 count:', error);
            throw error;
        }
    }

    // Helper method to convert Firestore field values
    convertFirestoreFields(fields) {
        const result = {};
        for (const [key, value] of Object.entries(fields || {})) {
            if (value.stringValue !== undefined) {
                result[key] = value.stringValue;
            } else if (value.integerValue !== undefined) {
                result[key] = parseInt(value.integerValue);
            } else if (value.doubleValue !== undefined) {
                result[key] = value.doubleValue;
            } else if (value.timestampValue !== undefined) {
                result[key] = new Date(value.timestampValue);
            } else if (value.booleanValue !== undefined) {
                result[key] = value.booleanValue;
            } else if (value.arrayValue !== undefined) {
                result[key] = value.arrayValue.values?.map(v => this.convertFirestoreFields({ value: v })) || [];
            } else if (value.mapValue !== undefined) {
                result[key] = this.convertFirestoreFields(value.mapValue.fields || {});
            } else {
                console.warn(`Unknown field type for ${key}:`, value);
            }
        }
        return result;
    }

    // Helper method to convert JS objects to Firestore fields
    convertToFirestoreFields(data) {
        const fields = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                fields[key] = { stringValue: value };
            } else if (typeof value === 'number') {
                fields[key] = { doubleValue: value };
            } else if (typeof value === 'boolean') {
                fields[key] = { booleanValue: value };
            } else if (value instanceof Date) {
                fields[key] = { timestampValue: value.toISOString() };
            }
        }
        return fields;
    }
}

// Create and export Firebase service instance
export const firebaseService = new FirebaseService();
export default firebaseService;
