export { loadPlantData } from './sheet-loader.js';

export function splitPipe(value) {
  console.log("laod data2");
  if (!value || value === "0" || value === "-") return [];
  return String(value).split("|").map((v) => v.trim()).filter(Boolean);
}

export function monthsFromValue(value) {
  return splitPipe(value)
    .map((m) => Number.parseInt(m, 10))
    .filter((m) => Number.isInteger(m) && m >= 1 && m <= 12);
}
