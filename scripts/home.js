import { loadPlantData } from "./csv-utils.js";
import { t, getCurrentLang, setupLanguageButtons } from "./lang.js";

document.querySelector('#nfc-button').addEventListener('click', () => {
  const nameEl = document.getElementById('plant-selector');
  const varEl = document.getElementById('plant-selector-variety');
  const name = nameEl ? nameEl.value : '';
  const nr = varEl ? varEl.value : '';
  let url = 'Nfcgenerator.html';
  if (name) {
    url += `?name=${encodeURIComponent(name)}`;
    if (nr) url += `&nr=${encodeURIComponent(nr)}`;
  }
  window.location.href = url;
});


function fillUniqueSelector(selectEl, values, placeholder) {
  const sorted = [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  selectEl.innerHTML = `<option value="">${placeholder}</option>`;
  sorted.forEach((val) => {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = val;
    selectEl.appendChild(opt);
  });
}

async function populate() {
  const selector = document.getElementById("plant-selector");
  const varietySelector = document.getElementById("plant-selector-variety");
  const familySelector = document.getElementById("plant-selector-family");
  const genusSelector = document.getElementById("plant-selector-genus");
  const latinSelector = document.getElementById("plant-selector-latin");
  const openBtn = document.getElementById("open-view");
  const nfcBtn = document.getElementById("nfc-button");
  const listBtn = document.getElementById("plant-list-btn");
  const errorMsg = document.getElementById("error-message");

  openBtn.disabled = true;
  nfcBtn.disabled = false;
  varietySelector.disabled = true;
  if (listBtn) listBtn.disabled = true;

  let plants = []; // Declare plants outside try block so it's accessible in event handlers

  try {
    plants = await loadPlantData();
    // Keep only plants that are active on the page
    plants = plants.filter(p => p.Active_in_page === 'Y');
    console.log("loading plants in home.js");
    // Use Name_HU for Hungarian, Name_EN for English
    const lang = getCurrentLang();
    const nameProp = lang === 'en' ? 'Name_EN' : 'Name_HU';

    // Populate plant selector with unique names (sorted alphabetically)
    selector.innerHTML = `<option value="">${t('home.placeholder.selectPlant')}</option>`;
    const uniqueNames = [...new Set(plants.map(p => p[nameProp]).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
    uniqueNames.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      selector.appendChild(opt);
    });

    fillUniqueSelector(familySelector, plants.map(p => p.Family), t('home.placeholder.allFamilies'));
    fillUniqueSelector(genusSelector, plants.map(p => p.Genus), t('home.placeholder.allGenera'));
    fillUniqueSelector(latinSelector, plants.map(p => p.LatinName), t('home.placeholder.allLatinNames'));
  } catch (err) {
    console.error(err);
    errorMsg.textContent = t('home.error.loadFailed');
    selector.innerHTML = `<option value="">${t('home.error.option')}</option>`;
  }

  function populateVarietiesForSelection() {
    varietySelector.innerHTML = '';

    const selectedName = selector.value;
    if (!selectedName) {
      varietySelector.disabled = true;
      openBtn.disabled = true;
      nfcBtn.disabled = false;
      return;
    }

    // Find all rows for the selected name and add their varieties
    const lang = getCurrentLang();
    const nameProp = lang === 'en' ? 'Name_EN' : 'Name_HU';
    const matchingPlants = plants.filter(p => p[nameProp] === selectedName);
    const seenVarieties = new Set();
    matchingPlants.forEach((plant) => {
      const variety = (plant.Name_Variety || "").trim();
      if (!variety || seenVarieties.has(variety)) return;
      seenVarieties.add(variety);

      const option = document.createElement("option");
      option.value = String(plant.Nr);
      option.textContent = variety;
      varietySelector.appendChild(option);
    });

    // Default to "Species" variety when available
    const speciesOption = Array.from(varietySelector.options).find(opt => opt.textContent === "Species");
    if (speciesOption) {
      varietySelector.value = speciesOption.value;
    }

    varietySelector.disabled = false;
    openBtn.disabled = false;
    nfcBtn.disabled = false;
  }

  selector.addEventListener("change", populateVarietiesForSelection);

  varietySelector.addEventListener("change", () => {
    openBtn.disabled = !selector.value;
    nfcBtn.disabled = false;
  });

  openBtn.addEventListener("click", () => {
    const selectedName = selector.value;
    if (!selectedName) return;

    // Use selected variety's Nr, or fall back to the Species row for this name
    let targetNr = varietySelector.value;
    if (!targetNr) {
      const lang = getCurrentLang();
      const nameProp = lang === 'en' ? 'Name_EN' : 'Name_HU';
      const speciesPlant = plants.find(
        p => p[nameProp] === selectedName && String(p.Name_Variety).trim() === "Species"
      );
      targetNr = speciesPlant ? String(speciesPlant.Nr) : null;
    }

    if (targetNr) {
      window.location.href = `P.html?id=${encodeURIComponent(targetNr)}`;
    } else {
      window.location.href = "P.html";
    }
  });

  function getActiveListFilter() {
    if (familySelector && familySelector.value) return { filterType: "family", filterValue: familySelector.value };
    if (genusSelector && genusSelector.value) return { filterType: "genus", filterValue: genusSelector.value };
    if (latinSelector && latinSelector.value) return { filterType: "latin", filterValue: latinSelector.value };
    return null;
  }

  function updateListBtn() {
    if (!listBtn) return;
    const active = getActiveListFilter();
    listBtn.disabled = !active;
  }

  [familySelector, genusSelector, latinSelector].forEach(sel => {
    if (sel) sel.addEventListener("change", updateListBtn);
  });

  if (listBtn) {
    listBtn.addEventListener("click", () => {
      const filter = getActiveListFilter();
      if (!filter) return;
      window.location.href = `PlantListPage.html?filterType=${encodeURIComponent(filter.filterType)}&filterValue=${encodeURIComponent(filter.filterValue)}`;
    });
  }

  const nfcListBtn = document.getElementById("nfc-list-btn");
  if (nfcListBtn) {
    nfcListBtn.addEventListener("click", () => {
      window.location.href = "NFCListPage.html";
    });
  }
  const SMBtn = document.getElementById("shadow-map-btn");
  if (SMBtn) {
    SMBtn.addEventListener("click", () => {
      window.location.href = "Shadowmap.html";
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => { setupLanguageButtons(); populate(); });
} else {
  setupLanguageButtons();
  populate();
}
