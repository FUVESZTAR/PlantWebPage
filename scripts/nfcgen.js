import { loadPlantData, splitPipe, monthsFromValue } from "./csv-utils.js";

async function populate() {
  const selector = document.getElementById("plant-selector");
  const gennfcBtn = document.getElementById("generate-nfc");
  const errorMsg = document.getElementById("error-message");

  //gennfcBtn.disabled = true;

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

 // selector.addEventListener("change", () => {
 //   gennfcBtn.disabled = !selector.value;
 // });
      // Set NFC link
    // Set NFC link text to current page URL (could also keep plant:// scheme if needed)
    document.querySelector("#nfc-link").textContent = `${plant.Nr}  / ${plant.Name_HU || ""} / ${plant.Name_Variety || ""} / ${plant.LatinName || ""} / ${window.location.href}`;

  openBtn.addEventListener("click", () => {
    if (selector.value) {
      localStorage.setItem("selectedPlantNr", selector.value);
      // Find the selected plant to get LatinName for direct linking
      const selectedPlant = plants.find((p) => p.Nr === selector.value);
      if (selectedPlant && selectedPlant.LatinName) {
        console.log("Navigating with LatinName:", selectedPlant.LatinName);
        window.location.href = `PlantInfoPage.html?plant=${encodeURIComponent(selectedPlant.LatinName)}`;
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
