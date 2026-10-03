// Built once, since building a formatter reads the locale's data.
const count = new Intl.NumberFormat();

const BYTES_PER_UNIT = 1024;
const SIZE_UNITS = ["B", "KB", "MB", "GB"];

// Below this a size keeps a decimal, so 1.5 MB does not read as 2 MB.
const PRECISE_SIZE_BELOW = 10;

/**
 * A date and time as the user's own locale writes it, in their time zone.
 *
 * @param date anything `Date` reads, such as the ISO string the backend sends.
 */
export function formatDate(date) {
  return new Date(date).toLocaleString();
}

/**
 * A number with the noun it counts, which takes an "s" unless there is
 * exactly one, such as "1 image" or "1,204 images".
 */
export function pluralize(value, noun) {
  return `${count.format(value)} ${noun}${value === 1 ? "" : "s"}`;
}

/**
 * A file's size in the largest unit that keeps it at one or more, such as
 * "820 KB" or "1.5 MB".
 */
export function formatFileSize(bytes) {
  let size = bytes;
  let unit = 0;

  while (size >= BYTES_PER_UNIT && unit < SIZE_UNITS.length - 1) {
    size /= BYTES_PER_UNIT;
    unit += 1;
  }

  const rounded = unit === 0 || size >= PRECISE_SIZE_BELOW ? Math.round(size) : size.toFixed(1);
  return `${rounded} ${SIZE_UNITS[unit]}`;
}
