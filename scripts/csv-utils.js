export async function loadPlantData(path = "data/PlantData.csv") {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Unable to load ${path}`);
  }

  const raw = await response.text();
  return parseSemicolonCsv(raw);
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
