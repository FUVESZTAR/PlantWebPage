import { loadPlantData } from "./csv-utils.js";

// ── Google Apps Script Web App configuration ─────────────────────────────────
// Deploy scripts/sheetwriter.js as a Google Apps Script Web App and paste the
// resulting URL below.  Also set the same SECRET_KEY in Script Properties.
// See scripts/sheetwriter.js for full deployment instructions.
//
// Security note: SHEET_WRITER_SECRET is visible in page source.  It provides
// write-only authorization (no data can be read via this key) and is combined
// with rate limiting and input validation in the Apps Script to prevent abuse.
// Keep the SECRET_KEY long and random; treat the Web App URL as semi-private.
const SHEET_WRITER_URL    = 'https://script.google.com/macros/s/AKfycbysWB68AM6TKlobnA3MLR_18LpJjGVkHolPf3G_WNziV3r93_fztJIenTVSoll-Kmtp/exec';
const SHEET_WRITER_SECRET = '159753g9d5rt4Ht4eg7e5z4d6szo89fsef';
// ─────────────────────────────────────────────────────────────────────────────

let plantData = [];
let selectedPlantIndex = null;
let selectedVarietyData = null;
let customVarietyMode = false;
let plantId = 1;

/**
 * Fetches the last value from column A of the NFC list sheet via the
 * Apps Script Web App and pre-fills the NFC ID input.
 */
async function loadLastNfcId(plantIdInput) {
  if (SHEET_WRITER_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL') return;
  try {
    const response = await fetch(SHEET_WRITER_URL, { redirect: 'follow' });
    const result   = await response.json();
    if (result.lastId !== undefined && result.lastId !== '') {
      plantIdInput.value = result.lastId;
    }
  } catch (err) {
    console.warn('Could not load last NFC ID:', err.message);
  }
}

async function populate() {
  const selector = document.getElementById("plant-selector");
  const nrInput = document.getElementById("nr");
  const plantIdInput = document.getElementById("plantId");
  const datumInput = document.getElementById("datum");
  let nameHuInput = "";
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
  const saveNfcBtn = document.getElementById("save-nfc");
  const errorMsg = document.getElementById("error-message");

  let plants = [];

  try {
    plants = await loadPlantData();
    plantData = plants;
    console.log("Plants loaded:", plants.length, "plants");
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
  } catch (err) {
    console.error(err);
    errorMsg.textContent = "Failed to load plant data";
    selector.innerHTML = '<option value="">(error)</option>';
    return;
  }

  // Pre-fill NFC ID with the last value from column A of the NFC list sheet
  loadLastNfcId(plantIdInput);

  // Set current date
  const today = new Date();
  const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
  datumInput.value = dateString;

  // Plant selector change event
  selector.addEventListener("change", () => {
    const nameValue = selector.value;
    console.log("Plant selected, value:", nameValue);
    
    if (nameValue === "") {
      clearForm();
      selectedPlantIndex = null;
      selectedVarietyData = null;
      customVarietyMode = false;
      nameVarietyCustomInput.style.display = "none";
      return;
    }
    
    // Find the Species plant for this Name_HU, or fall back to the first match
    const speciesPlant = plants.find(p => p.Name_HU === nameValue && (p.Name_Variety || "").trim() === "Species");
    const plant = speciesPlant || plants.find(p => p.Name_HU === nameValue);
    
    console.log("Selected plant:", plant);
    
    if (plant) {
      selectedPlantIndex = plants.indexOf(plant);
      // Fill form fields
      nrInput.value = plant.Nr || "";
      nameHuInput = plant.Name_HU || "";
      latinNameInput.value = plant.LatinName || "";
      datumInput.value = dateString;
      nfctypInput.value = plant.nfctyp || "";
      egyebInput.value = plant.egyeb || "";
    }
    
    // Populate varieties dropdown based on Name_HU
    populateVarieties(nameValue);
    
    updatePreviews();
  });

  // Populate varieties dropdown
  function populateVarieties(nameHU) {
    console.log("Populating varieties for Name_HU:", nameHU);
    nameVarietySelector.innerHTML = '<option value="">Select a variety...</option><option value="__custom__">-- Add custom --</option>';
    customVarietyMode = false;
    nameVarietyCustomInput.style.display = "none";
    nameVarietyCustomInput.value = "";
    
    if (!nameHU) {
      console.log("No Name_HU provided");
      return;
    }
    
    // Find all plants with same Name_HU
    const varietiesSet = new Set();
    
    plants.forEach((plant, idx) => {
      if (plant.Name_HU === nameHU) {
        const variety = (plant.Name_Variety || "").trim();
        if (variety && !varietiesSet.has(variety)) {
          varietiesSet.add(variety);
          const opt = document.createElement("option");
          opt.value = idx;
          opt.textContent = variety;
          nameVarietySelector.appendChild(opt);
        }
      }
    });
    
    console.log("Found varieties:", varietiesSet.size);
    
    // Default to "Species" variety when available
    const speciesOption = Array.from(nameVarietySelector.options).find(opt => opt.textContent === "Species");
    if (speciesOption) {
      nameVarietySelector.value = speciesOption.value;
      nameVarietySelector.dispatchEvent(new Event('change'));
    }
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
      nameHuInput = varietyPlant.Name_HU || "";
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
  [nrInput, plantIdInput, latinNameInput, datumInput, nfctypInput, egyebInput].forEach(input => {
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
    const nameHu = nameHuInput;
    const nameVariety = getVarietyText();
    const latinName = latinNameInput.value;
    const datum = datumInput.value;
    const nfctyp = nfctypInput.value;
    const egyeb = egyebInput.value;
    let link = "";
    if (nr) {
      const baseUrl = window.location.origin;
      link = `${baseUrl}/W/P.html?id=${encodeURIComponent(nr)}`;
      linkPreview.textContent = link;
    }
    
    const nfcData = `${nr}/${id2}/${nameHu}/${nameVariety}/${latinName}/${nfctyp}/${datum}/${egyeb}`;
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
    window.location.href = "HomePage.html";
  });

  // Save NFC button – appends a row to the nfc_list sheet via the Apps Script Web App
  saveNfcBtn.addEventListener("click", async () => {
    const nfcData = nfcPreview.textContent;
    const link    = linkPreview.textContent;
    const nfcId   = plantIdInput.value;

    if (nfcData === "NFC data will appear here...") {
      showError("Please select a plant and generate NFC data first");
      return;
    }

    if (SHEET_WRITER_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL') {
      showError("Save is not configured: set SHEET_WRITER_URL in nfcgen.js");
      return;
    }

    saveNfcBtn.disabled = true;
    try {
      const response = await fetch(SHEET_WRITER_URL, {
        method: 'POST',
        // Apps Script Web Apps accept text/plain without a CORS preflight.
        // The body is still valid JSON, parsed by the Apps Script handler.
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ key: SHEET_WRITER_SECRET, nfcId, nfcData, link }),
        redirect: 'follow',
      });
      const result = await response.json().catch(() => ({}));
      if (result.status === 'success') {
        showError("NFC saved to list!", "success");
      } else {
        showError("Failed to save NFC: " + (result.error || "Unknown error"));
      }
    } catch (err) {
      showError("Failed to save NFC: " + err.message);
    } finally {
      saveNfcBtn.disabled = false;
    }
  });

  //save end

  function clearForm() {
    nrInput.value = "";
    plantIdInput.value = "";
    nameHuInput = "";
    nameVarietySelector.innerHTML = '<option value="">Select a variety...</option>';
    nameVarietyCustomInput.value = "";
    nameVarietyCustomInput.style.display = "none";
    latinNameInput.value = "";
    datumInput.value = dateString;
    nfctypInput.value = "n";
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

  // Pre-select plant and variety from URL params (when navigating from homepage)
  const params = new URLSearchParams(window.location.search);
  const paramName = params.get('name');
  const paramNr = params.get('nr');

  if (paramName) {
    selector.value = paramName;
    selector.dispatchEvent(new Event('change'));

    if (paramNr) {
      // Find the option whose plant has the matching Nr
      const matchOpt = Array.from(nameVarietySelector.options).find(opt => {
        if (!opt.value || opt.value === '__custom__') return false;
        const idx = parseInt(opt.value);
        return String(plants[idx]?.Nr) === paramNr;
      });
      if (matchOpt) {
        nameVarietySelector.value = matchOpt.value;
        nameVarietySelector.dispatchEvent(new Event('change'));
      }
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", populate);
} else {
  populate();
}

