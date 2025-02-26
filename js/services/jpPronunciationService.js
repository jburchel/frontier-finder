class JPPronunciationService {
    constructor() {
        this.apiKey = config.jpApi.key;
        this.baseUrl = 'https://api.joshuaproject.net/v1';
        this.cache = new Map();
    }

    async getPronunciation(peopleGroupName) {
        try {
            // Check cache first
            if (this.cache.has(peopleGroupName)) {
                return this.cache.get(peopleGroupName);
            }

            // Search for the people group
            const searchUrl = `${this.baseUrl}/people_groups.json?api_key=${this.apiKey}&q=${encodeURIComponent(peopleGroupName)}`;
            console.log('Fetching from JP:', searchUrl);
            
            const response = await fetch(searchUrl);
            const data = await response.json();

            if (data && data.length > 0) {
                // Look for pronunciation or audio fields in the response
                const peopleGroup = data[0];
                console.log('JP API Response:', peopleGroup);

                // Check various possible fields where pronunciation might be stored
                const pronunciation = peopleGroup.pronunciation || 
                                   peopleGroup.audio_pronunciation ||
                                   peopleGroup.PronunciationGuide;

                if (pronunciation) {
                    this.cache.set(peopleGroupName, pronunciation);
                    return pronunciation;
                }
            }

            return null;
        } catch (error) {
            console.error('Error fetching JP pronunciation:', error);
            return null;
        }
    }
}

export const jpPronunciationService = new JPPronunciationService();
export default jpPronunciationService; 