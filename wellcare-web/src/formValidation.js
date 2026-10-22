import calabarzonPlaces from './calabarzonPlaces.json';

export function validateName(value, label = 'Name') {
  const name = String(value || '');
  if (name !== name.trim()) return `${label} cannot start or end with spaces.`;
  if (name.length < 2 || name.length > 15) return `${label} must be 2 to 15 characters long.`;
  if (!/^\p{L}+(?: \p{L}+)*$/u.test(name)) return `${label} may contain letters and single spaces only.`;
  if (/(\p{L})\1{2,}/iu.test(name)) return `${label} cannot contain the same letter more than twice in a row.`;
  return '';
}

export function validateDateOfBirth(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return 'Date of birth must use YYYY-MM-DD format.';
  const [year, month, day] = value.split('-').map(Number);
  const dob = new Date(year, month - 1, day);
  if (dob.getFullYear() !== year || dob.getMonth() !== month - 1 || dob.getDate() !== day) return 'Enter a valid date of birth.';
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age--;
  if (age < 18) return 'Staff and clients must be at least 18 years old.';
  return '';
}

export function validateEmail(value) {
  const email = String(value || '').trim();
  return /^(?!.*\.\.)[^\s@]+@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(email)
    ? ''
    : 'Enter a valid email address with one @ and a domain extension (for example, name@gmail.com).';
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
  if (parts.some(part => part.length < 2 || part.length > 15)) return 'Each name must be 2 to 15 characters long.';
  if (!/^\p{L}+(?: \p{L}+)*$/u.test(name)) return `${label} may contain letters and single spaces only.`;
  const repeated = parts.find(part => /(\p{L})\1{2,}/iu.test(part));
  if (repeated) return `${label} cannot contain the same letter more than twice in a row.`;
  return '';
}

export function validateOptionalName(value, label) {
  return String(value || '').trim() ? validateName(value, label) : '';
}

export function validateRequiredDateOfBirth(value) {
  return value ? validateDateOfBirth(value) : 'Date of birth is required.';
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
