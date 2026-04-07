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
let nfcIdValue =0;
let gpsPacket =null;
const nfcIdInput = document.getElementById("plantId");
const gpsStartBtn = document.getElementById('gpsStartBtn');
const gpsStopBtn = document.getElementById('gpsStopBtn');
const liveDot = document.getElementById('liveDot');
const gpsDispLat = document.getElementById('gpsDispLat');
const gpsDispLon = document.getElementById('gpsDispLon');
const gpsDispAlt = document.getElementById('gpsDispAlt');
const gpsDispAcc = document.getElementById('gpsDispAcc');
const updateTimer = document.getElementById('updateTimer');
const posPacketOut = document.getElementById('posPacketOut');
const posPacketSize = document.getElementById('posPacketSize');
                
const gpsStatus = document.getElementById('gpsStatus');
//gps
        let currentData = { lat: 0, lon: 0, alt: 0 };
        let lastUpdateTime = Date.now();
        let timerInterval;
        let watchId = null;
//gps

        function packBase64(lat, lon, alt) {
            const latInt = Math.round((lat + 90) * 1000000); 
            const lonInt = Math.round((lon + 180) * 1000000);
            const altInt = Math.round(alt + 1000);

            const buffer = new ArrayBuffer(10);
            const view = new DataView(buffer);
            view.setUint32(0, latInt); 
            view.setUint32(4, lonInt); 
            view.setUint16(8, altInt); 

            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
            return btoa(binary);
        }
//gps
        function unpackBase64(b64) {
            try {
                const binary = atob(b64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                const view = new DataView(bytes.buffer);
                return {
                    lat: (view.getUint32(0) / 1000000 - 90).toFixed(6),
                    lon: (view.getUint32(4) / 1000000 - 180).toFixed(6),
                    alt: view.getUint16(8) - 1000
                };
            } catch (e) { return null; }
        }
//gps
        function startLiveCapture() {
           console.log("Start");
            if (watchId) navigator.geolocation.clearWatch(watchId);
            
            gpsStartBtn.style.display = "none";
            gpsStopBtn.style.display = "block";
            liveDot.style.display = "inline";
            setStatus("Fetching GPS satellites...", "orange");

            const options = { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 };

            watchId = navigator.geolocation.watchPosition((pos) => {
                lastUpdateTime = Date.now();
                currentData.lat = pos.coords.latitude;
                currentData.lon = pos.coords.longitude;
                currentData.alt = pos.coords.altitude || 0;
                const acc = pos.coords.accuracy;

                gpsDispLat.innerText = currentData.lat.toFixed(6);
                gpsDispLon.innerText = currentData.lon.toFixed(6);
                gpsDispAlt.innerText = Math.round(currentData.alt) + "m";
                gpsDispAcc.innerText = Math.round(acc) + "m";

                setStatus(`Updating... (${Math.round(acc)}m accuracy)`, "#0056b3");

            }, (err) => setStatus("GPS Error: " + err.message, "red"), options);

            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                const seconds = Math.floor((Date.now() - lastUpdateTime) / 1000);
                updateTimer.innerText = `Last improvement: ${seconds}s ago`;
            }, 1000);
        }

        function stopLiveCapture() {
            console.log("Stop");
            if (watchId) {
                navigator.geolocation.clearWatch(watchId);
                watchId = null;
            }
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }

                //calculation
                const b64 = packBase64(currentData.lat, currentData.lon, currentData.alt);
                const gpstext = `L:${b64}`;
                posPacketOut.innerText = gpstext;
                posPacketSize.innerText = `Size: ${b64.length} bytes`;
                
            gpsStartBtn.style.display = "block";
            gpsStartBtn.innerText = "Restart Tracking";
            gpsStopBtn.style.display = "none";
            liveDot.style.display = "none";
            updateTimer.innerText = "Status: Data Locked";
 
            setStatus("Tracking Stopped. Data preserved.", "#333");
            gpsPacket=gpstext;
        }
/*
        async function writeNFC() {
            if (!('NDEFReader' in window)) return setStatus("NFC not supported", "red");
            const b64 = posPacketOut.innerText;
            try {
                const ndef = new NDEFReader();
                setStatus("TAP NFC TAG NOW", "blue");
                await ndef.write({ records: [{ recordType: "text", data: b64 }] });
                setStatus("Successfully Written! ✅", "green");
            } catch (err) { setStatus("Write Error", "red"); }
        }

        async function readNFC() {
            if (!('NDEFReader' in window)) return setStatus("NFC not supported", "red");
            try {
                const ndef = new NDEFReader();
                await ndef.scan();
                setStatus("Ready to Read - Tap Tag", "blue");
                ndef.onreading = event => {
                    const decoder = new TextDecoder();
                    const b64 = decoder.decode(event.message.records[0].data);
                    const data = unpackBase64(b64);
                    if (data) {
                        document.getElementById('read-display').style.display = "block";
                        document.getElementById('read-lat').innerText = data.lat;
                        document.getElementById('read-lon').innerText = data.lon;
                        document.getElementById('read-alt').innerText = data.alt + "m";
                        setStatus("Tag Decoded!", "green");
                    }
                };
            } catch (err) { setStatus("Read Error", "red"); }
        }
*/
        function setStatus(msg, color) {
            const s = gpsStatus;
            s.innerText = msg;
            s.style.background = color;
            s.style.color = "white";
        }
/**
 * Fetches the last value from column A of the NFC list sheet via the
 * Apps Script Web App and pre-fills the NFC ID input.
 */
async function loadLastNfcId(nfcIdInput, onLoaded) {
  if (SHEET_WRITER_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL') return;
  try {
    const response = await fetch(SHEET_WRITER_URL, { redirect: 'follow' });
    const result   = await response.json();
    if (result.lastId !== undefined && result.lastId !== '') {
        const nextId = Number(result.lastId) + 1;
        nfcIdInput.value = nextId;
        nfcIdValue = nextId;
        if (nextId > 0 && typeof onLoaded === 'function') onLoaded();
    }
  } catch (err) {
    console.warn('Could not load last NFC ID:', err.message);
  }
}

async function populate() {
  const selector = document.getElementById("plant-selector");
  const plantId = document.getElementById("nr");
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
  const qrnfcBtn = document.getElementById("qr-button");
  const copynfcBtn = document.getElementById("copy-nfc");
  const copylinkBtn = document.getElementById("copy-link");
  const backBtn = document.getElementById("back-button");
  const saveNfcBtn = document.getElementById("save-nfc");
  const errorMsg = document.getElementById("error-message");
  
  let plants = [];

  try {
    plants = await loadPlantData();
    // Keep only plants active on the page and in NFC
    plants = plants.filter(p => p.Active_in_page === 'Y' && p.Active_in_NFC === 'Y');
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
  loadLastNfcId(nfcIdInput, () => updateNFCPreview());
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
      plantId.value = plant.Nr || "";
      nameHuInput = plant.Name_HU || "";
      latinNameInput.value = plant.LatinName || "";
      datumInput.value = dateString;
      nfctypInput.value = "n";
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
      plantId.value = varietyPlant.Nr || "";
      nameHuInput = varietyPlant.Name_HU || "";
      latinNameInput.value = varietyPlant.LatinName || "";
      datumInput.value = dateString;
      nfctypInput.value = "n";
      egyebInput.value = varietyPlant.egyeb || "";
      
      updatePreviews();
    }
  });

  // Custom variety input change event
  nameVarietyCustomInput.addEventListener("change", updatePreviews);
  nameVarietyCustomInput.addEventListener("input", updatePreviews);

  // Input change events - update previews
  [plantId, latinNameInput, datumInput, nfctypInput, egyebInput].forEach(input => {
    input.addEventListener("change", updatePreviews);
    input.addEventListener("input", updatePreviews);
  });
 //listener for nfcID change
    [nfcIdInput].forEach(input => {
    input.addEventListener("change", updatePreviews);
    input.addEventListener("input", updatePreviews);
  });      

  function updatePreviews() {
    //update NFC field
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
    const nr = plantId.value;
    nfcIdValue = nfcIdInput.value;
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
    
    const nfcData = `${nfcIdValue}/${nr}/${nameHu}/${nameVariety}/${latinName}/${nfctyp}/${datum}/${gpsPacket}/${egyeb}`;
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
  //Gsp
  gpsstartBtn.addEventListener("click", startLiveCapture);
  
  gpsstopBtn.addEventListener("click", stopLiveCapture);
    
  // Generate NFC button
  gennfcBtn.addEventListener("click", () => {
    loadLastNfcId(nfcIdInput);
    updatePreviews();
    const nfcData = nfcPreview.textContent;
    
    if (nfcData === "NFC data will appear here...") {
      showError("Please select a plant and configure the NFC data");
      return;
    }
  });

    // Generate QR NFC button
  qrnfcBtn.addEventListener("click", () => {
    updatePreviews();
    const nfcData = nfcPreview.textContent;
    const link = linkPreview.textContent;
    const combined = nfcData + " " + link;
    if (nfcData === "NFC data will appear here...") {
      showError("Please select a plant and configure the NFC data");
      return;
    }
    
    const encodedData = encodeURIComponent(combined);
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
    window.location.href = "Homepage.html";
  });

  // Save NFC button – appends a row to the nfc_list sheet via the Apps Script Web App
  saveNfcBtn.addEventListener("click", async () => {
    updatePreviews();
    const today = new Date();
    const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const nfcId   = nfcIdInput.value;
    const plantId = plantId.textContent;
    const nfcData = nfcPreview.textContent;
    const nfctyp = nfctypInput.value;
    const datum = datumInput.value;
    const nfcCreated = dateString;
    const nfcPos = posPacketOut.innerText;
    const link    = linkPreview.textContent;
    
    
    const egyeb = egyebInput.value;
    
          posPacketOut.innerText       

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
        body: JSON.stringify({ key: SHEET_WRITER_SECRET, nfcId, plantId, nfctyp, datum, nfcCreated, nfcPos, nfcData, link }),
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
      loadLastNfcId(nfcIdInput);
      saveNfcBtn.disabled = false;
      updatePreviews();
    }
  });

  //save end

  // NFC Write button – writes nfc-preview (text) and link-preview (url) to a physical NFC tag
  const nfcWriteBtn = document.getElementById("nfc-write-button");
  nfcWriteBtn.addEventListener("click", async () => {
    updatePreviews();
    const nfcData = nfcPreview.textContent;
    const link    = linkPreview.textContent;

    if (nfcData === "NFC data will appear here...") {
      showError("Please select a plant and generate NFC data first");
      return;
    }

    if (!('NDEFReader' in window)) {
      showError("Web NFC is not supported on this browser/device.");
      return;
    }

    nfcWriteBtn.disabled = true;
    showError("Approach the tag to the back of your phone...", "info");

    try {
      const ndef = new NDEFReader();
      await ndef.write({
        records: [
          { recordType: "text", data: nfcData },
          { recordType: "url",  data: link }
        ]
      });
      showError("Successfully written to NFC tag! ✅", "success");
    } catch (error) {
      showError("Error: " + error);
      console.error(error);
    } finally {
      nfcWriteBtn.disabled = false;
    }
  });

  function clearForm() {
    plantId.value = "";
    nfcIdInput.value = "";
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
    if (type === "success") {
      errorMsg.style.color = "green";
    } else if (type === "info") {
      errorMsg.style.color = "blue";
    } else {
      errorMsg.style.color = "red";
    }
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

  // Pre-select plant and variety from URL params (when navigating from Homepage)
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
