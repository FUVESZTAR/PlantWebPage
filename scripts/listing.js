import { loadPlantData } from "./csv-utils.js";
import { t, setupLanguageButtons } from "./lang.js";

document.getElementById("back-button").addEventListener("click", () => {
  window.location.href = "Homepage.html";
});

function getFilterLabels() {
  return {
    family: t('list.filter.family'),
    genus: t('list.filter.genus'),
    latin: t('list.filter.latin'),
  };
}


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
      <td>${plant.Nr || ""}</td>
      <td>${plant.LatinName || ""}</td>
      <td>${plant.Name_Variety || ""}</td>
      <td>${plant.Name_EN || ""}</td>
      <td>${plant.Name_HU || ""}</td>
    `;
    tr.addEventListener("click", () => {
      localStorage.setItem("selectedPlantNr", plant.Nr);
      window.location.href = `P.html?id=${encodeURIComponent(plant.Nr)}`;
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

  // Populate dropdowns with unique sorted values from the full dataset
  const ddGenus = document.getElementById("dd-genus");
  const ddFamily = document.getElementById("dd-family");
  const ddLatin = document.getElementById("dd-latin");
  const ddVariety = document.getElementById("dd-variety");

  function unique(arr) {
    return [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  buildDropdown(ddGenus,   unique(plants.map(p => p.Genus)),        t('list.filter.allGenera'));
  buildDropdown(ddFamily,  unique(plants.map(p => p.Family)),       t('list.filter.allFamilies'));
  buildDropdown(ddLatin,   unique(plants.map(p => p.LatinName)),    t('list.filter.allLatinNames'));
  buildDropdown(ddVariety, unique(plants.map(p => p.Name_Variety)), t('list.filter.allVarieties'));

  // Set dropdown values from URL params so the user can see and change the initial filter
  const familyParam  = params.get("family")  || "";
  const genusParam   = params.get("genus")   || "";
  const latinParam   = params.get("latin")   || "";
  if (familyParam)  ddFamily.value = familyParam;
  if (genusParam)   ddGenus.value  = genusParam;
  if (latinParam)   ddLatin.value  = latinParam;

  function updateFilterSummary() {
    const parts = [];
    const FILTER_LABELS = getFilterLabels();
    if (ddFamily.value) parts.push(`${FILTER_LABELS.family}: ${ddFamily.value}`);
    if (ddGenus.value)  parts.push(`${FILTER_LABELS.genus}: ${ddGenus.value}`);
    if (ddLatin.value)  parts.push(`${FILTER_LABELS.latin}: ${ddLatin.value}`);
    filterSummary.textContent = parts.length ? parts.join(" | ") : t('list.allPlants');
  }

  function applyDropdownFilters() {
    const genus   = ddGenus.value;
    const family  = ddFamily.value;
    const latin   = ddLatin.value;
    const variety = ddVariety.value;

    const result = plants.filter((p) => {
      if (genus   && (p.Genus        || "") !== genus)   return false;
      if (family  && (p.Family       || "") !== family)  return false;
      if (latin   && (p.LatinName    || "") !== latin)   return false;
      if (variety && (p.Name_Variety || "") !== variety) return false;
      return true;
    });
    updateFilterSummary();
    renderRows(result);
  }

  ddGenus.addEventListener("change", applyDropdownFilters);
  ddFamily.addEventListener("change", applyDropdownFilters);
  ddLatin.addEventListener("change", applyDropdownFilters);
  ddVariety.addEventListener("change", applyDropdownFilters);

  applyDropdownFilters();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => { setupLanguageButtons(); populate(); });
} else {
  setupLanguageButtons();
  populate();
}

