export type Language = 'fr' | 'en';

export interface CountryInfo {
  id: string; // ISO 2-letter
  nameEn: string;
  nameFr: string;
  dialCode: string;
  flag: string;
  defaultLang: Language;
  airtelBrand: string;
  minDigits: number;
  maxDigits: number;
  validPrefixes: string[];
  placeholder: string;
  example: string;
  timezones: string[];
  descriptionEn: string;
  descriptionFr: string;
}

export const AIRTEL_COUNTRIES: CountryInfo[] = [
  {
    id: 'CD',
    nameEn: 'Democratic Republic of the Congo',
    nameFr: 'Rép. Dém. du Congo (RDC)',
    dialCode: '+243',
    flag: '🇨🇩',
    defaultLang: 'fr',
    airtelBrand: 'Airtel RDC',
    minDigits: 9,
    maxDigits: 9,
    validPrefixes: [],
    placeholder: '99 123 4567',
    example: '99 123 4567',
    timezones: ['Africa/Kinshasa', 'Africa/Lubumbashi'],
    descriptionEn: '9 digits required (format: XX XXX XXXX)',
    descriptionFr: '9 chiffres requis (format : XX XXX XXXX)',
  },
  {
    id: 'CG',
    nameEn: 'Congo',
    nameFr: 'Congo',
    dialCode: '+242',
    flag: '🇨🇬',
    defaultLang: 'fr',
    airtelBrand: 'Airtel Congo (Brazzaville)',
    minDigits: 8,
    maxDigits: 9,
    validPrefixes: [],
    placeholder: '06 123 4567',
    example: '06 123 4567',
    timezones: ['Africa/Brazzaville'],
    descriptionEn: '8 to 9 digits required (format: XX XXX XXXX)',
    descriptionFr: '8 à 9 chiffres requis (format : XX XXX XXXX)',
  },
  {
    id: 'TD',
    nameEn: 'Chad',
    nameFr: 'Tchad',
    dialCode: '+235',
    flag: '🇹🇩',
    defaultLang: 'fr',
    airtelBrand: 'Airtel Tchad',
    minDigits: 8,
    maxDigits: 8,
    validPrefixes: [],
    placeholder: '66 12 34 56',
    example: '66 12 34 56',
    timezones: ['Africa/Ndjamena'],
    descriptionEn: '8 digits required (format: XX XX XX XX)',
    descriptionFr: '8 chiffres requis (format : XX XX XX XX)',
  },
  {
    id: 'GA',
    nameEn: 'Gabon',
    nameFr: 'Gabon',
    dialCode: '+241',
    flag: '🇬🇦',
    defaultLang: 'fr',
    airtelBrand: 'Airtel Gabon',
    minDigits: 8,
    maxDigits: 9,
    validPrefixes: [],
    placeholder: '07 12 34 56',
    example: '07 12 34 56',
    timezones: ['Africa/Libreville'],
    descriptionEn: '8 to 9 digits required (format: XX XX XX XX)',
    descriptionFr: '8 à 9 chiffres requis (format : XX XX XX XX)',
  },
  {
    id: 'KE',
    nameEn: 'Kenya',
    nameFr: 'Kenya',
    dialCode: '+254',
    flag: '🇰🇪',
    defaultLang: 'en',
    airtelBrand: 'Airtel Kenya',
    minDigits: 9,
    maxDigits: 10,
    validPrefixes: [],
    placeholder: '733 123 456',
    example: '733 123 456',
    timezones: ['Africa/Nairobi'],
    descriptionEn: '9 to 10 digits required (format: XXX XXX XXX)',
    descriptionFr: '9 à 10 chiffres requis (format : XXX XXX XXX)',
  },
  {
    id: 'MG',
    nameEn: 'Madagascar',
    nameFr: 'Madagascar',
    dialCode: '+261',
    flag: '🇲🇬',
    defaultLang: 'fr',
    airtelBrand: 'Airtel Madagascar',
    minDigits: 9,
    maxDigits: 10,
    validPrefixes: [],
    placeholder: '33 12 345 67',
    example: '33 12 345 67',
    timezones: ['Africa/Antananarivo'],
    descriptionEn: '9 to 10 digits required (format: XX XX XXX XX)',
    descriptionFr: '9 à 10 chiffres requis (format : XX XX XXX XX)',
  },
  {
    id: 'MW',
    nameEn: 'Malawi',
    nameFr: 'Malawi',
    dialCode: '+265',
    flag: '🇲🇼',
    defaultLang: 'en',
    airtelBrand: 'Airtel Malawi',
    minDigits: 9,
    maxDigits: 10,
    validPrefixes: [],
    placeholder: '99 123 4567',
    example: '99 123 4567',
    timezones: ['Africa/Blantyre'],
    descriptionEn: '9 to 10 digits required (format: XX XXX XXXX)',
    descriptionFr: '9 à 10 chiffres requis (format : XX XXX XXXX)',
  },
  {
    id: 'NE',
    nameEn: 'Niger',
    nameFr: 'Niger',
    dialCode: '+227',
    flag: '🇳🇪',
    defaultLang: 'fr',
    airtelBrand: 'Airtel Niger',
    minDigits: 8,
    maxDigits: 8,
    validPrefixes: [],
    placeholder: '96 12 34 56',
    example: '96 12 34 56',
    timezones: ['Africa/Niamey'],
    descriptionEn: '8 digits required (format: XX XX XX XX)',
    descriptionFr: '8 chiffres requis (format : XX XX XX XX)',
  },
  {
    id: 'NG',
    nameEn: 'Nigeria',
    nameFr: 'Nigéria',
    dialCode: '+234',
    flag: '🇳🇬',
    defaultLang: 'en',
    airtelBrand: 'Airtel Nigeria',
    minDigits: 10,
    maxDigits: 11,
    validPrefixes: [],
    placeholder: '802 123 4567',
    example: '802 123 4567',
    timezones: ['Africa/Lagos'],
    descriptionEn: '10 to 11 digits required (format: XXX XXX XXXX)',
    descriptionFr: '10 à 11 chiffres requis (format : XXX XXX XXXX)',
  },
  {
    id: 'RW',
    nameEn: 'Rwanda',
    nameFr: 'Rwanda',
    dialCode: '+250',
    flag: '🇷🇼',
    defaultLang: 'en',
    airtelBrand: 'Airtel Rwanda',
    minDigits: 9,
    maxDigits: 10,
    validPrefixes: [],
    placeholder: '73 123 4567',
    example: '73 123 4567',
    timezones: ['Africa/Kigali'],
    descriptionEn: '9 to 10 digits required (format: XX XXX XXXX)',
    descriptionFr: '9 à 10 chiffres requis (format : XX XXX XXXX)',
  },
  {
    id: 'SC',
    nameEn: 'Seychelles',
    nameFr: 'Seychelles',
    dialCode: '+248',
    flag: '🇸🇨',
    defaultLang: 'en',
    airtelBrand: 'Airtel Seychelles',
    minDigits: 7,
    maxDigits: 7,
    validPrefixes: [],
    placeholder: '251 2345',
    example: '251 2345',
    timezones: ['Indian/Mahe'],
    descriptionEn: '7 digits required (format: XXX XXXX)',
    descriptionFr: '7 chiffres requis (format : XXX XXXX)',
  },
  {
    id: 'TZ',
    nameEn: 'Tanzania',
    nameFr: 'Tanzanie',
    dialCode: '+255',
    flag: '🇹🇿',
    defaultLang: 'en',
    airtelBrand: 'Airtel Tanzania',
    minDigits: 9,
    maxDigits: 10,
    validPrefixes: [],
    placeholder: '784 123 456',
    example: '784 123 456',
    timezones: ['Africa/Dar_es_Salaam'],
    descriptionEn: '9 to 10 digits required (format: XXX XXX XXX)',
    descriptionFr: '9 à 10 chiffres requis (format : XXX XXX XXX)',
  },
  {
    id: 'UG',
    nameEn: 'Uganda',
    nameFr: 'Ouganda',
    dialCode: '+256',
    flag: '🇺🇬',
    defaultLang: 'en',
    airtelBrand: 'Airtel Uganda',
    minDigits: 9,
    maxDigits: 10,
    validPrefixes: [],
    placeholder: '701 234 567',
    example: '701 234 567',
    timezones: ['Africa/Kampala'],
    descriptionEn: '9 to 10 digits required (format: XXX XXX XXX)',
    descriptionFr: '9 à 10 chiffres requis (format : XXX XXX XXX)',
  },
  {
    id: 'ZM',
    nameEn: 'Zambia',
    nameFr: 'Zambie',
    dialCode: '+260',
    flag: '🇿🇲',
    defaultLang: 'en',
    airtelBrand: 'Airtel Zambia',
    minDigits: 9,
    maxDigits: 10,
    validPrefixes: [],
    placeholder: '97 123 4567',
    example: '97 123 4567',
    timezones: ['Africa/Lusaka'],
    descriptionEn: '9 to 10 digits required (format: XX XXX XXXX)',
    descriptionFr: '9 à 10 chiffres requis (format : XX XXX XXXX)',
  },
];

/**
 * Format raw digits according to country phone number grouping
 */
export function formatPhoneNumber(digits: string, country: CountryInfo): string {
  const d = digits.replace(/\D/g, '');
  if (!d) return '';

  // 8 digits: XX XX XX XX
  if (country.minDigits === 8 && country.maxDigits === 8) {
    if (d.length <= 2) return d;
    if (d.length <= 4) return `${d.slice(0, 2)} ${d.slice(2)}`;
    if (d.length <= 6) return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4)}`;
    return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 6)} ${d.slice(6, 8)}`;
  }

  // 7 digits (Seychelles): XXX XXXX
  if (country.maxDigits === 7) {
    if (d.length <= 3) return d;
    return `${d.slice(0, 3)} ${d.slice(3, 7)}`;
  }

  // 9 digits (Congo, DRC, Rwanda, Zambia): XX XXX XXXX
  if (country.minDigits === 9 && country.maxDigits === 9) {
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
    return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 9)}`;
  }

  // 9-10 digits (Kenya, Tanzania, Uganda): XXX XXX XXX or XXX XXX XXXX
  if (country.id === 'KE' || country.id === 'TZ' || country.id === 'UG') {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)}`;
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 10)}`;
  }

  // 10-11 digits (Nigeria): XXX XXX XXXX or XXXX XXX XXXX
  if (country.id === 'NG') {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
    if (d.length <= 10) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 10)}`;
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 11)}`;
  }

  // General 8-10 digits: XX XXX XXXX
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
  if (d.length <= 9) return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 9)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 10)}`;
}

/**
 * Validate phone number against minimum/maximum length and country dial code.
 * NOTE: DOES NOT restrict on starting numbers (e.g. 04, 05, 06, etc. are NOT restricted).
 * Validates strictly format length and requires code.
 */
export function validateAirtelPhone(
  country: CountryInfo,
  rawPhone: string
): { isValid: boolean; normalized: string; formatted: string; errorEn?: string; errorFr?: string } {
  // Strip non-digits
  let digits = rawPhone.replace(/\D/g, '');

  if (!digits) {
    return {
      isValid: false,
      normalized: '',
      formatted: '',
      errorEn: `Please enter phone number for ${country.nameEn}`,
      errorFr: `Veuillez saisir votre numéro pour ${country.nameFr}`,
    };
  }

  // If user pasted or typed international dial code prefix (e.g. 243, 242, 254), cleanly strip it
  const dialDigits = country.dialCode.replace(/\D/g, '');
  if (digits.startsWith(dialDigits) && digits.length > dialDigits.length) {
    digits = digits.slice(dialDigits.length);
  }

  const formatted = formatPhoneNumber(digits, country);
  const isExactLength = country.minDigits === country.maxDigits;

  // Enforce minimum digits
  if (digits.length < country.minDigits) {
    return {
      isValid: false,
      normalized: digits,
      formatted,
      errorEn: isExactLength
        ? `Number must be exactly ${country.minDigits} digits (${digits.length}/${country.minDigits}).`
        : `Number too short. Between ${country.minDigits} and ${country.maxDigits} digits required (${digits.length}/${country.minDigits}).`,
      errorFr: isExactLength
        ? `Le numéro doit comporter exactement ${country.minDigits} chiffres (${digits.length}/${country.minDigits}).`
        : `Numéro trop court. Entre ${country.minDigits} et ${country.maxDigits} chiffres requis (${digits.length}/${country.minDigits}).`,
    };
  }

  // Enforce maximum digits
  if (digits.length > country.maxDigits) {
    return {
      isValid: false,
      normalized: digits,
      formatted,
      errorEn: `Number too long. Maximum ${country.maxDigits} digits allowed (${digits.length}/${country.maxDigits}).`,
      errorFr: `Numéro trop long. Maximum ${country.maxDigits} chiffres autorisés (${digits.length}/${country.maxDigits}).`,
    };
  }

  // Any starting number is allowed (no restriction on 04, 05, 06, etc.)
  return {
    isValid: true,
    normalized: digits,
    formatted,
  };
}

/**
 * Default country is Democratic Republic of the Congo (RDC / +243).
 * Auto-detection of language or location is disabled per requirements.
 */
export const DEFAULT_COUNTRY: CountryInfo = AIRTEL_COUNTRIES[0]; // DRC (CD, +243)

export function detectUserCountry(): CountryInfo {
  return DEFAULT_COUNTRY;
}
