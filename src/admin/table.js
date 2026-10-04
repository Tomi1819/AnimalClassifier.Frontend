// The pieces the admin page's tables are built from.

export function createCell(...contents) {
  const cell = document.createElement("td");
  cell.append(...contents);
  return cell;
}

/**
 * A row that stands in for an empty table, saying why it is empty.
 *
 * @param columns how many columns the row spans, which is the table's.
 */
export function createEmptyRow(text, columns) {
  const cell = createCell(text);
  cell.colSpan = columns;
  cell.className = "admin-table__empty";

  const row = document.createElement("tr");
  row.append(cell);
  return row;
}

export function createBadge(text, className) {
  const badge = document.createElement("span");
  badge.className = className;
  badge.textContent = text;
  return badge;
}
