/**
 * Utility functions for the Frontier Finder application
 */

// Standardize group type display
export function formatGroupType(type) {
    if (!type) return '';
    
    // Convert to uppercase if it's one of our group types
    switch (type.toLowerCase()) {
        case 'upg':
            return 'UPG';
        case 'uupg':
            return 'UUPG';
        case 'fpg':
            return 'FPG';
        default:
            return type;
    }
} 

export async function updatePronunciations(firebaseService) {
    try {
        const { pronunciationMap } = await import('./data/pronunciations.js');
        const groups = await firebaseService.getTop100();
        let updatedCount = 0;
        let skippedCount = 0;
        
        console.log(`Processing ${groups.length} groups for pronunciation updates...`);
        
        for (const group of groups) {
            // Skip if no ID or already has pronunciation
            if (!group.id) {
                console.warn(`Skipping group "${group.name}": No document ID`);
                skippedCount++;
                continue;
            }
            
            if (group.pronunciation) {
                console.log(`Skipping group "${group.name}": Already has pronunciation`);
                skippedCount++;
                continue;
            }

            // Check if we have a pronunciation for this group
            if (pronunciationMap[group.name]) {
                try {
                    await firebaseService.updateDocument(group.id, {
                        pronunciation: pronunciationMap[group.name]
                    });
                    updatedCount++;
                    console.log(`Updated pronunciation for "${group.name}"`);
                } catch (error) {
                    console.error(`Failed to update pronunciation for "${group.name}":`, error);
                }
            } else {
                console.warn(`No pronunciation found for "${group.name}"`);
                skippedCount++;
            }
        }
        
        console.log(`
            Update complete:
            - ${updatedCount} groups updated
            - ${skippedCount} groups skipped
            - ${groups.length} total groups processed
        `);
    } catch (error) {
        console.error('Failed to update pronunciations:', error);
        throw error;
    }
} 

export async function repairDatabaseItems(firebaseService) {
    try {
        console.log('Starting database repair...');
        const groups = await firebaseService.getTop100();
        let repairedCount = 0;
        let skippedCount = 0;
        
        for (const group of groups) {
            if (!group.id) {
                try {
                    // Create a new document with the same data
                    const newId = await firebaseService.addToTop100({
                        type: group.type,
                        name: group.name,
                        population: group.population,
                        country: group.country,
                        religion: group.religion,
                        language: group.language,
                        distance: group.distance,
                        addedAt: group.addedAt || new Date().toISOString()
                    });
                    
                    repairedCount++;
                    console.log(`Repaired item: "${group.name}" with new ID: ${newId}`);
                } catch (error) {
                    console.error(`Failed to repair item "${group.name}":`, error);
                }
            } else {
                skippedCount++;
            }
        }
        
        console.log(`
            Repair complete:
            - ${repairedCount} items repaired
            - ${skippedCount} items already valid
            - ${groups.length} total items processed
        `);
        
        return { repairedCount, skippedCount, totalCount: groups.length };
    } catch (error) {
        console.error('Failed to repair database:', error);
        throw error;
    }
} 

export function checkMissingPronunciations(firebaseService) {
    firebaseService.getTop100().then(groups => {
        const missingPronunciations = groups.filter(g => !g.pronunciation);
        console.log('Groups missing pronunciations:', missingPronunciations.map(g => g.name));
        
        // Also check if we have mappings for these in our pronunciationMap
        import('./data/pronunciations.js').then(({ pronunciationMap }) => {
            missingPronunciations.forEach(group => {
                if (!pronunciationMap[group.name]) {
                    console.log(`Missing pronunciation mapping for: ${group.name}`);
                }
            });
        });
    });
} 