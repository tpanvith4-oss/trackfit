/** Converts a form input string to a number, returning `null` for blank or invalid input. */
export function toNumberOrNull(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

const oneDecimal = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
export const formatNumber = (value) => oneDecimal.format(value);

const fixedFormatters = new Map();
const signedFormatters = new Map();

function getFormatter(cache, digits, options) {
  if (!cache.has(digits)) {
    cache.set(digits, new Intl.NumberFormat(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits, ...options }));
  }
  return cache.get(digits);
}

/** Formats with a fixed number of decimals, e.g. 62 -> "62.0". */
export const formatFixed = (value, digits = 1) => getFormatter(fixedFormatters, digits).format(value);

/** Formats with an explicit sign for non-zero values, e.g. -0.45 -> "-0.45", 0.2 -> "+0.20". */
export const formatSigned = (value, digits = 1) =>
  getFormatter(signedFormatters, digits, { signDisplay: 'exceptZero' }).format(value);

export const roundTo = (value, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};
