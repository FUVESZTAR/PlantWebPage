import { loadPlantDataSB, loadPlantIdPlSB2 } from "./sheet-loader.js";
import { splitPipe } from "./csv-utils.js";
import { t, getCurrentLang, setupLanguageButtons } from "./lang.js";
import { makeSelectSearchable } from "./searchable-select.js";

// ── Debug helpers ────────────────────────────────────────────────────────────
const debugLines = [];
function dbg(msg, level = 'info') {
  const cls = level === 'ok' ? 'dbg-ok' : level === 'warn' ? 'dbg-warn' : level === 'err' ? 'dbg-err' : '';
  debugLines.push(cls ? `<span class="${cls}">${escHtml(msg)}</span>` : escHtml(msg));
  const panel = document.getElementById('debug-panel');
  if (panel) panel.innerHTML = debugLines.join('\n');
}
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
// ────────────────────────────────────────────────────────────────────────────

document.getElementById("back-button").addEventListener("click", () => {
  window.location.href = "Homepage.html";
});

document.getElementById("debug-toggle").addEventListener("click", () => {
  const panel = document.getElementById("debug-panel");
  panel.style.display = panel.style.display === "none" ? "block" : "none";
});

function buildDropdown(selectEl, allValues, placeholder) {
  const current = selectEl.value;
  selectEl.innerHTML = "";
  const all = document.createElement("option");
  all.value = "";
  all.textContent = placeholder;
  selectEl.appendChild(all);
  allValues.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  });
  selectEl.value = allValues.includes(current) ? current : "";
}

function renderRows(plantsSB) {
  const tbody = document.getElementById("plant-list-body");
  if (!plantsSB.length) {
    tbody.innerHTML = `<tr><td colspan="8">${t('list.empty')}</td></tr>`;
    return;
  }
  tbody.innerHTML = "";
  plantsSB.forEach((plant) => {
    const tr = document.createElement("tr");
    const varieties = splitPipe(plant.Name_Variety);
    tr.innerHTML = `
      <td>${plant.Plant_ID || ""}</td>
      <td>${plant.LatinName || ""}</td>
      <td>${varieties.length ? varieties.join(", ") : ""}</td>
      <td>${plant.Name_EN || ""}</td>
      <td>${plant.Name_HU || ""}</td>
      <td>${plant.Seed_availability || ""}</td>
      <td>${plant.Seedbank || ""}</td>
      <td>${plant.Year || ""}</td>
    `;
    tr.addEventListener("click", () => {
      localStorage.setItem("selectedPlantNr", plant.Plant_ID);
      window.location.href = `P.html?id=${encodeURIComponent(plant.Plant_ID)}`;
    });
    tbody.appendChild(tr);
  });
}

async function populate() {
  const filterSummary = document.getElementById("filter-summary");
  const errorMsg = document.getElementById("error-message");

  const params = new URLSearchParams(window.location.search);
  let plantsGF = [];
  let plantsSB = [];
  // seed bank
  dbg('── seed_bank fetch ──────────────────────────');
  try {
    plantsSB = await loadPlantDataSB();
    dbg(`seed_bank rows loaded: ${plantsSB.length}`, plantsSB.length > 0 ? 'ok' : 'warn');
    if (plantsSB.length > 0) {
      const headers = Object.keys(plantsSB[0]);
      dbg(`seed_bank columns (${headers.length}): ${headers.join(', ')}`);
      dbg('seed_bank row[0]: ' + JSON.stringify(plantsSB[0]));
    }
  } catch (err) {
    dbg(`seed_bank ERROR: ${err.message}`, 'err');
    console.error(err);
    errorMsg.textContent = t('list.error.loadFailed');
    document.getElementById("plant-list-body").innerHTML =
      `<tr><td colspan="8">${t('list.error.loadData')}</td></tr>`;
    return;
  }
  // plant list
  dbg('── plant_list fetch ─────────────────────────');
    try {
    plantsGF = await loadPlantIdPlSB2();
    dbg(`plant_list rows loaded: ${plantsGF.length}`, plantsGF.length > 0 ? 'ok' : 'warn');
    if (plantsGF.length > 0) {
      const headers = Object.keys(plantsGF[0]);
      dbg(`plant_list columns: ${headers.join(', ')}`);
    }
  } catch (err) {
    dbg(`plant_list ERROR: ${err.message}`, 'err');
    console.error(err);
    errorMsg.textContent = t('list.error.loadFailed');
    document.getElementById("plant-list-body").innerHTML =
      `<tr><td colspan="8">${t('list.error.loadData')}</td></tr>`;
    return;
  }

  // Build a lookup map from Plant_ID → plant_list fields using plantsGF
  const plantListMap = new Map(plantsGF.map(p => [String(p.Plant_ID), p]));

  // Enrich each seed_bank record with LatinName, Name_Variety, Name_HU, Name_EN, Genus, Family
  // from plant_list, falling back to any values already present in the seed_bank row.
  plantsSB = plantsSB.map(sb => {
    const pl = plantListMap.get(String(sb.Plant_ID)) || {};
    return {
      ...sb,
      LatinName:    sb.LatinName    || pl.LatinName    || '',
      Name_Variety: sb.Name_Variety || pl.Name_Variety || '',
      Name_HU:      sb.Name_HU      || pl.Name_HU      || '',
      Name_EN:      sb.Name_EN      || pl.Name_EN      || '',
      Genus:        sb.Genus        || pl.Genus        || '',
      Family:       sb.Family       || pl.Family       || '',
    };
  });

  plantsSB.sort((a, b) => (a.LatinName || "").localeCompare(b.LatinName || ""));

  dbg('── enrichment result ────────────────────────');
  dbg(`enriched rows: ${plantsSB.length}`, plantsSB.length > 0 ? 'ok' : 'warn');
  if (plantsSB.length > 0) {
    dbg('enriched row[0]: ' + JSON.stringify(plantsSB[0]));
  }
  dbg('─────────────────────────────────────────────');

  const lang = getCurrentLang();
  const nameField = lang === 'hu' ? 'Name_HU' : 'Name_EN';

  const ddFamily  = document.getElementById("dd-family");
  const ddGenus   = document.getElementById("dd-genus");
  const ddLatin   = document.getElementById("dd-latin");
  const ddNameHu  = document.getElementById("dd-nameHu");
  const ddNameEn  = document.getElementById("dd-nameEn");
  const ddVariety = document.getElementById("dd-variety");
  const ddSeedbank  = document.getElementById("dd-seedbank");
  const ddYear  = document.getElementById("dd-year");

  // Show only the name dropdown (and its search input wrapper) for the active language
  const ddNameHuCol = ddNameHu.closest('.filter-col') || ddNameHu;
  const ddNameEnCol = ddNameEn.closest('.filter-col') || ddNameEn;
  ddNameHuCol.style.display = lang === 'hu' ? '' : 'none';
  ddNameEnCol.style.display = lang === 'en' ? '' : 'none';
  const ddName = lang === 'hu' ? ddNameHu : ddNameEn;

  // Set up live-search on each filter dropdown
  const searchFamily  = makeSelectSearchable(ddFamily,  'dd-family-search');
  const searchGenus   = makeSelectSearchable(ddGenus,   'dd-genus-search');
  const searchSeedbank = makeSelectSearchable(ddSeedbank, 'dd-seedbank-search');
  const searchYear     = makeSelectSearchable(ddYear,     'dd-year-search');
  const searchLatin    = makeSelectSearchable(ddLatin,    'dd-latin-search');
  const searchNameHu   = makeSelectSearchable(ddNameHu,   'dd-nameHu-search');
  const searchNameEn   = makeSelectSearchable(ddNameEn,   'dd-nameEn-search');
  const searchVariety  = makeSelectSearchable(ddVariety,  'dd-variety-search');
  const searchName     = lang === 'hu' ? searchNameHu : searchNameEn;

  function unique(arr) {
    return [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  // Family dropdown always shows all families present in the seedbank (top of hierarchy)
  buildDropdown(ddFamily,
    unique(plantsSB.map(p => p.Family)),
    t('list.filter.allFamilies'));
  searchFamily.refresh();

  // Rebuild genus, seedbank, year, latin, name and variety dropdowns so each level only
  // shows values that exist in the rows matching all higher-level filters.
  function rebuildDependentDropdowns() {
    const afterFamily = ddFamily.value
      ? plantsSB.filter(p => p.Family === ddFamily.value)
      : plantsSB;

    buildDropdown(ddGenus, unique(afterFamily.map(p => p.Genus)), t('list.filter.allGenera'));
    searchGenus.refresh();

    const afterGenus = ddGenus.value
      ? afterFamily.filter(p => p.Genus === ddGenus.value)
      : afterFamily;

    const afterSeedbank = ddSeedbank.value
      ? afterGenus.filter(p => p.Seedbank === ddSeedbank.value)
      : afterGenus;

    buildDropdown(ddSeedbank, unique(afterGenus.map(p => p.Seedbank)), t('seedbank.filter.allSeedbanks'));
    searchSeedbank.refresh();

    buildDropdown(ddYear, unique(afterSeedbank.map(p => String(p.Year || ''))), t('seedbank.filter.allYears'));
    searchYear.refresh();

    const afterYear = ddYear.value
      ? afterSeedbank.filter(p => String(p.Year || '') === ddYear.value)
      : afterSeedbank;

    buildDropdown(ddLatin, unique(afterYear.map(p => p.LatinName)), t('list.filter.allLatinNames'));
    searchLatin.refresh();

    const afterLatin = ddLatin.value
      ? afterYear.filter(p => p.LatinName === ddLatin.value)
      : afterYear;

    buildDropdown(ddName, unique(afterLatin.map(p => p[nameField])),
      lang === 'hu' ? t('list.filter.allNameHu') : t('list.filter.allNameEn'));
    searchName.refresh();

    const afterName = ddName.value
      ? afterLatin.filter(p => p[nameField] === ddName.value)
      : afterLatin;

    buildDropdown(ddVariety, unique(afterName.flatMap(p => splitPipe(p.Name_Variety))), t('list.filter.allVarieties'));
    searchVariety.refresh();
  }

  // Initialise all dependent dropdowns
  rebuildDependentDropdowns();

  // Lightweight rebuild used when only the name filter changes (only variety depends on it)
  function rebuildVarietyDropdown() {
    const afterFamily   = ddFamily.value   ? plantsSB.filter(p => p.Family === ddFamily.value)               : plantsSB;
    const afterGenus    = ddGenus.value    ? afterFamily.filter(p => p.Genus === ddGenus.value)               : afterFamily;
    const afterSeedbank = ddSeedbank.value ? afterGenus.filter(p => p.Seedbank === ddSeedbank.value)          : afterGenus;
    const afterYear     = ddYear.value     ? afterSeedbank.filter(p => String(p.Year || '') === ddYear.value) : afterSeedbank;
    const afterLatin    = ddLatin.value    ? afterYear.filter(p => p.LatinName === ddLatin.value)             : afterYear;
    const afterName     = ddName.value     ? afterLatin.filter(p => p[nameField] === ddName.value)            : afterLatin;
    buildDropdown(ddVariety, unique(afterName.flatMap(p => splitPipe(p.Name_Variety))), t('list.filter.allVarieties'));
    searchVariety.refresh();
  }

  // Apply URL params in hierarchical order so each level is valid before the next.
  // Also handle filterType/filterValue params produced by setIdentityFilterLink in P.html.
  const filterType  = params.get("filterType")  || "";
  const filterValue = params.get("filterValue") || "";

  let familyParam  = params.get("family")  || "";
  let genusParam   = params.get("genus")   || "";
  let seedbankParam  = params.get("seedbank")  || "";
  let yearParam   = params.get("year")   || "";
  let latinParam   = params.get("latin")   || "";
  const nameHuParam  = params.get("nameHu")  || "";
  const nameEnParam  = params.get("nameEn")  || "";
  const varietyParam = params.get("variety") || "";

  if (filterValue) {
    if (filterType === "family") familyParam = filterValue;
    else if (filterType === "genus") genusParam = filterValue;
    else if (filterType === "seedbank") seedbankParam = filterValue;
    else if (filterType === "year") yearParam = filterValue;
    else if (filterType === "latin") latinParam = filterValue;
  }

  if (familyParam)  { ddFamily.value  = familyParam;  rebuildDependentDropdowns(); }
  if (genusParam)   { ddGenus.value   = genusParam;   rebuildDependentDropdowns(); }
  if (seedbankParam)  { ddSeedbank.value = seedbankParam;  rebuildDependentDropdowns(); }
  if (yearParam)   { ddYear.value  = yearParam;   rebuildDependentDropdowns(); }
  if (latinParam)   { ddLatin.value  = latinParam;   rebuildDependentDropdowns(); }
  if (lang === 'hu' && nameHuParam) { ddNameHu.value = nameHuParam; rebuildDependentDropdowns(); }
  if (lang === 'en' && nameEnParam) { ddNameEn.value = nameEnParam; rebuildDependentDropdowns(); }
  if (varietyParam) { ddVariety.value = varietyParam; }

  function applyDropdownFilters() {
    const result = plantsSB.filter((p) => {
      if (ddFamily.value   && (p.Family      || "") !== ddFamily.value)   return false;
      if (ddGenus.value    && (p.Genus       || "") !== ddGenus.value)    return false;
      if (ddSeedbank.value && (p.Seedbank    || "") !== ddSeedbank.value) return false;
      if (ddYear.value     && String(p.Year  || "") !== ddYear.value)     return false;
      if (ddLatin.value    && (p.LatinName   || "") !== ddLatin.value)    return false;
      if (ddName.value     && (p[nameField]  || "") !== ddName.value)     return false;
      if (ddVariety.value  && !splitPipe(p.Name_Variety).includes(ddVariety.value)) return false;
      return true;
    });
    renderRows(result);
  }

  ddFamily.addEventListener("change",  () => { rebuildDependentDropdowns(); applyDropdownFilters(); });
  ddGenus.addEventListener("change",   () => { rebuildDependentDropdowns(); applyDropdownFilters(); });
  ddSeedbank.addEventListener("change",  () => { rebuildDependentDropdowns(); applyDropdownFilters(); });
  ddYear.addEventListener("change",   () => { rebuildDependentDropdowns(); applyDropdownFilters(); });
  ddLatin.addEventListener("change",   () => { rebuildDependentDropdowns(); applyDropdownFilters(); });
  ddName.addEventListener("change",    () => { rebuildVarietyDropdown(); applyDropdownFilters(); });
  ddVariety.addEventListener("change", applyDropdownFilters);

  applyDropdownFilters();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => { setupLanguageButtons(); populate(); });
} else {
  setupLanguageButtons();
  populate();
}
