const NAME_CHARACTERS = /[^\p{L}\s]/gu;

export function formatPersonName(value) {
  return value
    .replace(NAME_CHARACTERS, '')
    .replace(/\s+/g, ' ')
    .replace(/(^|\s)\p{L}/gu, match => match.toLocaleUpperCase())
    .replace(/(\p{L})([^\s]*)/gu, (_, first, rest) => first + rest.toLocaleLowerCase());
}

export function isValidPersonName(value) {
  const name = value.trim();
  return name.length >= 2 && name.length <= 15 && /^\p{L}+(?:\s+\p{L}+)*$/u.test(name);
}
