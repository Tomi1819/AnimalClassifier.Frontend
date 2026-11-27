/**
 * The viewer's own IANA time zone, such as "Europe/Sofia", which the backend
 * counts days in, so that a day ends at the viewer's midnight rather than at
 * UTC's.
 */
export function userTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
