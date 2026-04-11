import { loadPlantDataSB, splitPipe } from "./csv-utils.js";
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
    plants = await loadPlantData();
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

  // Show only the name dropdown for the active language
  ddNameHu.style.display = lang === 'hu' ? '' : 'none';
  ddNameEn.style.display = lang === 'en' ? '' : 'none';
  const ddName = lang === 'hu' ? ddNameHu : ddNameEn;

  function unique(arr) {
    return [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  // Family dropdown always shows all families (top of hierarchy)
  buildDropdown(ddFamily, unique(plants.map(p => p.Family)), t('list.filter.allFamilies'));



  // Lightweight rebuild used when only the name filter changes (only variety depends on it)
  function rebuildVarietyDropdown() {
    const afterSeedbank= ddSeedbank.value ? plants.filter(p => p.Seedbank === ddFamily.value) : plants;
    const afterYear = ddYear.value  ? plants.filter(p => p.Year === ddGenus.value) : afterFamily;
    const afterLatin  = ddLatin.value  ? plants.filter(p => p.LatinName === ddLatin.value) : afterGenus;
    const afterName   = ddName.value   ? plants.filter(p => p[nameField] === ddName.value) : afterLatin;
    buildDropdown(ddVariety, unique(afterName.flatMap(p => splitPipe(p.Name_Variety))), t('list.filter.allVarieties'));
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

  if (yearParam)  { ddYear.value = yearParam;  rebuildDependentDropdowns(); }
  if (seedbankParam)   { ddSeedbank.value  = seedbanksParam;   rebuildDependentDropdowns(); }
  if (latinParam)   { ddLatin.value  = latinParam;   rebuildDependentDropdowns(); }
  if (lang === 'hu' && nameHuParam) { ddNameHu.value = nameHuParam; rebuildDependentDropdowns(); }
  if (lang === 'en' && nameEnParam) { ddNameEn.value = nameEnParam; rebuildDependentDropdowns(); }
  if (varietyParam) { ddVariety.value = varietyParam; }


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
