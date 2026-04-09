
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

/** Use the page-level i18n helper if available, otherwise return the key. */
function msg(key) {
  return (typeof window.t === 'function') ? window.t(key) : key;
}

/** Placeholder text in either language – used to detect "no real data yet" */
const NFC_PLACEHOLDER_KEYS = ['ph_nfc_preview', 'ph_link_preview'];
function isPlaceholder(text) {
  return !text || NFC_PLACEHOLDER_KEYS.some(k => {
    return ['en','hu'].some(lang => {
      const translations = window.TRANS && window.TRANS[lang];
      return translations && translations[k] === text;
    });
  }) || text === 'NFC data will appear here...' || text === 'NFC data will appear here…';
}

let plantData = [];
let selectedPlantIndex = null;
let selectedVarietyData = null;
let customVarietyMode = false;
let plantId = 1;
let nfcIdValue =0;
let gpsPacket =null;
let updateNFCPreviewFn = null;
const nfcIdInput = document.getElementById("nfcId");
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
const gpsCardToggle = document.getElementById('gps_card_toggle');
const gpsCardBody = document.getElementById('gps_card_body');
const othCardToggle = document.getElementById('oth_card_toggle');
const othCardBody = document.getElementById('oth_card_body');
//gps
        let currentData = { lat: 0, lon: 0, alt: 0 };
        let lastUpdateTime = Date.now();
        let timerInterval;
        let watchId = null;

        function setStatus(msg_text, color) {
            const s = gpsStatus;
            s.textContent = msg_text;
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



async function readNFC(onRead) {
  if (!("NDEFReader" in window)) return;

  const ndef = new NDEFReader();
  await ndef.scan();

  ndef.onreading = (event) => {
    const result = {
      id: event.serialNumber,
      records: []
    };

    for (const record of event.message.records) {
      let value = "";

      switch (record.recordType) {
        case "text":
          value = new TextDecoder(record.encoding).decode(record.data);
          break;

        case "url":
          value = new TextDecoder().decode(record.data);
          break;

        case "mime":
          value = new TextDecoder().decode(record.data);
          break;

        default:
          value = new TextDecoder().decode(record.data);
      }

      result.records.push({
        type: record.recordType,
        value
      });
    }

    onRead(result);
  };
}

async function populate() {
  const selector = document.getElementById("plant-selector");
  const plantIdInput = document.getElementById("plantId");
  const datumInput = document.getElementById("datum");
  let plantNameInput = "";
  const nameVarietySelector = document.getElementById("name-variety");
  const nameVarietyCustomInput = document.getElementById("name-variety-custom");
  const latinNameInput = document.getElementById("latin-name");
  const nfcTypInput = document.getElementById("nfcTyp");
  const egyebInput = document.getElementById("egyeb");
  const nfcPreview = document.getElementById("nfc-preview");
  const nfcSize = document.getElementById("nfc-size");

  // Use language-aware name property
  const currentLang = (typeof window.getCurrentNfcLang === 'function')
    ? window.getCurrentNfcLang()
    : (localStorage.getItem('fuvesztar_lang') || 'hu');
  const nameProp = currentLang === 'en' ? 'Name_EN' : 'Name_HU';
  const linkPreview = document.getElementById("link-preview");
  const linkSize = document.getElementById("link-size");
  const totalSize = document.getElementById("total-size");
  const gennfcBtn = document.getElementById("generate-nfc");
  const readnfcBtn = document.getElementById("read-nfc");
  const openLinkBtn = document.getElementById("open-link");
  const qrnfcBtn = document.getElementById("qr-button");
  const copynfcBtn = document.getElementById("copy-nfc");
  const copylinkBtn = document.getElementById("copy-link");
  const backBtn = document.getElementById("back-button");
  const saveNfcBtn = document.getElementById("save-nfc");
  const errorMsg = document.getElementById("error-message");
  
  let plants = [];
  let lastId = null;
  try {
     nfcReadFunc();
  } catch (err) {
    console.error(err);
    showError(errorMsg, msg('err_nfc_load'));
    selector.innerHTML = '<option value="">(error)</option>';
    return;
  }
  
  ///datumInput.value = ;

  // Plant selector change event

    
    // Populate varieties dropdown based on plant name
    //populateVarieties(nameValue);
    
    //updatePreviews();


 async function decodebase64() {
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
  
  


 /* {
  id: "04A224B1C93880",
  records: [
    { type: "text", value: "Tomato" },
    { type: "url", value: "https://plant.app/tomato" }
  ]
}*/ 
  

  function handlePlantData(data) {
  const plant = {};
  let name = "";
  let url = "";
  console.log("New tag detected:", data.id);  
  data.records.forEach(r => {
    if (r.type === "text") { name = r.value; console.log("Text: ", r.value);}
    if (r.type === "url") { url = r.value; console.log("URL: ", r.value);} 
  });
  
    nfcPreview.textContent = "data. "+name + "lnk: "+ url;

}     

  
  //gps
 function nfcReadFunc() {

     readNFC((data) => {
       if (data.id === lastId) return; // prevent spam
       lastId = data.id;

       console.log("New tag detected:", data);
      
     // update UI
     handlePlantData(data);
   });
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
  
  function updatePreviews() {
    //update NFC field
    updateNFCPreview();
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
    const plantId = plantIdInput.value;
    nfcIdValue = nfcIdInput.value;
    const plantName = plantNameInput;
    const nameVariety = getVarietyText();
    const latinName = latinNameInput.value;
    const datum = datumInput.value;
    const nfcTyp = nfcTypInput.value;
    const egyeb = egyebInput.value;
    const link = linkPreview.textContent;
    
    const nfcData = `${nfcIdValue}/${plantId}/${plantName}/${nameVariety}/${latinName}/${nfcTyp}/${datum}/${gpsCardToggle.classList.contains('on') ? '/' + gpsPacket : ''}${othCardToggle.classList.contains('on') ? '/' + egyeb : ''}/`;
    nfcPreview.textContent = nfcData;
    
    // Update size indicator
    if (nfcSize) {
      const linkSizeBytes = calculateSizeInBytes(link);
      const nfcSizeBytes = calculateSizeInBytes(nfcData);
      const totalSizeBytes = linkSizeBytes + nfcSizeBytes;
      nfcSize.textContent = formatSize(nfcSizeBytes);
      totalSize.textContent = formatSize(totalSizeBytes);
      linkSize.textContent = formatSize(linkSizeBytes);
    } else {
      linkPreview.textContent = msg('ph_link_preview');
      nfcPreview.textContent = msg('ph_nfc_preview');
      if (linkSize) {
        nfcSize.textContent = "0 B";
        linkSize.textContent = "0 B";
        totalSize.textContent = "0 B";
      }
    }   
  }
  updateNFCPreviewFn = updateNFCPreview;
  //Gps
  gpsStartBtn.addEventListener("click", () => {
    console.log("button pressed startLiveCapture");
    startLiveCapture();

    });
  
  /*gpsStopBtn.addEventListener("click", stopLiveCapture);
    
  // Generate NFC button
  gennfcBtn.addEventListener("click", () => {
    loadLastNfcId(nfcIdInput);
    updatePreviews();
    const nfcData = nfcPreview.textContent;
    
    if (selectedPlantIndex == null) {
      showError(errorMsg, msg('err_no_plant'));
      return;
    }
  });

    // Generate QR NFC button
  qrnfcBtn.addEventListener("click", () => {
    updatePreviews();
    const nfcData = nfcPreview.textContent;
    const link = linkPreview.textContent;
    const combined = nfcData + " " + link;
    if (selectedPlantIndex == null) {
      showError(errorMsg, msg('err_no_plant'));
      return;
    }
    
    const encodedData = encodeURIComponent(combined);
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}`;
    
    const win = window.open(qrCodeUrl, "_blank");
    if (!win) {
      showError(errorMsg, msg('err_qr_fail'));
    } else {
      showError(errorMsg, msg('err_qr_ok'), "success");
    }
  });

  // Copy NFC Data button
  copynfcBtn.addEventListener("click", () => {
    const nfcData = nfcPreview.textContent;
    
    if (isPlaceholder(nfcData)) {
      showError(errorMsg, msg('err_no_nfc'));
      return;
    }
    
    navigator.clipboard.writeText(nfcData).then(() => {
      showError(errorMsg, msg('err_copy_nfc_ok'), "success");
    }).catch(err => {
      showError(errorMsg, msg('err_copy_fail') + err.message);
    });
  });

  // Copy Link button
  copylinkBtn.addEventListener("click", () => {
    const link = linkPreview.textContent;
    
    if (isPlaceholder(link) || !link) {
      showError(errorMsg, msg('err_no_link'));
      return;
    }
    
    navigator.clipboard.writeText(link).then(() => {
      showError(errorMsg, msg('err_copy_link_ok'), "success");
    }).catch(err => {
      showError(errorMsg, msg('err_copy_fail') + err.message);
    });
  });
  // NFC Read button
  readNfcBtn.addEventListener("click", () => {
    window.location.href = "Homepage.html";
  });*/
  // Back button
  backBtn.addEventListener("click", () => {
    window.location.href = "Homepage.html";
  });
  /*
  // Save NFC button – appends a row to the nfc_list sheet via the Apps Script Web App
  saveNfcBtn.addEventListener("click", async () => {
    updatePreviews();
    const today = new Date();
    const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const nfcId      = nfcIdInput.value;
    const plantIdValue    = plantIdInput.value;
    const nfcData    = nfcPreview.textContent;
    const nfcTyp     = nfcTypInput.value;
    const datum      = datumInput.value;
    const nfcCreated = dateString;
    const nfcPos     = posPacketOut.textContent;
    const link       = linkPreview.textContent;
    const egyeb      = egyebInput.value;

    if (selectedPlantIndex == null) {
      showError(errorMsg, msg('err_no_save'));
      return;
    }

    if (SHEET_WRITER_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL') {
      showError(errorMsg, msg('err_no_config'));
      return;
    }

    saveNfcBtn.disabled = true;
    try {
      const response = await fetch(SHEET_WRITER_URL, {
        method: 'POST',
        // Apps Script Web Apps accept text/plain without a CORS preflight.
        // The body is still valid JSON, parsed by the Apps Script handler.
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ key: SHEET_WRITER_SECRET, nfcId, plantId: plantIdValue, nfcTyp, datum, nfcCreated, nfcPos, nfcData, link, other: egyeb }),
        redirect: 'follow',
      });
      const result = await response.json().catch(() => ({}));
      if (result.status === 'success') {
        showError(errorMsg, msg('err_save_ok'), "success");
      } else {
        showError(errorMsg, msg('err_save_fail') + (result.error || "Unknown error"));
      }
    } catch (err) {
      showError(errorMsg, msg('err_save_fail') + err.message);
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

    if (selectedPlantIndex == null) {
      showError(errorMsg, msg('err_no_save'));
      return;
    }

    if (!('NDEFReader' in window)) {
      showError(errorMsg, msg('err_nfc_ns'));
      return;
    }

    nfcWriteBtn.disabled = true;
    showError(errorMsg, msg('err_nfc_tap'), "info");

    try {
      const ndef = new NDEFReader();
      await ndef.write({
        records: [
          { recordType: "text", data: nfcData },
          { recordType: "url",  data: link }
        ]
      });
      showError(errorMsg, msg('err_nfc_ok'), "success");
    } catch (error) {
      showError(errorMsg, msg('err_nfc_write') + error);
      console.error(error);
    } finally {
      nfcWriteBtn.disabled = false;
    }
  });*/

  function clearForm() {
    plantIdInput.value = "";
    nfcIdInput.value = "";
    plantNameInput = "";
    nameVarietySelector.innerHTML = `<option value="">${msg('opt_variety')}</option>`;
    nameVarietyCustomInput.value = "";
    nameVarietyCustomInput.style.display = "none";
    latinNameInput.value = "";
    datumInput.value = new Date().toISOString().split('T')[0];
    nfcTypInput.value = "n";
    egyebInput.value = "";
    nfcPreview.textContent = msg('ph_nfc_preview');
    nfcSize.textContent = "0 B";
    linkPreview.textContent = msg('ph_link_preview');
    linkSize.textContent = "0 B";
    totalSize.textContent = "0 B";
  }

  function showError(el, message, type = "error") {
    el.textContent = message;
    el.className = 'status-msg ' + (type === 'success' ? 'success' : type === 'info' ? 'info' : 'error');
    el.style.display = "block";
    
    if (type === "success") {
      setTimeout(() => {
        el.textContent = "";
        el.className = 'status-msg';
      }, 3000);
    }
  }

  // Set current date on load
 // datumInput.value = dateString;

}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", populate);
} else {
  populate();
}

gpsCardToggle.addEventListener('click', () => {
  gpsCardToggle.classList.toggle('on');
  const isOn = gpsCardToggle.classList.contains('on');
  gpsCardBody.style.display = isOn ? 'block' : 'none';
  // Auto-open the GPS panel when turning on
  const gpsPanel = document.getElementById('panel-gps');
  if (isOn && gpsPanel && !gpsPanel.classList.contains('open')) {
    gpsPanel.classList.add('open');
  }
  if (updateNFCPreviewFn) updateNFCPreviewFn();
});

othCardToggle.addEventListener('click', () => {
  othCardToggle.classList.toggle('on');
  const isOn = othCardToggle.classList.contains('on');
  othCardBody.style.display = isOn ? 'block' : 'none';
  // Auto-open the Other panel when turning on
  const othPanel = document.getElementById('panel-other');
  if (isOn && othPanel && !othPanel.classList.contains('open')) {
    othPanel.classList.add('open');
  }
});
