import { loadPlantDataSB, splitPipe } from "./sheet-loader.js";
import { t, getCurrentLang, setupLanguageButtons } from "./lang.js";
import { makeSelectSearchable } from "./searchable-select.js";

document.getElementById("back-button").addEventListener("click", () => {
  window.location.href = "Homepage.html";
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

function renderRows(plants) {
  const tbody = document.getElementById("plant-list-body");
  if (!plants.length) {
    tbody.innerHTML = `<tr><td colspan="5">${t('list.empty')}</td></tr>`;
    return;
  }
  tbody.innerHTML = "";
  plants.forEach((plant) => {
    const tr = document.createElement("tr");
    const varieties = splitPipe(plant.Name_Variety);
    tr.innerHTML = `
      <td>${plant.Plant_ID || ""}</td>
      <td>${plant.LatinName || ""}</td>
      <td>${varieties.length ? varieties.join(", ") : ""}</td>
      <td>${plant.Name_HU || ""}</td>
      <td>${plant.Name_EN || ""}</td>
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
  let plants = [];
  try {
    plants = await loadPlantDataSB();
  } catch (err) {
    console.error(err);
    errorMsg.textContent = t('list.error.loadFailed');
    document.getElementById("plant-list-body").innerHTML =
      `<tr><td colspan="5">${t('list.error.loadData')}</td></tr>`;
    return;
  }

  plants.sort((a, b) => (a.LatinName || "").localeCompare(b.LatinName || ""));

  const lang = getCurrentLang();
  const nameField = lang === 'hu' ? 'Name_HU' : 'Name_EN';

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

  // Seedbank dropdown always shows all seedbanks (top of hierarchy)
  buildDropdown(ddSeedbank, unique(plants.map(p => p.Seedbank)), t('seedbank.filter.allSeedbanks'));
  searchSeedbank.refresh();

  // Rebuild year, latin, name and variety dropdowns so each level only
  // shows values that exist in the rows matching all higher-level filters.
  function rebuildDependentDropdowns() {
    const afterSeedbank = ddSeedbank.value
      ? plants.filter(p => p.Seedbank === ddSeedbank.value)
      : plants;

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
    const afterSeedbank = ddSeedbank.value ? plants.filter(p => p.Seedbank === ddSeedbank.value) : plants;
    const afterYear  = ddYear.value  ? afterSeedbank.filter(p => String(p.Year || '') === ddYear.value) : afterSeedbank;
    const afterLatin  = ddLatin.value  ? afterYear.filter(p => p.LatinName === ddLatin.value) : afterYear;
    const afterName   = ddName.value   ? afterLatin.filter(p => p[nameField] === ddName.value) : afterLatin;
    buildDropdown(ddVariety, unique(afterName.flatMap(p => splitPipe(p.Name_Variety))), t('list.filter.allVarieties'));
    searchVariety.refresh();
  }

  // Apply URL params in hierarchical order so each level is valid before the next.
  // Also handle filterType/filterValue params produced by setIdentityFilterLink in P.html.
  const filterType  = params.get("filterType")  || "";
  const filterValue = params.get("filterValue") || "";

  let seedbankParam  = params.get("seedbank")  || "";
  let yearParam   = params.get("year")   || "";
  let latinParam   = params.get("latin")   || "";
  const nameHuParam  = params.get("nameHu")  || "";
  const nameEnParam  = params.get("nameEn")  || "";
  const varietyParam = params.get("variety") || "";

  if (filterValue) {
    if (filterType === "seedbank") seedbankParam = filterValue;
    else if (filterType === "year") yearParam = filterValue;
    else if (filterType === "latin") latinParam = filterValue;
  }

  if (seedbankParam)  { ddSeedbank.value = seedbankParam;  rebuildDependentDropdowns(); }
  if (yearParam)   { ddYear.value  = yearParam;   rebuildDependentDropdowns(); }
  if (latinParam)   { ddLatin.value  = latinParam;   rebuildDependentDropdowns(); }
  if (lang === 'hu' && nameHuParam) { ddNameHu.value = nameHuParam; rebuildDependentDropdowns(); }
  if (lang === 'en' && nameEnParam) { ddNameEn.value = nameEnParam; rebuildDependentDropdowns(); }
  if (varietyParam) { ddVariety.value = varietyParam; }

  function applyDropdownFilters() {
    const result = plants.filter((p) => {
      if (ddSeedbank.value && (p.Seedbank || "") !== ddSeedbank.value) return false;
      if (ddYear.value     && String(p.Year || "") !== ddYear.value)   return false;
      if (ddLatin.value    && (p.LatinName   || "") !== ddLatin.value)  return false;
      if (ddName.value     && (p[nameField]  || "") !== ddName.value)   return false;
      if (ddVariety.value  && !splitPipe(p.Name_Variety).includes(ddVariety.value)) return false;
      return true;
    });
    renderRows(result);
  }

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
