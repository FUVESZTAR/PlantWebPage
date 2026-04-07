import { loadPlantData } from "./csv-utils.js";
import { t, getCurrentLang, setupLanguageButtons } from "./lang.js";

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
    tr.innerHTML = `
      <td>${plant.Plant_ID || ""}</td>
      <td>${plant.LatinName || ""}</td>
      <td>${plant.Name_Variety || ""}</td>
      <td>${plant.Name_EN || ""}</td>
      <td>${plant.Name_HU || ""}</td>
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
    plants = await loadPlantData();
    plants = plants.filter(p => p.Active_in_page === 'Y' && p.Active_in_NFC === 'Y');
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

  const ddFamily  = document.getElementById("dd-family");
  const ddGenus   = document.getElementById("dd-genus");
  const ddLatin   = document.getElementById("dd-latin");
  const ddNameHu  = document.getElementById("dd-nameHu");
  const ddNameEn  = document.getElementById("dd-nameEn");
  const ddVariety = document.getElementById("dd-variety");

  // Show only the name dropdown for the active language
  ddNameHu.style.display = lang === 'hu' ? '' : 'none';
  ddNameEn.style.display = lang === 'en' ? '' : 'none';
  const ddName = lang === 'hu' ? ddNameHu : ddNameEn;

  function unique(arr) {
    return [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  // Family dropdown always shows all families (top of hierarchy)
  buildDropdown(ddFamily, unique(plants.map(p => p.Family)), t('list.filter.allFamilies'));

  // Rebuild genus, latin, name and variety dropdowns so each level only
  // shows values that exist in the rows matching all higher-level filters.
  function rebuildDependentDropdowns() {
    const afterFamily = ddFamily.value
      ? plants.filter(p => p.Family === ddFamily.value)
      : plants;

    buildDropdown(ddGenus, unique(afterFamily.map(p => p.Genus)), t('list.filter.allGenera'));

    const afterGenus = ddGenus.value
      ? afterFamily.filter(p => p.Genus === ddGenus.value)
      : afterFamily;

    buildDropdown(ddLatin, unique(afterGenus.map(p => p.LatinName)), t('list.filter.allLatinNames'));

    const afterLatin = ddLatin.value
      ? afterGenus.filter(p => p.LatinName === ddLatin.value)
      : afterGenus;

    buildDropdown(ddName, unique(afterLatin.map(p => p[nameField])),
      lang === 'hu' ? t('list.filter.allNameHu') : t('list.filter.allNameEn'));

    const afterName = ddName.value
      ? afterLatin.filter(p => p[nameField] === ddName.value)
      : afterLatin;

    buildDropdown(ddVariety, unique(afterName.map(p => p.Name_Variety)), t('list.filter.allVarieties'));
  }

  // Initialise all dependent dropdowns
  rebuildDependentDropdowns();

  // Lightweight rebuild used when only the name filter changes (only variety depends on it)
  function rebuildVarietyDropdown() {
    const afterFamily = ddFamily.value ? plants.filter(p => p.Family === ddFamily.value) : plants;
    const afterGenus  = ddGenus.value  ? afterFamily.filter(p => p.Genus === ddGenus.value) : afterFamily;
    const afterLatin  = ddLatin.value  ? afterGenus.filter(p => p.LatinName === ddLatin.value) : afterGenus;
    const afterName   = ddName.value   ? afterLatin.filter(p => p[nameField] === ddName.value) : afterLatin;
    buildDropdown(ddVariety, unique(afterName.map(p => p.Name_Variety)), t('list.filter.allVarieties'));
  }

  // Apply URL params in hierarchical order so each level is valid before the next
  const familyParam  = params.get("family")  || "";
  const genusParam   = params.get("genus")   || "";
  const latinParam   = params.get("latin")   || "";
  const nameHuParam  = params.get("nameHu")  || "";
  const nameEnParam  = params.get("nameEn")  || "";
  const varietyParam = params.get("variety") || "";

  if (familyParam)  { ddFamily.value = familyParam;  rebuildDependentDropdowns(); }
  if (genusParam)   { ddGenus.value  = genusParam;   rebuildDependentDropdowns(); }
  if (latinParam)   { ddLatin.value  = latinParam;   rebuildDependentDropdowns(); }
  if (lang === 'hu' && nameHuParam) { ddNameHu.value = nameHuParam; rebuildDependentDropdowns(); }
  if (lang === 'en' && nameEnParam) { ddNameEn.value = nameEnParam; rebuildDependentDropdowns(); }
  if (varietyParam) { ddVariety.value = varietyParam; }

  function updateFilterSummary() {
    const parts = [];
    if (ddFamily.value)  parts.push(`${t('list.filter.family')}: ${ddFamily.value}`);
    if (ddGenus.value)   parts.push(`${t('list.filter.genus')}: ${ddGenus.value}`);
    if (ddLatin.value)   parts.push(`${t('list.filter.latin')}: ${ddLatin.value}`);
    if (ddName.value)    parts.push(`${lang === 'hu' ? t('list.filter.nameHu') : t('list.filter.nameEn')}: ${ddName.value}`);
    if (ddVariety.value) parts.push(`${t('list.filter.variety')}: ${ddVariety.value}`);
    filterSummary.textContent = parts.length ? parts.join(" | ") : t('list.allPlants');
  }

  function applyDropdownFilters() {
    const result = plants.filter((p) => {
      if (ddFamily.value  && (p.Family       || "") !== ddFamily.value)  return false;
      if (ddGenus.value   && (p.Genus        || "") !== ddGenus.value)   return false;
      if (ddLatin.value   && (p.LatinName    || "") !== ddLatin.value)   return false;
      if (ddName.value    && (p[nameField]   || "") !== ddName.value)    return false;
      if (ddVariety.value && (p.Name_Variety || "") !== ddVariety.value) return false;
      return true;
    });
    updateFilterSummary();
    renderRows(result);
  }

  ddFamily.addEventListener("change",  () => { rebuildDependentDropdowns(); applyDropdownFilters(); });
  ddGenus.addEventListener("change",   () => { rebuildDependentDropdowns(); applyDropdownFilters(); });
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

