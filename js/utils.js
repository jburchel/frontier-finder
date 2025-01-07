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