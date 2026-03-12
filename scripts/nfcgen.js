import { loadPlantData } from "./csv-utils.js";

let plantData = [];
let selectedPlantIndex = null;

async function populate() {
  const selector = document.getElementById("plant-selector");
  const nrInput = document.getElementById("nr");
  const yearInput = document.getElementById("year");
  const nameHuInput = document.getElementById("name-hu");
  const nameVarietyInput = document.getElementById("name-variety");
  const latinNameInput = document.getElementById("latin-name");
  const datumInput = document.getElementById("datum");
  const nfctypInput = document.getElementById("nfctyp");
  const egyebInput = document.getElementById("egyeb");
  const nfcPreview = document.getElementById("nfc-preview");
  const gennfcBtn = document.getElementById("generate-nfc");
  const copynfcBtn = document.getElementById("copy-nfc");
  const backBtn = document.getElementById("back-button");
  const errorMsg = document.getElementById("error-message");

  let plants = [];

  try {
    plants = await loadPlantData();
    plantData = plants;
    selector.innerHTML = '<option value="">Select a plant</option>';
    plants
      .sort((a, b) => Number(a.Nr) - Number(b.Nr))
      .forEach((plant, index) => {
        const opt = document.createElement("option");
        opt.value = index;
        opt.textContent = `${plant.Nr}. ${plant.Name_HU || ""}`;
        selector.appendChild(opt);
      });
  } catch (err) {
    console.error(err);
    errorMsg.textContent = "Failed to load plant data";
    selector.innerHTML = '<option value="">(error)</option>';
    return;
  }

  // Plant selector change event
  selector.addEventListener("change", () => {
    const index = parseInt(selector.value);
    if (index === "") {
      clearForm();
      selectedPlantIndex = null;
      return;
    }
    
    selectedPlantIndex = index;
    const plant = plants[index];
    
    // Fill form fields
    nrInput.value = plant.Nr || "";
    yearInput.value = new Date().getFullYear();
    nameHuInput.value = plant.Name_HU || "";
    nameVarietyInput.value = plant.Name_Variety || "";
    latinNameInput.value = plant.LatinName || "";
    datumInput.value = plant.datum || "";
    nfctypInput.value = plant.nfctyp || "";
    egyebInput.value = plant.egyeb || "";
    
    updateNFCPreview();
  });

  // Input change events - update NFC preview
  [nrInput, yearInput, nameHuInput, nameVarietyInput, latinNameInput, datumInput, nfctypInput, egyebInput].forEach(input => {
    input.addEventListener("change", updateNFCPreview);
    input.addEventListener("input", updateNFCPreview);
  });

  function updateNFCPreview() {
    const nr = nrInput.value;
    const year = yearInput.value;
    const nameHu = nameHuInput.value;
    const nameVariety = nameVarietyInput.value;
    const latinName = latinNameInput.value;
    const datum = datumInput.value;
    const nfctyp = nfctypInput.value;
    const egyeb = egyebInput.value;
    
    let plantInfoUrl = "";
    if (selectedPlantIndex !== null) {
      const baseUrl = window.location.origin;
      plantInfoUrl = `${baseUrl}/PlantInfoPage.html?plant=${selectedPlantIndex}`;
    }
    
    const nfcData = `${nr} / ${year} / ${nameHu} / ${nameVariety} / ${latinName} / ${datum} / ${nfctyp} / ${plantInfoUrl} / ${egyeb}`;
    nfcPreview.textContent = nfcData;
  }

  // Generate NFC button
  gennfcBtn.addEventListener("click", () => {
    const nfcData = nfcPreview.textContent;
    
    if (nfcData === "NFC data will appear here...") {
      showError("Please select a plant and configure the NFC data");
      return;
    }
    
    const encodedData = encodeURIComponent(nfcData);
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}`;
    
    const win = window.open(qrCodeUrl, "_blank");
    if (!win) {
      showError("Failed to open QR code. Please check your popup blocker.");
    } else {
      showError("QR code opened in new tab", "success");
    }
  });

  // Copy NFC Data button
  copynfcBtn.addEventListener("click", () => {
    const nfcData = nfcPreview.textContent;
    
    if (nfcData === "NFC data will appear here...") {
      showError("No NFC data to copy");
      return;
    }
    
    navigator.clipboard.writeText(nfcData).then(() => {
      showError("NFC data copied to clipboard!", "success");
    }).catch(err => {
      showError("Failed to copy NFC data: " + err.message);
    });
  });

  // Back button
  backBtn.addEventListener("click", () => {
    window.history.back();
  });

  function clearForm() {
    nrInput.value = "";
    yearInput.value = new Date().getFullYear();
    nameHuInput.value = "";
    nameVarietyInput.value = "";
    latinNameInput.value = "";
    datumInput.value = "";
    nfctypInput.value = "";
    egyebInput.value = "";
    nfcPreview.textContent = "NFC data will appear here...";
  }

  function showError(message, type = "error") {
    errorMsg.textContent = message;
    errorMsg.style.color = type === "success" ? "green" : "red";
    errorMsg.style.display = "block";
    
    if (type === "success") {
      setTimeout(() => {
        errorMsg.textContent = "";
        errorMsg.style.display = "none";
      }, 3000);
    }
  }

  // Set current year on load
  yearInput.value = new Date().getFullYear();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", populate);
} else {
  populate();
}
