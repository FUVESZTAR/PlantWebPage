import { loadPlantData } from "./csv-utils.js";

// Add at the end of scripts/home.js
document.querySelector('#nfc-button').addEventListener('click', () => {
  window.location.href = 'Nfcgenerator.html';
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
  nfcBtn.disabled = true;
  varietySelector.disabled = true;
  if (listBtn) listBtn.disabled = true;

  let plants = []; // Declare plants outside try block so it's accessible in event handlers

  try {
    plants = await loadPlantData();
    selector.innerHTML = '<option value="">Select a plant</option>';
    plants
      .sort((a, b) => Number(a.Nr) - Number(b.Nr))
      .forEach((plant) => {
        const opt = document.createElement("option");
        opt.value = plant.Nr;
        opt.textContent = `${plant.Nr}.${plant.Name_HU || ""}`;
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
    varietySelector.innerHTML = '<option value="">Select a variety</option>';

    if (!selector.value) {
      varietySelector.disabled = true;
      openBtn.disabled = true;
      nfcBtn.disabled = true;
      return;
    }

    varietySelector.disabled = false;

    const selectedPlant = plants.find((p) => String(p.Nr) === selector.value);
    const latinName = selectedPlant?.LatinName || "";
    const seenVarieties = new Set();

    if (latinName) {
      plants
        .filter((p) => (p.LatinName || "") === latinName)
        .forEach((plant) => {
          const variety = (plant.Name_Variety || "").trim();
          if (!variety || seenVarieties.has(variety)) return;
          seenVarieties.add(variety);

          const option = document.createElement("option");
          option.value = String(plant.Nr);
          option.textContent = variety;
          varietySelector.appendChild(option);
        });
    }

    openBtn.disabled = false;
    nfcBtn.disabled = false;
  }

  selector.addEventListener("change", populateVarietiesForSelection);

  varietySelector.addEventListener("change", () => {
    if (!varietySelector.value) return;

    const selectedVarietyPlant = plants.find((p) => String(p.Nr) === varietySelector.value);
    if (selectedVarietyPlant?.Nr) {
      selector.value = String(selectedVarietyPlant.Nr);
      openBtn.disabled = false;
      nfcBtn.disabled = false;
    }
  });

  openBtn.addEventListener("click", () => {
    const targetNr = varietySelector.value || selector.value;
    if (targetNr) {
      localStorage.setItem("selectedPlantNr", targetNr);
      const selectedPlant = plants.find((p) => String(p.Nr) === String(targetNr));
      if (selectedPlant && selectedPlant.Nr) {
        console.log("Navigating with Nr:", selectedPlant.Nr);
        window.location.href = `P.html?id=${encodeURIComponent(selectedPlant.Nr)}`;
      } else {
        console.warn("Plant not found or no Nr");
        window.location.href = "P.html";
      }
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
