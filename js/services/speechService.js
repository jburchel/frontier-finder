class SpeechService {
    constructor() {
        this.voices = [];
        this.initialized = false;
        
        // Initialize voices if in browser environment
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            this.initVoices();
        }
    }
    
    initVoices() {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            // Get the voices
            this.voices = window.speechSynthesis.getVoices();
            
            // Chrome loads voices asynchronously
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = () => {
                    this.voices = window.speechSynthesis.getVoices();
                    this.initialized = true;
                };
            } else {
                this.initialized = true;
            }
        }
    }

    getVoices() {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            return window.speechSynthesis.getVoices();
        }
        return [];
    }

    speak(text, options = {}) {
        console.log('SpeechService: Speaking text:', text);
        
        if (typeof window === 'undefined') {
            // In Node.js environment, just log the text
            console.log('Would speak (if in browser):', text);
            return Promise.resolve();
        }
        
        // Try ResponsiveVoice first if available
        if (window.responsiveVoice && window.responsiveVoice.voiceSupport()) {
            console.log('SpeechService: Using ResponsiveVoice');
            window.responsiveVoice.speak(text);
            return Promise.resolve();
        }
        
        // Fall back to Web Speech API
        if ('speechSynthesis' in window) {
            console.log('SpeechService: Using Web Speech API');
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Set voice if specified
            if (options.voice) {
                utterance.voice = options.voice;
            }
            
            // Set other options
            if (options.rate) utterance.rate = options.rate;
            if (options.pitch) utterance.pitch = options.pitch;
            if (options.volume) utterance.volume = options.volume;
            
            window.speechSynthesis.speak(utterance);
            return Promise.resolve();
        }
        
        console.warn('SpeechService: Speech synthesis not supported');
        return Promise.reject(new Error('Speech synthesis not supported'));
    }
}

export const speechService = new SpeechService();
export default speechService;