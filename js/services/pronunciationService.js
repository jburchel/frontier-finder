class PronunciationService {
    constructor() {
        this.rules = [
            // Basic pronunciation rules
            { pattern: 'ch', sound: 'ch' },
            { pattern: 'sh', sound: 'sh' },
            { pattern: 'th', sound: 'th' },
            { pattern: 'ph', sound: 'f' },
            { pattern: 'gh', sound: 'g' },
            { pattern: 'wh', sound: 'w' },
            // Vowel sounds
            { pattern: 'aa', sound: 'ah' },
            { pattern: 'ee', sound: 'ee' },
            { pattern: 'ii', sound: 'ee' },
            { pattern: 'oo', sound: 'oo' },
            { pattern: 'uu', sound: 'oo' },
            // Common endings
            { pattern: 'ian', sound: 'ee-un' },
            { pattern: 'stan', sound: 'stahn' },
            // Add more rules as needed
        ];
    }

    generatePronunciation(name) {
        try {
            if (!name) return null;

            // Split compound names
            const parts = name.split(/[,\s-]+/);
            
            const pronunciations = parts.map(part => {
                let pronunciation = part.toLowerCase();
                
                // Apply pronunciation rules
                this.rules.forEach(rule => {
                    pronunciation = pronunciation.replace(
                        new RegExp(rule.pattern, 'gi'),
                        rule.sound
                    );
                });

                // Add syllable breaks and stress
                pronunciation = this.addSyllableBreaks(pronunciation);
                pronunciation = this.addStress(pronunciation);

                return pronunciation;
            });

            return pronunciations.join(' ');
        } catch (error) {
            console.error('Error generating pronunciation:', error);
            return null;
        }
    }

    addSyllableBreaks(word) {
        // Simple syllable detection
        return word.replace(/([aeiou])([bcdfghjklmnpqrstvwxyz])([aeiou])/gi, '$1-$2$3');
    }

    addStress(word) {
        // Simple stress rules - stress first syllable by default
        const syllables = word.split('-');
        if (syllables.length > 1) {
            syllables[0] = syllables[0].toUpperCase();
        }
        return syllables.join('-');
    }

    validatePronunciation(pronunciation) {
        // Add validation rules as needed
        return pronunciation && pronunciation.length > 0;
    }
}

export const pronunciationService = new PronunciationService();
export default pronunciationService; 