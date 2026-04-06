import { setupLanguageButtons, t } from './lang.js';
import { loadPlantData } from './csv-utils.js';

const NFC_SHEET_ID   = '1nxRfS0k4zoX7SFlLefuUlPlgDpBZCNkRzxirR1CDGtE';
const NFC_SHEET_NAME = 'nfc_list';

/**
 * Load all rows from the NFC list Google Sheet.
 * Returns an array of objects with keys: id, nfcText, link, plantId,
 * created, datum, location, gpsCoordinates, altitude.
 */
async function loadNfcData() {
  const url = `https://docs.google.com/spreadsheets/d/${NFC_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(NFC_SHEET_NAME)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Sheets request failed: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\)\s*;?\s*$/);
  if (!match) {
    throw new Error('Unexpected Google Sheets API response format');
  }
  const gvizResponse = JSON.parse(match[1]);
  const { cols, rows } = gvizResponse.table;

  const headers = cols.map(col => (col.label && col.label.trim()) ? col.label.trim() : col.id);

  // Case-insensitive lookup of a column value by one or more candidate names
  function findVal(entry, ...names) {
    for (const name of names) {
      const key = headers.find(h => h.toLowerCase() === name.toLowerCase());
      if (key !== undefined && entry[key] != null) return String(entry[key]);
    }
    return '';
  }

  return rows
    .filter(row => row && row.c && row.c.some(cell => cell && cell.v != null))
    .map(row => {
      const entry = {};
      headers.forEach((header, index) => {
        const cell = row.c[index];
        entry[header] = (cell && cell.v != null) ? String(cell.v) : '';
      });
      return {
        id:             entry[headers[0]] || '',
        nfcText:        entry[headers[1]] || '',
        link:           entry[headers[2]] || '',
        plantId:        findVal(entry, 'plant_id'),
        created:        findVal(entry, 'created'),
        datum:          findVal(entry, 'datum'),
        location:       findVal(entry, 'location'),
        gpsCoordinates: findVal(entry, 'gps_coordinates'),
        altitude:       findVal(entry, 'altitude'),
      };
    });
}

document.getElementById('back-button').addEventListener('click', () => {
  window.location.href = 'HomePage.html';
});

function unique(arr) {
  return [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function buildDropdown(selectEl, allValues, placeholder) {
  const current = selectEl.value;
  selectEl.innerHTML = '';
  const all = document.createElement('option');
  all.value = '';
  all.textContent = placeholder;
  selectEl.appendChild(all);
  allValues.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  });
  selectEl.value = allValues.includes(current) ? current : '';
}

function renderRows(rows) {
  const tbody = document.getElementById('nfc-list-body');
  const colCount = document.querySelectorAll('.nfc-list-table thead th').length || 9;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="${colCount}">${t('nfc.empty')}</td></tr>`;
    return;
  }
  tbody.innerHTML = '';
  rows.forEach(row => {
    const tr = document.createElement('tr');

    const tdId = document.createElement('td');
    tdId.textContent = row.id;

    const tdNfc = document.createElement('td');
    tdNfc.textContent = row.nfcText;

    const tdLink = document.createElement('td');
    if (row.link && /^https?:\/\//i.test(row.link)) {
      const a = document.createElement('a');
      a.href = row.link;
      a.textContent = row.link;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      tdLink.appendChild(a);
    } else {
      tdLink.textContent = row.link;
    }

    const tdPlantId = document.createElement('td');
    tdPlantId.textContent = row.plantId;

    const tdCreated = document.createElement('td');
    tdCreated.textContent = row.created;

    const tdDatum = document.createElement('td');
    tdDatum.textContent = row.datum;

    const tdLocation = document.createElement('td');
    tdLocation.textContent = row.location;

    const tdGps = document.createElement('td');
    tdGps.textContent = row.gpsCoordinates;

    const tdAlt = document.createElement('td');
    tdAlt.textContent = row.altitude;

    tr.append(tdId, tdNfc, tdLink, tdPlantId, tdCreated, tdDatum, tdLocation, tdGps, tdAlt);
    tbody.appendChild(tr);
  });
}

async function populate() {
  const errorMsg = document.getElementById('error-message');

  let nfcRows = [];
  const plantMap = {};
  try {
    const [nfcData, plantData] = await Promise.all([loadNfcData(), loadPlantData()]);
    nfcRows = nfcData;
    plantData.forEach(p => {
      if (p.Nr) plantMap[String(p.Nr)] = p;
    });
  } catch (err) {
    console.error(err);
    errorMsg.textContent = t('nfc.error.loadFailed');
    document.getElementById('nfc-list-body').innerHTML =
      `<tr><td colspan="${document.querySelectorAll('.nfc-list-table thead th').length || 9}">${t('nfc.error.loadData')}</td></tr>`;
    return;
  }

  // Enrich NFC rows with plant taxonomy info via plant_id → Nr
  const enriched = nfcRows.map(row => {
    const plant = plantMap[row.plantId] || {};
    return {
      ...row,
      family:  String(plant.Family        || ''),
      genus:   String(plant.Genus         || ''),
      latin:   String(plant.LatinName     || ''),
      variety: String(plant.Name_Variety  || ''),
    };
  });

  const ddNfcId   = document.getElementById('dd-nfc-id');
  const ddPlantId = document.getElementById('dd-plant-id');
  const ddFamily  = document.getElementById('dd-family');
  const ddGenus   = document.getElementById('dd-genus');
  const ddLatin   = document.getElementById('dd-latin');
  const ddVariety = document.getElementById('dd-variety');

  buildDropdown(ddNfcId,   unique(enriched.map(r => r.id)),      t('nfc.filter.allNfcIds'));
  buildDropdown(ddPlantId, unique(enriched.map(r => r.plantId)), t('nfc.filter.allPlantIds'));
  buildDropdown(ddFamily,  unique(enriched.map(r => r.family)),  t('nfc.filter.allFamilies'));
  buildDropdown(ddGenus,   unique(enriched.map(r => r.genus)),   t('nfc.filter.allGenera'));
  buildDropdown(ddLatin,   unique(enriched.map(r => r.latin)),   t('nfc.filter.allLatinNames'));
  buildDropdown(ddVariety, unique(enriched.map(r => r.variety)), t('nfc.filter.allVarieties'));

  function applyFilters() {
    const nfcId   = ddNfcId.value;
    const plantId = ddPlantId.value;
    const family  = ddFamily.value;
    const genus   = ddGenus.value;
    const latin   = ddLatin.value;
    const variety = ddVariety.value;

    const result = enriched.filter(r => {
      if (nfcId   && r.id      !== nfcId)   return false;
      if (plantId && r.plantId !== plantId) return false;
      if (family  && r.family  !== family)  return false;
      if (genus   && r.genus   !== genus)   return false;
      if (latin   && r.latin   !== latin)   return false;
      if (variety && r.variety !== variety) return false;
      return true;
    });
    renderRows(result);
  }

  [ddNfcId, ddPlantId, ddFamily, ddGenus, ddLatin, ddVariety].forEach(dd => {
    dd.addEventListener('change', applyFilters);
  });

  applyFilters();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { setupLanguageButtons(); populate(); });
} else {
  setupLanguageButtons();
  populate();
}
