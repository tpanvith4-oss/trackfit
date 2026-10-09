/** Converts a form input string to a number, returning `null` for blank or invalid input. */
export function toNumberOrNull(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

const oneDecimal = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
export const formatNumber = (value) => oneDecimal.format(value);
