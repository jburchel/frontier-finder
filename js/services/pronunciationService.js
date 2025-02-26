import { speechService } from './speechService.js';

class PronunciationService {
    constructor() {
        this.rules = [
            // Basic consonant sounds - keep these simple and clear
            { pattern: 'ch', sound: 'ch' },
            { pattern: 'sh', sound: 'sh' },
            { pattern: 'th', sound: 'th' },
            { pattern: 'ph', sound: 'f' },
            { pattern: 'kh', sound: 'k' },
            
            // Simple vowel sounds
            { pattern: 'ay', sound: 'ay' },
            { pattern: 'ee', sound: 'ee' },
            { pattern: 'oo', sound: 'oo' },
            
            // Common endings
            { pattern: 'ian', sound: 'yan' },
            { pattern: 'stan', sound: 'stan' }
        ];
    }

    generatePronunciation(name) {
        try {
            if (!name) return null;
            
            // Split compound names
            const parts = name.split(/[,\s-]+/);
            
            const pronunciations = parts.map(part => {
                let pronunciation = part.toLowerCase();
                
                // Apply basic rules
                this.rules.forEach(rule => {
                    pronunciation = pronunciation.replace(
                        new RegExp(rule.pattern, 'gi'),
                        rule.sound
                    );
                });

                // Simple syllable breaks - just between consonant clusters
                pronunciation = pronunciation.replace(
                    /([bcdfghjklmnpqrstvwxz])([bcdfghjklmnpqrstvwxz])/gi, 
                    '$1-$2'
                );

                // Don't split common sounds
                pronunciation = pronunciation
                    .replace(/ch-/g, 'ch')
                    .replace(/sh-/g, 'sh')
                    .replace(/th-/g, 'th');

                return pronunciation;
            });

            return pronunciations.join(' ');
        } catch (error) {
            console.error('Error generating pronunciation:', error);
            return null;
        }
    }

    async speakPronunciation(text) {
        try {
            const voices = await speechService.getVoices();
            // Prefer an English voice
            const englishVoice = voices.find(voice => 
                voice.lang.startsWith('en-')
            );
            
            await speechService.speak(text, {
                voice: englishVoice,
                rate: 0.8, // Slightly slower for clarity
                pitch: 1,
                volume: 1
            });
            return true;
        } catch (error) {
            console.error('Speech synthesis error:', error);
            return false;
        }
    }
}

export const pronunciationService = new PronunciationService();
export default pronunciationService;