// Built once, since building a formatter reads the locale's data.
const count = new Intl.NumberFormat();
const compactCount = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});
const day = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
});

// Past this a count is shortened, so 128,450 reads as 128.5K and still fits
// where a short figure does.
const COMPACT_FROM = 10_000;

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
 * A day such as "2026-10-03", read as that day in the user's own time zone.
 * On its own such a date is read as midnight UTC, which is still the day
 * before anywhere west of it; with a time, it is read as local.
 */
export function parseDay(isoDay) {
  return new Date(`${isoDay}T00:00`);
}

/**
 * A day such as "2026-10-03" as the locale writes it with its weekday, such
 * as "Sat, 3 Oct".
 */
export function formatDay(isoDay) {
  return day.format(parseDay(isoDay));
}

/**
 * Today as the user's own calendar has it, such as "2026-10-04", for naming a
 * file, so that copies made on different days sit side by side in order.
 */
export function formatFileDate(date = new Date()) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");
}

/**
 * A count as the locale writes it, shortened once it is large, such as
 * "9,870" or "128.5K".
 */
export function formatCount(value) {
  return value >= COMPACT_FROM ? compactCount.format(value) : count.format(value);
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
