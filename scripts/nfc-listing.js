import { setupLanguageButtons, t } from './lang.js';

const NFC_SHEET_ID   = '1nxRfS0k4zoX7SFlLefuUlPlgDpBZCNkRzxirR1CDGtE';
const NFC_SHEET_NAME = 'nfc_list';

/**
 * Load all rows from the NFC list Google Sheet.
 * Returns an array of objects with keys: id, nfcText, link.
 * The first row of the sheet is treated as the header and is skipped.
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

  // Build header names from col labels
  const headers = cols.map(col => (col.label && col.label.trim()) ? col.label.trim() : col.id);

  return rows
    .filter(row => row && row.c && row.c.some(cell => cell && cell.v != null))
    .map(row => {
      const entry = {};
      headers.forEach((header, index) => {
        const cell = row.c[index];
        entry[header] = (cell && cell.v != null) ? String(cell.v) : '';
      });
      // Map positional columns: first=id, second=nfcText, third=link
      return {
        id:      entry[headers[0]] || '',
        nfcText: entry[headers[1]] || '',
        link:    entry[headers[2]] || '',
      };
    });
}

document.getElementById('back-button').addEventListener('click', () => {
  window.location.href = 'HomePage.html';
});

async function populate() {
  const tbody   = document.getElementById('nfc-list-body');
  const errorMsg = document.getElementById('error-message');

  let nfcRows = [];
  try {
    nfcRows = await loadNfcData();
  } catch (err) {
    console.error(err);
    errorMsg.textContent = t('nfc.error.loadFailed');
    tbody.innerHTML = `<tr><td colspan="3">${t('nfc.error.loadData')}</td></tr>`;
    return;
  }

  if (!nfcRows.length) {
    tbody.innerHTML = `<tr><td colspan="3">${t('nfc.empty')}</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  nfcRows.forEach(row => {
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

    tr.appendChild(tdId);
    tr.appendChild(tdNfc);
    tr.appendChild(tdLink);
    tbody.appendChild(tr);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { setupLanguageButtons(); populate(); });
} else {
  setupLanguageButtons();
  populate();
}
