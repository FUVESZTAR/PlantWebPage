const SHEET_ID = '1QHJzWztssucMlnozk2tV9ym6gLedgDj4Zh3DzCTFWCY';
const SHEET_NAME = 'PlantDataSheet';

/**
 * Fetch raw Google Visualization API response for the plant data sheet.
 * Returns the parsed JSON object (the argument passed to setResponse).
 */
async function fetchSheetResponse() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Sheets request failed: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  // The API wraps the JSON in a callback: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\)\s*;?\s*$/);
  if (!match) {
    throw new Error('Unexpected Google Sheets API response format');
  }
  return JSON.parse(match[1]);
}

/**
 * Load all plant rows from the Google Sheet.
 * Returns an array of plain objects where each key is a column header from the sheet
 * and values are native types (numbers stay numbers, strings stay strings, empty cells become "").
 */
export async function loadPlantData() {
  const gvizResponse = await fetchSheetResponse();
  const { cols, rows } = gvizResponse.table;

  // Use column label (the sheet header row) as the property key, falling back to column id
  const headers = cols.map(col => (col.label && col.label.trim()) ? col.label.trim() : col.id);

  return rows
    // Filter out completely empty rows (Google Sheets sometimes appends null-filled rows).
    // Rows containing 0 or false are intentionally preserved as non-empty data.
    .filter(row => row && row.c && row.c.some(cell => cell && cell.v != null))
    .map(row => {
      const entry = {};
      headers.forEach((header, index) => {
        const cell = row.c[index];
        // Preserve native type: use .v (raw value). Empty cells become empty string.
        entry[header] = (cell && cell.v != null) ? cell.v : '';
      });
      return entry;
    });
}
