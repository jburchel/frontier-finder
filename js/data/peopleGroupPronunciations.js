export const pronunciationData = {
    "peoples": {
        "uzbek": {
            "pronunciation": "OOZ-bek",
            "ipa": "ˈuz.bɛk",
            "audio": "uzbek.mp3"
        },
        "chechen": {
            "pronunciation": "CHECH-en",
            "ipa": "ˈtʃɛtʃɛn",
            "audio": "chechen.mp3"
        },
        // Add more people groups...
    },
    "regions": {
        "central_asia": {
            "patterns": {
                "stan$": "stahn",
                "bek$": "bek",
                "khan?$": "kahn"
            }
        },
        "middle_east": {
            "patterns": {
                "^al-": "ahl",
                "^el-": "ehl",
                "ullah$": "oo-lah"
            }
        }
        // Add more regions...
    }
}; 