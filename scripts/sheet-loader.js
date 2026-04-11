const SHEET_ID = '1QHJzWztssucMlnozk2tV9ym6gLedgDj4Zh3DzCTFWCY';
const SHEET_NAME = 'plant_list';

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
  console.log("loadPlantData");
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

/**
 * Fetch raw Google Visualization API response with an optional TQ query.
 */
async function fetchSheetResponseQuerry(tq = '') {
  const params = new URLSearchParams({
    tqx: 'out:json',
    sheet: SHEET_NAME,
    ...(tq && { tq }),
  });
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?${params}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Sheets request failed: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\)\s*;?\s*$/);
  if (!match) {
    throw new Error('Unexpected Google Sheets API response format');
  }
  return JSON.parse(match[1]);
}

/**
 * Load a single plant row whose "LatinName" (column B) matches the given input.
 * Only that one row + the header is fetched from the sheet — minimal data transfer.
 *
 * @param {string} latinName - The LatinName value to match exactly.
 * @returns {Object|null} A plain object with sheet headers as keys, or null if not found.
 */
export async function loadPlantByLatinName(latinName) {
  // GViz TQ query: select all columns where column B equals the input value.
  // 'limit 1' ensures we stop after the first match.
  const tq = `select * where B = '${latinName.replace(/'/g, "\\'")}' limit 1`;

  const gvizResponse = await fetchSheetResponseQuerry(tq);
  const { cols, rows } = gvizResponse.table;

  const headers = cols.map(col =>
    (col.label && col.label.trim()) ? col.label.trim() : col.id
  );

  const validRows = rows.filter(
    row => row && row.c && row.c.some(cell => cell && cell.v != null)
  );

  if (validRows.length === 0) return null;

  const row = validRows[0];
  const entry = {};
  headers.forEach((header, index) => {
    const cell = row.c[index];
    entry[header] = (cell && cell.v != null) ? cell.v : '';
  });
  return entry;
}

/* use
const plant = await loadPlantByLatinName('Rosa canina');
if (plant) {
  console.log(plant.CommonName, plant.Family);
} else {
  console.log('Not found');
}*/

/**
 * Load all Name_Variety values (column C) for a given LatinName (column B).
 * Only columns B and C are fetched — minimal data transfer.
 *
 * @param {string} latinName - The LatinName value to match.
 * @returns {string[]} Array of Name_Variety values matching the given LatinName.
 */
export async function loadVarietiesByLatinName(latinName) {
  const tq = `select C where B = '${latinName.replace(/'/g, "\\'")}' `;

  const gvizResponse = await fetchSheetResponse(tq);
  const { rows } = gvizResponse.table;

  return rows
    .filter(row => row && row.c && row.c[0] && row.c[0].v != null)
    .map(row => row.c[0].v);
}
/* use 
const varieties = await loadVarietiesByLatinName('Rosa canina');
console.log(varieties); // ['variety one', 'variety two', ...] */

//best for Plant view ? Plant info:

/**
 * Load a single plant's full row data AND all its Name_Variety values
 * in a single network request.
 *
 * @param {string} latinName - The LatinName value to match.
 * @returns {{ plant: Object|null, varieties: string[] }}
 */
export async function loadPlantWithVarieties(latinName) {
  const tq = `select * where B = '${latinName.replace(/'/g, "\\'")}'`;

  const gvizResponse = await fetchSheetResponse(tq);
  const { cols, rows } = gvizResponse.table;

  const headers = cols.map(col =>
    (col.label && col.label.trim()) ? col.label.trim() : col.id
  );

  const validRows = rows.filter(
    row => row && row.c && row.c.some(cell => cell && cell.v != null)
  );

  if (validRows.length === 0) return { plant: null, varieties: [] };

  // First matching row = the representative plant entry
  const plant = {};
  headers.forEach((header, index) => {
    const cell = validRows[0].c[index];
    plant[header] = (cell && cell.v != null) ? cell.v : '';
  });

  // All matching rows → extract Name_Variety (column C, index 2)
  const varietyIndex = headers.indexOf('Name_Variety');
  
  const varieties = validRows
    .map(row => {
      const cell = row.c[varietyIndex];
      return (cell && cell.v != null) ? cell.v : null;
    })
    .filter(v => v !== null);

  return { plant, varieties };
}

/* use 
const { plant, varieties } = await loadPlantWithVarieties('Rosa canina');
console.log(plant);     // { LatinName: 'Rosa canina', Family: '...', ... }
console.log(varieties); // ['variety one', 'variety two', ...]
*/
