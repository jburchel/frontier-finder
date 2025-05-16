/**
 * Joshua Project Search functionality
 * Handles direct searches against the Joshua Project API
 */

// Configuration with API key
import { config } from './config.js';

// Get the Joshua Project config
const jpConfig = config.joshuaProject;

const jpSearch = {
    /**
     * Initialize the Joshua Project search functionality
     */
    initialize: function() {
        console.log('JP Search initialize called');
        
        // Get form elements
        this.pgNameInput = document.getElementById('pgNameSearch');
        this.countrySelect = document.getElementById('jpCountrySearch');
        this.jpScaleSelect = document.getElementById('jpScaleSearch');
        this.religionSelect = document.getElementById('religionSearch');
        this.searchButton = document.getElementById('jpSearchButton');
        
        console.log('Form elements:', {
            pgNameInput: this.pgNameInput,
            countrySelect: this.countrySelect,
            jpScaleSelect: this.jpScaleSelect,
            religionSelect: this.religionSelect,
            searchButton: this.searchButton
        });
        
        // Populate country dropdown
        this.loadCountries();
        
        // Add event listeners
        if (this.searchButton) {
            console.log('Adding click event listener to search button');
            this.searchButton.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Search button clicked');
                this.performSearch();
            });
        } else {
            console.error('Search button not found');
        }
    },
    
    /**
     * Load countries from Joshua Project API
     */
    loadCountries: async function() {
        console.log('loadCountries called');
        try {
            if (!this.countrySelect) {
                console.error('Country select element not found');
                return;
            }
            console.log('Country select element found:', this.countrySelect);
            
            // List of countries with ISO codes
            const countries = [
                { code: 'AF', name: 'Afghanistan' },
                { code: 'AL', name: 'Albania' },
                { code: 'DZ', name: 'Algeria' },
                { code: 'AS', name: 'American Samoa' },
                { code: 'AD', name: 'Andorra' },
                { code: 'AO', name: 'Angola' },
                { code: 'AI', name: 'Anguilla' },
                { code: 'AQ', name: 'Antarctica' },
                { code: 'AG', name: 'Antigua and Barbuda' },
                { code: 'AR', name: 'Argentina' },
                { code: 'AM', name: 'Armenia' },
                { code: 'AW', name: 'Aruba' },
                { code: 'AU', name: 'Australia' },
                { code: 'AT', name: 'Austria' },
                { code: 'AZ', name: 'Azerbaijan' },
                { code: 'BS', name: 'Bahamas' },
                { code: 'BH', name: 'Bahrain' },
                { code: 'BD', name: 'Bangladesh' },
                { code: 'BB', name: 'Barbados' },
                { code: 'BY', name: 'Belarus' },
                { code: 'BE', name: 'Belgium' },
                { code: 'BZ', name: 'Belize' },
                { code: 'BJ', name: 'Benin' },
                { code: 'BM', name: 'Bermuda' },
                { code: 'BT', name: 'Bhutan' },
                { code: 'BO', name: 'Bolivia' },
                { code: 'BA', name: 'Bosnia and Herzegovina' },
                { code: 'BW', name: 'Botswana' },
                { code: 'BV', name: 'Bouvet Island' },
                { code: 'BR', name: 'Brazil' },
                { code: 'IO', name: 'British Indian Ocean Territory' },
                { code: 'BN', name: 'Brunei Darussalam' },
                { code: 'BG', name: 'Bulgaria' },
                { code: 'BF', name: 'Burkina Faso' },
                { code: 'BI', name: 'Burundi' },
                { code: 'KH', name: 'Cambodia' },
                { code: 'CM', name: 'Cameroon' },
                { code: 'CA', name: 'Canada' },
                { code: 'CV', name: 'Cape Verde' },
                { code: 'KY', name: 'Cayman Islands' },
                { code: 'CF', name: 'Central African Republic' },
                { code: 'TD', name: 'Chad' },
                { code: 'CL', name: 'Chile' },
                { code: 'CN', name: 'China' },
                { code: 'CX', name: 'Christmas Island' },
                { code: 'CC', name: 'Cocos (Keeling) Islands' },
                { code: 'CO', name: 'Colombia' },
                { code: 'KM', name: 'Comoros' },
                { code: 'CG', name: 'Congo' },
                { code: 'CD', name: 'Congo, Democratic Republic of the' },
                { code: 'CK', name: 'Cook Islands' },
                { code: 'CR', name: 'Costa Rica' },
                { code: 'CI', name: 'Cote D\'Ivoire' },
                { code: 'HR', name: 'Croatia' },
                { code: 'CU', name: 'Cuba' },
                { code: 'CY', name: 'Cyprus' },
                { code: 'CZ', name: 'Czech Republic' },
                { code: 'DK', name: 'Denmark' },
                { code: 'DJ', name: 'Djibouti' },
                { code: 'DM', name: 'Dominica' },
                { code: 'DO', name: 'Dominican Republic' },
                { code: 'EC', name: 'Ecuador' },
                { code: 'EG', name: 'Egypt' },
                { code: 'SV', name: 'El Salvador' },
                { code: 'GQ', name: 'Equatorial Guinea' },
                { code: 'ER', name: 'Eritrea' },
                { code: 'EE', name: 'Estonia' },
                { code: 'ET', name: 'Ethiopia' },
                { code: 'FK', name: 'Falkland Islands (Malvinas)' },
                { code: 'FO', name: 'Faroe Islands' },
                { code: 'FJ', name: 'Fiji' },
                { code: 'FI', name: 'Finland' },
                { code: 'FR', name: 'France' },
                { code: 'GF', name: 'French Guiana' },
                { code: 'PF', name: 'French Polynesia' },
                { code: 'TF', name: 'French Southern Territories' },
                { code: 'GA', name: 'Gabon' },
                { code: 'GM', name: 'Gambia' },
                { code: 'GE', name: 'Georgia' },
                { code: 'DE', name: 'Germany' },
                { code: 'GH', name: 'Ghana' },
                { code: 'GI', name: 'Gibraltar' },
                { code: 'GR', name: 'Greece' },
                { code: 'GL', name: 'Greenland' },
                { code: 'GD', name: 'Grenada' },
                { code: 'GP', name: 'Guadeloupe' },
                { code: 'GU', name: 'Guam' },
                { code: 'GT', name: 'Guatemala' },
                { code: 'GN', name: 'Guinea' },
                { code: 'GW', name: 'Guinea-Bissau' },
                { code: 'GY', name: 'Guyana' },
                { code: 'HT', name: 'Haiti' },
                { code: 'HM', name: 'Heard Island and Mcdonald Islands' },
                { code: 'VA', name: 'Holy See (Vatican City State)' },
                { code: 'HN', name: 'Honduras' },
                { code: 'HK', name: 'Hong Kong' },
                { code: 'HU', name: 'Hungary' },
                { code: 'IS', name: 'Iceland' },
                { code: 'IN', name: 'India' },
                { code: 'ID', name: 'Indonesia' },
                { code: 'IR', name: 'Iran, Islamic Republic of' },
                { code: 'IQ', name: 'Iraq' },
                { code: 'IE', name: 'Ireland' },
                { code: 'IL', name: 'Israel' },
                { code: 'IT', name: 'Italy' },
                { code: 'JM', name: 'Jamaica' },
                { code: 'JP', name: 'Japan' },
                { code: 'JO', name: 'Jordan' },
                { code: 'KZ', name: 'Kazakhstan' },
                { code: 'KE', name: 'Kenya' },
                { code: 'KI', name: 'Kiribati' },
                { code: 'KP', name: 'Korea, Democratic People\'s Republic of' },
                { code: 'KR', name: 'Korea, Republic of' },
                { code: 'KW', name: 'Kuwait' },
                { code: 'KG', name: 'Kyrgyzstan' },
                { code: 'LA', name: 'Lao People\'s Democratic Republic' },
                { code: 'LV', name: 'Latvia' },
                { code: 'LB', name: 'Lebanon' },
                { code: 'LS', name: 'Lesotho' },
                { code: 'LR', name: 'Liberia' },
                { code: 'LY', name: 'Libyan Arab Jamahiriya' },
                { code: 'LI', name: 'Liechtenstein' },
                { code: 'LT', name: 'Lithuania' },
                { code: 'LU', name: 'Luxembourg' },
                { code: 'MO', name: 'Macao' },
                { code: 'MK', name: 'Macedonia, The Former Yugoslav Republic of' },
                { code: 'MG', name: 'Madagascar' },
                { code: 'MW', name: 'Malawi' },
                { code: 'MY', name: 'Malaysia' },
                { code: 'MV', name: 'Maldives' },
                { code: 'ML', name: 'Mali' },
                { code: 'MT', name: 'Malta' },
                { code: 'MH', name: 'Marshall Islands' },
                { code: 'MQ', name: 'Martinique' },
                { code: 'MR', name: 'Mauritania' },
                { code: 'MU', name: 'Mauritius' },
                { code: 'YT', name: 'Mayotte' },
                { code: 'MX', name: 'Mexico' },
                { code: 'FM', name: 'Micronesia, Federated States of' },
                { code: 'MD', name: 'Moldova, Republic of' },
                { code: 'MC', name: 'Monaco' },
                { code: 'MN', name: 'Mongolia' },
                { code: 'MS', name: 'Montserrat' },
                { code: 'MA', name: 'Morocco' },
                { code: 'MZ', name: 'Mozambique' },
                { code: 'MM', name: 'Myanmar' },
                { code: 'NA', name: 'Namibia' },
                { code: 'NR', name: 'Nauru' },
                { code: 'NP', name: 'Nepal' },
                { code: 'NL', name: 'Netherlands' },
                { code: 'AN', name: 'Netherlands Antilles' },
                { code: 'NC', name: 'New Caledonia' },
                { code: 'NZ', name: 'New Zealand' },
                { code: 'NI', name: 'Nicaragua' },
                { code: 'NE', name: 'Niger' },
                { code: 'NG', name: 'Nigeria' },
                { code: 'NU', name: 'Niue' },
                { code: 'NF', name: 'Norfolk Island' },
                { code: 'MP', name: 'Northern Mariana Islands' },
                { code: 'NO', name: 'Norway' },
                { code: 'OM', name: 'Oman' },
                { code: 'PK', name: 'Pakistan' },
                { code: 'PW', name: 'Palau' },
                { code: 'PS', name: 'Palestinian Territory, Occupied' },
                { code: 'PA', name: 'Panama' },
                { code: 'PG', name: 'Papua New Guinea' },
                { code: 'PY', name: 'Paraguay' },
                { code: 'PE', name: 'Peru' },
                { code: 'PH', name: 'Philippines' },
                { code: 'PN', name: 'Pitcairn' },
                { code: 'PL', name: 'Poland' },
                { code: 'PT', name: 'Portugal' },
                { code: 'PR', name: 'Puerto Rico' },
                { code: 'QA', name: 'Qatar' },
                { code: 'RE', name: 'Reunion' },
                { code: 'RO', name: 'Romania' },
                { code: 'RU', name: 'Russian Federation' },
                { code: 'RW', name: 'Rwanda' },
                { code: 'SH', name: 'Saint Helena' },
                { code: 'KN', name: 'Saint Kitts and Nevis' },
                { code: 'LC', name: 'Saint Lucia' },
                { code: 'PM', name: 'Saint Pierre and Miquelon' },
                { code: 'VC', name: 'Saint Vincent and the Grenadines' },
                { code: 'WS', name: 'Samoa' },
                { code: 'SM', name: 'San Marino' },
                { code: 'ST', name: 'Sao Tome and Principe' },
                { code: 'SA', name: 'Saudi Arabia' },
                { code: 'SN', name: 'Senegal' },
                { code: 'CS', name: 'Serbia and Montenegro' },
                { code: 'SC', name: 'Seychelles' },
                { code: 'SL', name: 'Sierra Leone' },
                { code: 'SG', name: 'Singapore' },
                { code: 'SK', name: 'Slovakia' },
                { code: 'SI', name: 'Slovenia' },
                { code: 'SB', name: 'Solomon Islands' },
                { code: 'SO', name: 'Somalia' },
                { code: 'ZA', name: 'South Africa' },
                { code: 'GS', name: 'South Georgia and the South Sandwich Islands' },
                { code: 'ES', name: 'Spain' },
                { code: 'LK', name: 'Sri Lanka' },
                { code: 'SD', name: 'Sudan' },
                { code: 'SR', name: 'Suriname' },
                { code: 'SJ', name: 'Svalbard and Jan Mayen' },
                { code: 'SZ', name: 'Swaziland' },
                { code: 'SE', name: 'Sweden' },
                { code: 'CH', name: 'Switzerland' },
                { code: 'SY', name: 'Syrian Arab Republic' },
                { code: 'TW', name: 'Taiwan, Province of China' },
                { code: 'TJ', name: 'Tajikistan' },
                { code: 'TZ', name: 'Tanzania, United Republic of' },
                { code: 'TH', name: 'Thailand' },
                { code: 'TL', name: 'Timor-Leste' },
                { code: 'TG', name: 'Togo' },
                { code: 'TK', name: 'Tokelau' },
                { code: 'TO', name: 'Tonga' },
                { code: 'TT', name: 'Trinidad and Tobago' },
                { code: 'TN', name: 'Tunisia' },
                { code: 'TR', name: 'Turkey' },
                { code: 'TM', name: 'Turkmenistan' },
                { code: 'TC', name: 'Turks and Caicos Islands' },
                { code: 'TV', name: 'Tuvalu' },
                { code: 'UG', name: 'Uganda' },
                { code: 'UA', name: 'Ukraine' },
                { code: 'AE', name: 'United Arab Emirates' },
                { code: 'GB', name: 'United Kingdom' },
                { code: 'US', name: 'United States' },
                { code: 'UM', name: 'United States Minor Outlying Islands' },
                { code: 'UY', name: 'Uruguay' },
                { code: 'UZ', name: 'Uzbekistan' },
                { code: 'VU', name: 'Vanuatu' },
                { code: 'VE', name: 'Venezuela' },
                { code: 'VN', name: 'Viet Nam' },
                { code: 'VG', name: 'Virgin Islands, British' },
                { code: 'VI', name: 'Virgin Islands, U.S.' },
                { code: 'WF', name: 'Wallis and Futuna' },
                { code: 'EH', name: 'Western Sahara' },
                { code: 'YE', name: 'Yemen' },
                { code: 'ZM', name: 'Zambia' },
                { code: 'ZW', name: 'Zimbabwe' }
            ];
            
            // Sort countries alphabetically
            countries.sort((a, b) => a.name.localeCompare(b.name));
            
            console.log(`Adding ${countries.length} countries to dropdown`);
            
            // Clear existing options except the first one
            while (this.countrySelect.options.length > 1) {
                this.countrySelect.remove(1);
            }
            
            // Add countries to dropdown
            countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country.code;
                option.textContent = country.name;
                this.countrySelect.appendChild(option);
            });
            
            console.log(`Country dropdown now has ${this.countrySelect.options.length} options`);
        } catch (error) {
            console.error('Error loading countries:', error);
        }
    },
    
    /**
     * Perform search against Joshua Project API
     */
    performSearch: async function() {
        console.log('performSearch called');
        try {
            // Show loading indicator
            this.searchButton.disabled = true;
            this.searchButton.textContent = 'Searching...';
            
            // Build query parameters
            const params = new URLSearchParams();
            params.append('api_key', jpConfig.apiKey);
            
            console.log('Using JP API key:', jpConfig.apiKey);
            
            // Add search criteria if provided
            if (this.pgNameInput && this.pgNameInput.value) {
                params.append('name', this.pgNameInput.value);
                console.log('Searching by name:', this.pgNameInput.value);
            }
            
            if (this.countrySelect && this.countrySelect.value) {
                params.append('countries', this.countrySelect.value);
                console.log('Searching by country:', this.countrySelect.value);
            }
            
            if (this.jpScaleSelect && this.jpScaleSelect.value) {
                params.append('progress_scale', this.jpScaleSelect.value);
                console.log('Searching by JP Scale:', this.jpScaleSelect.value);
            }
            
            if (this.religionSelect && this.religionSelect.value) {
                params.append('primary_religion', this.religionSelect.value);
                console.log('Searching by religion:', this.religionSelect.value);
            }
            
            // If no search criteria provided, search for unreached people groups
            if (!this.pgNameInput?.value && !this.countrySelect?.value && 
                !this.jpScaleSelect?.value && !this.religionSelect?.value) {
                // Default to searching for unreached people groups (JPScale 1.1-2.1)
                params.append('progress_scale', '1.1,1.2,2.1');
                console.log('No criteria provided, defaulting to unreached people groups');
            }
            
            // Make API request
            const apiUrl = `https://api.joshuaproject.net/v1/people_groups.json?${params.toString()}`;
            console.log('Making API request to:', apiUrl);
            
            const response = await fetch(apiUrl);
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API error response:', errorText);
                throw new Error(`Failed to fetch people groups: ${response.status} ${response.statusText}`);
            }
            
            const peopleGroups = await response.json();
            console.log(`Received ${peopleGroups.length} results from Joshua Project API`);
            
            // Store results in session storage
            sessionStorage.setItem('jpSearchResults', JSON.stringify(peopleGroups));
            
            // Redirect to results page
            console.log('Redirecting to results page');
            window.location.href = 'results.html?source=jp';
        } catch (error) {
            console.error('Error performing search:', error);
            alert(`An error occurred while searching: ${error.message}. Please try again.`);
        } finally {
            // Reset button
            this.searchButton.disabled = false;
            this.searchButton.textContent = 'Search Joshua Project';
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing JP Search module');
    jpSearch.initialize();
});

// For debugging
console.log('JP Search module loaded');

export { jpSearch };
