import csv
import os

def get_pronunciation(name):
    """Convert people group names to simplified phonetic pronunciations."""
    # Remove special characters and split into parts
    name = name.replace('"', '')
    parts = name.replace(',', ' ').split()
    
    # Special cases dictionary
    special_cases = {
        'arab': 'eh-ruhb',
        'amazigh': 'ah-mah-zigh',
        'deaf': 'def',
        'muslim': 'muz-lim',
        'islam': 'iz-lahm',
        'american': 'uh-mer-i-kuhn',
        'african': 'af-ri-kuhn',
        'asian': 'ay-zhuhn',
        'european': 'yoor-uh-pee-uhn'
    }
    
    pronunciations = []
    for part in parts:
        part_lower = part.lower()
        
        # Check special cases first
        if part_lower in special_cases:
            pronunciations.append(special_cases[part_lower])
            continue
            
        # Basic pronunciation rules
        pronunciation = part_lower
        
        # Handle common prefixes
        if pronunciation.startswith('mc'):
            pronunciation = 'muhk-' + pronunciation[2:]
        
        # Handle common suffixes
        if pronunciation.endswith('ian'):
            pronunciation = pronunciation[:-3] + 'ee-uhn'
        elif pronunciation.endswith('ese'):
            pronunciation = pronunciation[:-3] + 'eez'
            
        # Split long words
        if len(pronunciation) > 5:
            # Insert hyphens between syllables
            syllables = []
            current = ''
            for i, char in enumerate(pronunciation):
                current += char
                if len(current) >= 3 and i < len(pronunciation) - 1:
                    if pronunciation[i+1] in 'aeiou':
                        continue
                    syllables.append(current)
                    current = ''
            if current:
                syllables.append(current)
            pronunciation = '-'.join(syllables)
        
        pronunciations.append(pronunciation)
    
    return ' '.join(pronunciations)

def process_csv():
    input_file = 'data/updated_uupg.csv'
    temp_file = 'data/updated_uupg_temp.csv'
    
    with open(input_file, 'r', encoding='utf-8') as infile, \
         open(temp_file, 'w', encoding='utf-8', newline='') as outfile:
        
        # Read all lines first to get proper fieldnames
        content = infile.readlines()
        header = content[0].strip().split(',')
        
        writer = csv.writer(outfile)
        writer.writerow(header)  # Write header
        
        # Process each row
        for line in content[1:]:
            row = line.strip().split(',')
            if row and len(row) > 0:  # Skip empty rows
                people_name = row[0]  # PeopleName is the first column
                pronunciation = get_pronunciation(people_name)
                
                # Find the pronunciation column index
                pron_index = header.index('pronunciation')
                
                # Make sure row has enough columns
                while len(row) <= pron_index:
                    row.append('')
                
                # Update pronunciation
                row[pron_index] = pronunciation
                writer.writerow(row)
    
    # Replace original file with new file
    os.replace(temp_file, input_file)

if __name__ == '__main__':
    process_csv()
