import calabarzonPlaces from './calabarzonPlaces.json';

export function validateName(value, label = 'Name') {
  const name = String(value || '');
  if (name !== name.trim()) return `${label} cannot start or end with spaces.`;
  if (name.length < 2 || name.length > 20) return `${label} must be 2 to 20 characters long.`;
  if (!/^\p{L}+(?: \p{L}+)*$/u.test(name)) return `${label} may contain letters and single spaces only.`;
  if (/(\p{L})\1{2,}/iu.test(name)) return `${label} cannot contain the same letter more than twice in a row.`;
  return '';
}

export function validateDateOfBirth(value, minAge = 18) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return 'Date of birth must use YYYY-MM-DD format.';
  const [year, month, day] = value.split('-').map(Number);
  const dob = new Date(year, month - 1, day);
  if (dob.getFullYear() !== year || dob.getMonth() !== month - 1 || dob.getDate() !== day) return 'Enter a valid date of birth.';
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age--;
  if (age < minAge) {
    return minAge === 3
      ? 'Clients must be at least 3 years old.'
      : `Must be at least ${minAge} years old.`;
  }
  return '';
}

// Recognized and trusted top-level domains & common mail providers
const DISALLOWED_DOMAIN_LABELS = new Set([
  'example', 'test', 'invalid', 'localhost', 'sample', 'fake', 'mailinator', 'tempmail', '10minutemail', 'throwaway'
]);

export function validateEmail(value) {
  const email = String(value || '').trim();
  if (!email) return '';

  // Basic email structure: user@domain.tld
  const emailRegex = /^(?!.*\.\.)[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;
  const match = email.match(emailRegex);
  if (!match) {
    return 'Enter a valid email address with a recognized domain (e.g. name@gmail.com, name@yahoo.com, name@outlook.com).';
  }

  const domain = match[1].toLowerCase();
  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  const sld = domainParts[domainParts.length - 2];

  // Disallow temporary or dummy domains
  if (domainParts.some(part => DISALLOWED_DOMAIN_LABELS.has(part))) {
    return 'Temporary or example email domains are not allowed.';
  }

  // Common valid public providers or valid TLDs
  const validCommonDomains = [
    'gmail.com', 'yahoo.com', 'yahoo.com.ph', 'outlook.com', 'hotmail.com',
    'live.com', 'icloud.com', 'aol.com', 'zoho.com', 'proton.me', 'protonmail.com'
  ];

  const standardTlds = [
    'com', 'net', 'org', 'edu', 'gov', 'mil', 'ph', 'com.ph', 'edu.ph', 'gov.ph',
    'io', 'co', 'me', 'info', 'biz', 'app', 'dev', 'tech', 'center', 'health'
  ];

  const isCommonProvider = validCommonDomains.includes(domain);
  const hasValidTld = standardTlds.includes(tld) || (domainParts.length >= 2 && standardTlds.includes(`${domainParts[domainParts.length - 2]}.${tld}`));

  if (!isCommonProvider && !hasValidTld) {
    return 'Please enter an email with a valid domain (e.g. gmail.com, yahoo.com, outlook.com).';
  }

  // TLD length validation
  if (tld.length < 2 || tld.length > 24) {
    return 'Email domain extension is invalid.';
  }

  return '';
}

export function validateContactNumber(value) {
  const phone = String(value || '');
  if (!/^09\d{9}$/.test(phone)) return 'Contact number must be exactly 11 digits and start with 09.';
  if (/^09(\d)\1{8}$/.test(phone)) return 'Contact number cannot use the same digit repeatedly after 09.';
  return '';
}

export function validateAddressSelection({ region, province, city_municipality } = {}) {
  if (region !== 'CALABARZON') return 'Select an address in CALABARZON (Region IV-A).';
  if (!province || !Object.hasOwn(calabarzonPlaces, province)) return 'Select a valid CALABARZON province.';
  if (!calabarzonPlaces[province].includes(city_municipality)) return 'Select a valid city or municipality in the chosen province.';
  return '';
}

export function validatePassword(value) {
  return String(value || '').length >= 8 ? '' : 'Password must be at least 8 characters long.';
}

export function validateRequiredName(value, label) {
  return String(value || '').trim() ? validateName(value, label) : `${label} is required.`;
}

export function validateRequired(value, label) {
  return String(value || '').trim() ? '' : `${label} is required.`;
}

export function validateFullName(value, label = 'Full name') {
  const name = String(value || '').trim();
  if (!name) return `${label} is required.`;
  const parts = name.split(/\s+/);
  if (parts.some(part => part.length < 2 || part.length > 20)) return 'Each name must be 2 to 20 characters long.';
  if (!/^\p{L}+(?: \p{L}+)*$/u.test(name)) return `${label} may contain letters and single spaces only.`;
  const repeated = parts.find(part => /(\p{L})\1{2,}/iu.test(part));
  if (repeated) return `${label} cannot contain the same letter more than twice in a row.`;
  return '';
}

export function validateOptionalName(value, label) {
  return String(value || '').trim() ? validateName(value, label) : '';
}

export function validateRequiredDateOfBirth(value, minAge = 18) {
  return value ? validateDateOfBirth(value, minAge) : 'Date of birth is required.';
}

export function validatePersonNameFields({ first_name, middle_name, last_name } = {}) {
  return {
    first_name: validateRequiredName(first_name, 'First name'),
    middle_name: validateOptionalName(middle_name, 'Middle name'),
    last_name: validateRequiredName(last_name, 'Last name'),
  };
}

export function hasFieldErrors(errors) {
  return Object.values(errors || {}).some(Boolean);
}
