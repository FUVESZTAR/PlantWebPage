import { loadPlantData } from "./csv-utils.js";

// Add at the end of scripts/home.js
document.querySelector('#nfc-button').addEventListener('click', () => {
  window.location.href = 'Nfcgenerator.html';
});


async function populate() {
  const selector = document.getElementById("plant-selector");
  const openBtn = document.getElementById("open-view");
  const nfcBtn = document.getElementById("nfc-button");
  const errorMsg = document.getElementById("error-message");

  openBtn.disabled = true;
  nfcBtn.disabled = true;

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
  } catch (err) {
    console.error(err);
    errorMsg.textContent = "Failed to load plant data";
    selector.innerHTML = '<option value="">(error)</option>';
  }

  selector.addEventListener("change", () => {
    openBtn.disabled = !selector.value;
    nfcBtn.disabled = !selector.value;
  });

  openBtn.addEventListener("click", () => {
    if (selector.value) {
      localStorage.setItem("selectedPlantNr", selector.value);
      // Find the selected plant to get LatinName for direct linking
      const selectedPlant = plants.find((p) => String(p.Nr) === selector.value);
      if (selectedPlant && selectedPlant.LatinName && selectedPlant.NameVariety) {
        console.log("Navigating with LatinName:", selectedPlant.LatinName);
        window.location.href = `PlantInfoPage.html?plant=${encodeURIComponent(selectedPlant.LatinName)}&variety=${encodeURIComponent(selectedPlant.Name_Variety)}`;
      } else {
        console.warn("Plant not found or no LatinName");
        window.location.href = "PlantInfoPage.html";
      }
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", populate);
} else {
  populate();
}
