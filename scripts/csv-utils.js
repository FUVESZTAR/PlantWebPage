export async function loadPlantData() {
  const sheetId = '1QHJzWztssucMlnozk2tV9ym6gLedgDj4Zh3DzCTFWCY';
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=PlantDataSheet`;
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    // Google Visualization API wraps response, remove the wrapper
    const json = JSON.parse(text.substring(47).slice(0, -2));
    
    const headers = json.table.cols.map(col => col.label);
    const rows = json.table.rows.map(row => {
      const entry = {};
      headers.forEach((header, index) => {
        entry[header] = row.c[index]?.v ?? "";
      });
      return entry;
    });
    
    return rows;
  } catch (error) {
    console.error('Error loading from Google Sheets:', error);
    throw error;
  }
}

export function parseSemicolonCsv(csvText) {
  const rows = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(";"));

  const headers = rows[0];
  return rows.slice(1).map((values) => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header.trim()] = (values[index] ?? "").trim();
    });
    return entry;
  });
}

export function splitPipe(value) {
  if (!value || value === "0" || value === "-") return [];
  return value.split("|").map((v) => v.trim()).filter(Boolean);
}

export function monthsFromValue(value) {
  return splitPipe(value)
    .map((m) => Number.parseInt(m, 10))
    .filter((m) => Number.isInteger(m) && m >= 1 && m <= 12);
}
