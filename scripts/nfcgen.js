import { loadPlantData } from "./csv-utils.js";

let plantData = [];
let selectedPlantIndex = null;
let selectedVarietyData = null;
let customVarietyMode = false;
let plantId = 1;

async function populate() {
  const selector = document.getElementById("plant-selector");
  const nrInput = document.getElementById("nr");
  const plantIdInput = document.getElementById("plantId");
  const datumInput = document.getElementById("datum");
  const nameHuInput = document.getElementById("name-hu");
  const nameVarietySelector = document.getElementById("name-variety");
  const nameVarietyCustomInput = document.getElementById("name-variety-custom");
  const latinNameInput = document.getElementById("latin-name");
  const nfctypInput = document.getElementById("nfctyp");
  const egyebInput = document.getElementById("egyeb");
  const nfcPreview = document.getElementById("nfc-preview");
  const nfcSize = document.getElementById("nfc-size");
  const linkPreview = document.getElementById("link-preview");
  const linkSize = document.getElementById("link-size");
  const totalSize = document.getElementById("total-size");
  const gennfcBtn = document.getElementById("generate-nfc");
  const copynfcBtn = document.getElementById("copy-nfc");
  const copylinkBtn = document.getElementById("copy-link");
  const backBtn = document.getElementById("back-button");
  const errorMsg = document.getElementById("error-message");

  let plants = [];

  try {
    plants = await loadPlantData();
    plantData = plants;
    console.log("Plants loaded:", plants.length, "plants");
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

  // Set current date
  const today = new Date();
  const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
  datumInput.value = dateString;

  // Plant selector change event
  selector.addEventListener("change", () => {
    const indexValue = selector.value;
    console.log("Plant selected, value:", indexValue);
    
    if (indexValue === "") {
      clearForm();
      selectedPlantIndex = null;
      selectedVarietyData = null;
      customVarietyMode = false;
      nameVarietyCustomInput.style.display = "none";
      return;
    }
    
    const index = parseInt(indexValue);
    selectedPlantIndex = index;
    const plant = plants[index];
    
    console.log("Selected plant:", plant);
    
    // Fill form fields
    nrInput.value = plant.Nr || "";
    nameHuInput.value = plant.Name_HU || "";
    latinNameInput.value = plant.LatinName || "";
    datumInput.value = dateString;
    nfctypInput.value = plant.nfctyp || "";
    egyebInput.value = plant.egyeb || "";
    
    // Populate varieties dropdown based on latin name
    populateVarieties(plant.LatinName);
    
    updatePreviews();
  });

  // Populate varieties dropdown
  function populateVarieties(latinName) {
    console.log("Populating varieties for Latin name:", latinName);
    nameVarietySelector.innerHTML = '<option value="">Select a variety...</option><option value="__custom__">-- Add custom --</option>';
    customVarietyMode = false;
    nameVarietyCustomInput.style.display = "none";
    nameVarietyCustomInput.value = "";
    
    if (!latinName) {
      console.log("No Latin name provided");
      return;
    }
    
    // Find all plants with same Latin name
    const varietiesSet = new Set();
    const varietiesData = [];
    
    plants.forEach((plant, idx) => {
      if (plant.LatinName === latinName) {
        const variety = (plant.Name_Variety || "").trim();
        if (variety && !varietiesSet.has(variety)) {
          varietiesSet.add(variety);
          varietiesData.push({
            variety: variety,
            index: idx,
            data: plant
          });
        }
      }
    });
    
    console.log("Found varieties:", varietiesData);
    
    // Add varieties to dropdown
    varietiesData.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.index;
      opt.textContent = item.variety;
      nameVarietySelector.appendChild(opt);
    });
  }

  // Variety selector change event
  nameVarietySelector.addEventListener("change", () => {
    const value = nameVarietySelector.value;
    console.log("Variety selected, value:", value);
    
    if (value === "") {
      // Clear variety selection
      selectedVarietyData = null;
      customVarietyMode = false;
      nameVarietyCustomInput.style.display = "none";
      nameVarietyCustomInput.value = "";
      updatePreviews();
      return;
    }
    
    if (value === "__custom__") {
      // Allow custom text input
      customVarietyMode = true;
      selectedVarietyData = null;
      nameVarietyCustomInput.style.display = "block";
      nameVarietyCustomInput.value = "";
      nameVarietyCustomInput.focus();
      updatePreviews();
      return;
    }
    
    // Load data from selected variety row
    customVarietyMode = false;
    nameVarietyCustomInput.style.display = "none";
    nameVarietyCustomInput.value = "";
    
    const varietyIndex = parseInt(value);
    const varietyPlant = plants[varietyIndex];
    
    console.log("Selected variety plant:", varietyPlant);
    
    if (varietyPlant) {
      selectedVarietyData = varietyPlant;
      
      // Update all fields from this variety's data
      nrInput.value = varietyPlant.Nr || "";
      nameHuInput.value = varietyPlant.Name_HU || "";
      latinNameInput.value = varietyPlant.LatinName || "";
      datumInput.value = dateString;
      nfctypInput.value = varietyPlant.nfctyp || "";
      egyebInput.value = varietyPlant.egyeb || "";
      
      updatePreviews();
    }
  });

  // Custom variety input change event
  nameVarietyCustomInput.addEventListener("change", updatePreviews);
  nameVarietyCustomInput.addEventListener("input", updatePreviews);

  // Input change events - update previews
  [nrInput, plantIdInput, nameHuInput, latinNameInput, datumInput, nfctypInput, egyebInput].forEach(input => {
    input.addEventListener("change", updatePreviews);
    input.addEventListener("input", updatePreviews);
  });

  function updatePreviews() {
    updateNFCPreview();
  }

  function getVarietyText() {
    if (customVarietyMode && nameVarietyCustomInput.value) {
      return nameVarietyCustomInput.value;
    } else {
      return nameVarietySelector.options[nameVarietySelector.selectedIndex]?.text || 
             nameVarietySelector.value;
    }
  }
  function calculateSizeInBytes(text) {
  // Calculate size in bytes (UTF-8 encoding) - returns NUMBER
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  return bytes.length;
   }

function formatSize(sizeInBytes) {
  // Convert bytes to appropriate unit - returns STRING
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  } else if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(2)} KB`;
  } else {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  }
 }

function calculateSize(text) {
  // Kept for backward compatibility - returns STRING
  return formatSize(calculateSizeInBytes(text));
}

  function updateNFCPreview() {
    const nr = nrInput.value;
    const id2 = plantIdInput.value;
    const nameHu = nameHuInput.value;
    const nameVariety = getVarietyText();
    const latinName = latinNameInput.value;
    const datum = datumInput.value;
    const nfctyp = nfctypInput.value;
    const egyeb = egyebInput.value;
    let link = "";
    if (latinName && nameVariety) {
      const baseUrl = window.location.origin;
      link = `${baseUrl}/PlantWebPage/PlantInfoPage.html?plant=${encodeURIComponent(latinName)}&variety=${encodeURIComponent(nameVariety)}`;
      linkPreview.textContent = link;
    }
    
    const nfcData = `${nr} / ${id2} / ${nameHu} / ${nameVariety} / ${latinName} / ${nfctyp} /${datum} / ${egyeb}`;
    nfcPreview.textContent = nfcData;
    
    // Update size indicator
    if (nfcSize) {
      const linkSizeBytes = calculateSizeInBytes(link);
      const nfcSizeBytes = calculateSizeInBytes(nfcData);
      const totalSizeBytes = linkSizeBytes + nfcSizeBytes;
      nfcSize.textContent = `Size: ${formatSize(nfcSizeBytes)}`;
      totalSize.textContent = `Total Size: ${formatSize(totalSizeBytes)}`;
      linkSize.textContent = `Size: ${formatSize(linkSizeBytes)}`;
    } else {
      linkPreview.textContent = "Link will appear here...";
      nfcPreview.textContent = "NFC will appear here...";
      if (linkSize) {
        nfcSize.textContent = "Size: 0 B";
        linkSize.textContent = "Size: 0 B";
        totalSize.textContent = "Size: 0 B";
      }
    }   
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

  // Copy Link button
  copylinkBtn.addEventListener("click", () => {
    const link = linkPreview.textContent;
    
    if (link === "Link will appear here..." || !link) {
      showError("No link to copy");
      return;
    }
    
    navigator.clipboard.writeText(link).then(() => {
      showError("Link copied to clipboard!", "success");
    }).catch(err => {
      showError("Failed to copy link: " + err.message);
    });
  });

  // Back button
  backBtn.addEventListener("click", () => {
    window.history.back();
  });

  function clearForm() {
    nrInput.value = "";
    plantIdInput.value = "";
    nameHuInput.value = "";
    nameVarietySelector.innerHTML = '<option value="">Select a variety...</option>';
    nameVarietyCustomInput.value = "";
    nameVarietyCustomInput.style.display = "none";
    latinNameInput.value = "";
    datumInput.value = dateString;
    nfctypInput.value = "";
    egyebInput.value = "";
    nfcPreview.textContent = "NFC data will appear here...";
    nfcSize.textContent = "Size: 0 B";
    linkPreview.textContent = "Link will appear here...";
    linkSize.textContent = "Size: 0 B";
    totalSize.textContent = "Size: 0 B";
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

  // Set current date on load
//  yearInput.value = new Date().getFullYear();
  datumInput.value = dateString;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", populate);
} else {
  populate();
}
