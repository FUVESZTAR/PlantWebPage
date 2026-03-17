import { loadPlantData } from "./csv-utils.js";

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

    // Populate plant selector with unique Name_HU values (sorted alphabetically)
    selector.innerHTML = '<option value="">Select a plant</option>';
    const uniqueNames = [...new Set(plants.map(p => p.Name_HU).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
    uniqueNames.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      selector.appendChild(opt);
    });

    fillUniqueSelector(familySelector, plants.map(p => p.Family), "All families");
    fillUniqueSelector(genusSelector, plants.map(p => p.Genus), "All genera");
    fillUniqueSelector(latinSelector, plants.map(p => p.LatinName), "All latin names");
  } catch (err) {
    console.error(err);
    errorMsg.textContent = "Failed to load plant data";
    selector.innerHTML = '<option value="">(error)</option>';
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

    // Find all rows for the selected Name_HU and add their varieties
    const matchingPlants = plants.filter(p => p.Name_HU === selectedName);
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

    // Use selected variety's Nr, or fall back to the Species row for this Name_HU
    let targetNr = varietySelector.value;
    if (!targetNr) {
      const speciesPlant = plants.find(
        p => p.Name_HU === selectedName && String(p.Name_Variety).trim() === "Species"
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
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", populate);
} else {
  populate();
}
