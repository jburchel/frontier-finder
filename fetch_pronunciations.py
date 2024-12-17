import csv
import os
import eng_to_ipa as ipa

def get_pronunciation(word: str) -> str:
    """Get English pronunciation for a word using multiple methods."""
    # Try eng_to_ipa first
    ipa_pron = ipa.convert(word)
    if ipa_pron and ipa_pron != word:
        # Convert IPA to more readable format
        readable = ipa_pron
        # Replace IPA symbols with readable English approximations
        replacements = {
            'ˈ': '',  # Remove stress mark
            'ʤ': 'j',
            'ʒ': 'zh',
            'ŋ': 'ng',
            'θ': 'th',
            'ð': 'th',
            'ʃ': 'sh',
            'ʧ': 'ch',
            'ə': 'uh',
            'ɪ': 'ih',
            'æ': 'a',
            'ɛ': 'eh',
            'ʊ': 'oo',
            'ʌ': 'uh',
            'ɔ': 'aw',
            'ɑ': 'ah',
            'i': 'ee',
            'u': 'oo',
            'eɪ': 'ay',
            'aɪ': 'eye',
            'oʊ': 'oh',
            'aʊ': 'ow',
            'ɔɪ': 'oy'
        }
        
        for ipa_char, eng_char in replacements.items():
            readable = readable.replace(ipa_char, eng_char)
        
        # Clean up repeated vowels
        for vowel in ['a', 'e', 'i', 'o', 'u']:
            readable = readable.replace(vowel + vowel, vowel)
        
        # Add hyphens between syllables
        syllables = []
        current = ''
        consonant_cluster = ''
        
        for i, char in enumerate(readable):
            if char in 'aeiou':
                # If we have a consonant cluster, decide how to split it
                if consonant_cluster:
                    if len(consonant_cluster) > 1:
                        # Split consonant clusters between syllables
                        mid = len(consonant_cluster) // 2
                        current += consonant_cluster[:mid]
                        if current:
                            syllables.append(current)
                        current = consonant_cluster[mid:]
                    else:
                        current += consonant_cluster
                    consonant_cluster = ''
                current += char
                if i < len(readable) - 1 and readable[i + 1] not in 'aeiou':
                    if current:
                        syllables.append(current)
                        current = ''
            else:
                consonant_cluster += char
        
        # Add any remaining parts
        if consonant_cluster:
            current += consonant_cluster
        if current:
            syllables.append(current)
        
        # Join syllables and clean up
        result = '-'.join(syllables)
        result = result.replace('--', '-')
        result = result.strip('-')
        
        return result
    
    # If no pronunciation found, return original word with basic syllable breaks
    return add_syllable_breaks(word)

def add_syllable_breaks(word: str) -> str:
    """Add basic syllable breaks to a word."""
    vowels = 'aeiou'
    syllables = []
    current = ''
    consonant_cluster = ''
    
    for i, char in enumerate(word.lower()):
        if char in vowels:
            if consonant_cluster:
                if len(consonant_cluster) > 1:
                    mid = len(consonant_cluster) // 2
                    current += consonant_cluster[:mid]
                    if current:
                        syllables.append(current)
                    current = consonant_cluster[mid:]
                else:
                    current += consonant_cluster
                consonant_cluster = ''
            current += char
            if i < len(word) - 1 and word[i + 1].lower() not in vowels:
                if current:
                    syllables.append(current)
                    current = ''
        else:
            consonant_cluster += char
    
    # Add any remaining parts
    if consonant_cluster:
        current += consonant_cluster
    if current:
        syllables.append(current)
    
    # Join syllables and clean up
    result = '-'.join(syllables)
    result = result.replace('--', '-')
    return result.strip('-')

def process_csv_file(input_file: str) -> None:
    """Process a CSV file and update pronunciations."""
    temp_file = input_file + '.temp'
    
    try:
        # First, read all the data and get the correct fieldnames
        with open(input_file, 'r', encoding='utf-8') as infile:
            # Read the header line
            header = next(csv.reader(infile))
            
            # Create a list to store all rows
            rows = []
            for row in csv.reader(infile):
                # Ensure row has enough columns
                while len(row) < len(header):
                    row.append('')
                rows.append(row)
        
        # Now process the data and write to temp file
        with open(temp_file, 'w', encoding='utf-8', newline='') as outfile:
            writer = csv.writer(outfile)
            writer.writerow(header)
            
            total_rows = len(rows)
            processed = 0
            
            # Find the indices for the name and pronunciation columns
            name_idx = header.index('name')
            pron_idx = header.index('pronunciation')
            
            for row in rows:
                if row and len(row) > name_idx:
                    people_name = row[name_idx]
                    if people_name:
                        # Handle names with commas (e.g., "Last, First")
                        name_parts = [part.strip() for part in people_name.split(',')]
                        pronunciations = []
                        for part in name_parts:
                            pron = get_pronunciation(part)
                            if pron:
                                pronunciations.append(pron)
                        
                        # Join pronunciations with commas if there were multiple parts
                        pronunciation = ', '.join(pronunciations) if pronunciations else ''
                        
                        # Ensure row has enough columns
                        while len(row) <= pron_idx:
                            row.append('')
                        row[pron_idx] = pronunciation
                
                writer.writerow(row)
                
                processed += 1
                if processed % 10 == 0:  # Show progress every 10 rows
                    print(f"Processed {processed}/{total_rows} rows")
        
        # Replace original file with updated file
        os.replace(temp_file, input_file)
        print(f"Successfully updated {input_file}")
        
    except Exception as e:
        print(f"Error processing {input_file}: {str(e)}")
        # Clean up temp file if it exists
        if os.path.exists(temp_file):
            os.remove(temp_file)

def main():
    # Process the file
    file_to_process = 'data/existing_upgs_updated.csv'
    print(f"\nProcessing {file_to_process}...")
    process_csv_file(file_to_process)

if __name__ == "__main__":
    main()
