import { firebaseService } from './firebase.js';
import { updatePronunciations } from './utils.js';

// This function will run the update
async function runPronunciationUpdate() {
    try {
        console.log('Starting pronunciation updates...');
        await firebaseService.initialize();
        await updatePronunciations(firebaseService);
        console.log('Pronunciation updates complete');
    } catch (error) {
        console.error('Failed to run pronunciation updates:', error);
    }
}

// Run the update when the script loads
runPronunciationUpdate(); 