import { loadPlantData, splitPipe, monthsFromValue } from "./csv-utils.js";
import { t, getCurrentLang, setupLanguageButtons } from "./lang.js";

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_BASE_REAL_SIZE_MM = { width: 845, height: 1800 };

const ROW_COLORS = [
  '#F7E6A4', '#F7E6A4', '#F7B0A1', '#A4F7A4',
  '#F7E6A4', '#F7E6A4', '#A4F7DA', '#F7E6A4',
];

const PARTS = [
  "root", "shoot", "stem", "wood", "sap", "apicalbud",
  "bark", "leaf", "flower", "nectar", "pollen", "fruit", "seedpod", "seed"
];

const PART_ICON_MAP = {
  leaf:     { class: 'leaf-harvest-icon',     symbol: '#icon-leaf'     },
  stem:     { class: 'stem-harvest-icon',     symbol: '#icon-stem'     },
  flower:   { class: 'flower-harvest-icon',   symbol: '#icon-flower'   },
  fruit:    { class: 'fruit-harvest-icon',    symbol: '#icon-fruit'    },
  seed:     { class: 'seed-harvest-icon',     symbol: '#icon-seed'     },
  root:     { class: 'root-harvest-icon',     symbol: '#icon-root'     },
  shoot:    { class: 'shoot-harvest-icon',    symbol: '#icon-shoot'    },
  wood:     { class: 'wood-harvest-icon',     symbol: '#icon-wood'     },
  sap:      { class: 'sap-harvest-icon',      symbol: '#icon-sap'      },
  apicalbud:{ class: 'apicalbud-harvest-icon',symbol: '#icon-apicalbud'},
  bark:     { class: 'bark-harvest-icon',     symbol: '#icon-bark'     },
  nectar:   { class: 'nectar-harvest-icon',   symbol: '#icon-nectar'   },
  pollen:   { class: 'pollen-harvest-icon',   symbol: '#icon-pollen'   },
  seedpod:  { class: 'seedpod-harvest-icon',  symbol: '#icon-seedpod'  },
};

// CSV column → part term mapping for the planning table harvest row
const HARVEST_PART_COLUMNS = [
  { key: 'Leaf_Harvesting_time_month',      term: 'leaf'      },
  { key: 'Stem_Harvesting_time_month',      term: 'stem'      },
  { key: 'Flower_Harvesting_time_month',    term: 'flower'    },
  { key: 'Fruit_Harvesting_time_month',     term: 'fruit'     },
  { key: 'Seed_Harvesting_time_month',      term: 'seed'      },
  { key: 'Root_Harvesting_time_month',      term: 'root'      },
  { key: 'Shoot_Harvesting_time_month',     term: 'shoot'     },
  { key: 'Wood_Harvesting_time_month',      term: 'wood'      },
  { key: 'Sap_Harvesting_time_month',       term: 'sap'       },
  { key: 'Apical_bud_Harvesting_time_month',term: 'apicalbud' },
  { key: 'Bark_Harvesting_time_month',      term: 'bark'      },
  { key: 'Nectar_Harvesting_time_month',    term: 'nectar'    },
  { key: 'Pollen_Harvesting_time_month',    term: 'pollen'    },
  { key: 'Seedpod_Harvesting_time_month',   term: 'seedpod'   },
];

// Category CSV columns to render icons for
const CATEGORY_PART_COLUMNS = [
  'Raw_edible_parts_all',
  'Prepared_edible_parts_all',
  'Toxic_parts_all',
  'Medicinal_parts_all',
];

// ── Pure utilities ───────────────────────────────────────────────────────────

function normalizeName(name) {
  return name.toLowerCase().replaceAll(" ", "_");
}

function buildSearchText(value, useSplit = false) {
  const raw = value ?? "";
  if (useSplit && typeof raw === "string") {
    return splitPipe(raw).filter(Boolean).map(v => String(v).trim()).join(", ").toLowerCase();
  }
  return String(raw).trim().toLowerCase();
}

function getMonthColumns() {
  return [
    { field: "Planting_time_under_glass_months", label: t('planning.plantingCover'),   id: "planting-cover"   },
    { field: "Planting_time_in_ground_month", label: t('planning.plantingGround'),  id: "planting-ground"  },
    { field: "Harvesting_time_under_glass_months",label: t('planning.harvestingCover'), id: "harvesting-cover" },
    { field: "Harvesting_time_in_ground_month",label: t('planning.harvestingGround'),id: "harvesting-ground"},
  ];
}

function getCalender1MonthLabels() {
  return t('cal.months');
}

function getCalender1Tracks() {
  return [
    { id: "planting",       label: t('cal.tracks.planting'),       color: "#3f3f3f"   },
    { id: "flowering",      label: t('cal.tracks.flowering'),      color: "#b6b62d"   },
    { id: "ripe",           label: t('cal.tracks.ripe'),           color: "#ff7d00"   },
    { id: "fruiting",       label: t('cal.tracks.fruiting'),       color: "#c40000"   },
    { id: "occupyingSpace", label: t('cal.tracks.occupyingSpace'), color: "#88b62d"   },
    { id: "harvesting",     label: t('cal.tracks.harvesting'),     color: "#00ccbb"   },
    { id: "harvestStoring", label: t('cal.tracks.harvestStoring'), color: "#cc8f0090" },
    { id: "seedSaving",     label: t('cal.tracks.seedSaving'),     color: "#0018cc"   },
  ];
}

// ── SVG helpers ──────────────────────────────────────────────────────────────

function readSvgPixelSize(svgElement) {
  const widthAttr  = Number.parseFloat(svgElement.getAttribute("width"));
  const heightAttr = Number.parseFloat(svgElement.getAttribute("height"));
  if (Number.isFinite(widthAttr) && Number.isFinite(heightAttr)) {
    return { width: widthAttr, height: heightAttr };
  }
  const viewBox = svgElement.viewBox?.baseVal;
  if (viewBox?.width > 0 && viewBox?.height > 0) {
    return { width: viewBox.width, height: viewBox.height };
  }
  const computed = window.getComputedStyle(svgElement);
  const widthCss  = Number.parseFloat(computed.width);
  const heightCss = Number.parseFloat(computed.height);
  if (Number.isFinite(widthCss) && Number.isFinite(heightCss)) {
    return { width: widthCss, height: heightCss };
  }
  throw new Error("Unable to detect SVG dimensions.");
}

function resizeSvgByReference({ baseSvg, targetSvg, baseRealSize, targetRealSize, keepAspectRatio = false }) {
  const basePixels = readSvgPixelSize(baseSvg);
  const scaleX = targetRealSize.width  / baseRealSize.width;
  const scaleY = targetRealSize.height / baseRealSize.height;
  let tw = basePixels.width  * scaleX;
  let th = basePixels.height * scaleY;
  if (keepAspectRatio) {
    const s = Math.min(scaleX, scaleY);
    tw = basePixels.width * s;
    th = basePixels.height * s;
  }
  baseSvg.style.width    = `${basePixels.width}px`;
  baseSvg.style.height   = `${basePixels.height}px`;
  targetSvg.style.width  = `${tw}px`;
  targetSvg.style.height = `${th}px`;
}

function makeSvgIcon(term, id = null) {
  const def = PART_ICON_MAP[term];
  if (!def) return null;
  const svgns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgns, 'svg');
  svg.setAttribute('class', def.class);
  svg.setAttribute('viewBox', '0 0 512 512');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'width:20px;height:20px;display:inline-block;margin-right:6px';
  if (id) {
    const makeID = `${term}-${id}`;
    svg.setAttribute('id', makeID);
  }
  const use = document.createElementNS(svgns, 'use');
  use.setAttribute('href', def.symbol);
  use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', def.symbol);
  svg.appendChild(use);
  return svg;
}
// ── Identity filter links ────────────────────────────────────────────────────

function setIdentityFilterLink(element, filterType, value) {
  if (!element) return;
  element.textContent = " / ";
  const cleanedValue = String(value || "").trim();
  if (!cleanedValue) return;
  const link = document.createElement("a");
  link.href = `PlantListPage.html?filterType=${encodeURIComponent(filterType)}&filterValue=${encodeURIComponent(cleanedValue)}`;
  link.textContent = cleanedValue;
  element.appendChild(link);
}

// ── Calendar helpers ─────────────────────────────────────────────────────────

function uniqueCALENDER1Slots(...values) {
  const slots = new Set();
  splitPipe(values.join("|")).forEach((token) => {
    const match = token.match(/^(\d{1,2})(?:\.(\d))?$/);
    if (!match) return;
    const month = Number.parseInt(match[1], 10);
    if (!Number.isInteger(month) || month < 1 || month > 12) return;
    if (match[2] === undefined) {
      for (let week = 1; week <= 4; week++) slots.add(`${month}-${week}`);
    } else {
      const week = Number.parseInt(match[2], 10);
      if (Number.isInteger(week) && week >= 1 && week <= 4) slots.add(`${month}-${week}`);
    }
  });
  return slots;
}

function renderCALENDER1(plant) {
  const root = document.querySelector("#CALENDER1");
  if (!root) return;

  const data = {
    planting:       uniqueCALENDER1Slots(plant.Planting_time_under_glass_months, plant.Planting_time_in_ground_month),
    occupyingSpace: uniqueCALENDER1Slots(plant.Occupying_space_month, plant.Ocuppying_space_month),
    flowering:      uniqueCALENDER1Slots(plant.Flowering_time_month),
    ripe:           uniqueCALENDER1Slots(plant.Harvesting_time_under_glass_months, plant.Harvesting_time_in_ground_month),
    fruiting:       uniqueCALENDER1Slots(plant.fruit_Harvesting_time_month),
    harvesting:     uniqueCALENDER1Slots(
                      plant.sap_Harvesting_time_month, plant.Nectar_Harvesting_time_month,
                      plant.Shoot_Harvesting_time_month, plant.Seedpod_Harvesting_time_month,
                      plant.Apical_bud_Harvesting_time_month, plant.Wood_Harvesting_time_month,
                      plant.Pollen_Harvesting_time_month, plant.Bark_Harvesting_time_month,
                      plant.Leaf_Harvesting_time_month, plant.Stem_Harvesting_time_month,
                      plant.Flower_Harvesting_time_month, plant.Fruit_Harvesting_time_month,
                      plant.Seed_Harvesting_time_month, plant.Root_Harvesting_time_month),
    harvestStoring: uniqueCALENDER1Slots(plant.Harvest_storing_month),
    seedSaving:     uniqueCALENDER1Slots(plant.Seed_saving),
  };

  const tracks  = getCalender1Tracks();
  const months  = getCalender1MonthLabels();
  const frag    = document.createDocumentFragment();

  // Month header
  const monthHeader = document.createElement("div");
  monthHeader.className = "CALENDER1-months";
  months.forEach((label) => {
    const cell = document.createElement("div");
    cell.className = "CALENDER1-month";
    cell.textContent = label;
    monthHeader.appendChild(cell);
  });
  frag.appendChild(monthHeader);

  // Track rows
  tracks.forEach((track) => {
    const row = document.createElement("div");
    row.className = "CALENDER1-row";
    const activeSlots = data[track.id];
    for (let month = 1; month <= 12; month++) {
      for (let sub = 1; sub <= 4; sub++) {
        const cell = document.createElement("div");
        cell.className = sub === 4 ? "CALENDER1-cell month-end" : "CALENDER1-cell";
        if (activeSlots.has(`${month}-${sub}`)) {
          cell.classList.add("active");
          cell.style.setProperty("--CALENDER1-color", track.color);
        }
        row.appendChild(cell);
      }
    }
    frag.appendChild(row);
  });

  // Legend
  const legend = document.createElement("div");
  legend.className = "CALENDER1-legend";
  tracks.forEach((track) => {
    const item = document.createElement("div");
    item.className = "CALENDER1-legend-item";
    item.innerHTML = `<span class="swatch" style="background:${track.color}"></span>${track.label}`;
    legend.appendChild(item);
  });
  frag.appendChild(legend);

  root.innerHTML = "";
  root.appendChild(frag);
}

// ── Planning table ───────────────────────────────────────────────────────────

function populatePlanningTable(plant) {
  const tbody = document.querySelector("#planning-table-body");
  const frag  = document.createDocumentFragment();

  getMonthColumns().forEach(({ field, label, id }, rowIndex) => {
    const months = new Set(monthsFromValue(plant[field] || ""));
    const row    = document.createElement("tr");
    if (id) row.setAttribute('data-row-id', id);
    const th = document.createElement("td");
    th.textContent = label;
    row.appendChild(th);
    for (let month = 1; month <= 12; month++) {
      const cell = document.createElement("td");
      if (months.has(month)) {
        cell.style.backgroundColor = ROW_COLORS[rowIndex % ROW_COLORS.length];
        cell.textContent = "●";
      }
      row.appendChild(cell);
    }
    frag.appendChild(row);
  });

  tbody.innerHTML = "";
  tbody.appendChild(frag);
}

// ── Icon colouring ───────────────────────────────────────────────────────────
let edibleText = "";
let ediblePreparedText = "";
let toxicText = "";
let medicinalText = "";

function edibilityClass(term) {
    const t = term.toLowerCase();
    if (toxicText.includes(t))           return "red";
    if (ediblePreparedText.includes(t))  return "yellow";
    if (edibleText.includes(t))          return "green";
    return "black";
  }

function applyIconColours() {
  // Colour all harvest icons
  PARTS.forEach(part => {
    const cls   = edibilityClass(part);
    const icons = document.querySelectorAll(`.${part}-harvest-icon`);
    icons.forEach(svg => {
      svg.classList.remove("green", "red", "black", "yellow");
      svg.classList.add(cls);
    });
  });

  // Med / harv icon visibility — fix: hide default only when at least one part is visible
  ["med", "harv"].forEach(type => {
    const defaultIcon = document.getElementById(`none-${type}-icon`);
    let anyVisible = false;

    PARTS.forEach(part => {
      const svg = document.getElementById(`${part}-${type}-icon`);
      if (!svg) return;

      const isVisible =
        type === "med"  ? medicinalText.includes(part) :
        edibilityClass(part) !== "black";

      svg.style.display = isVisible ? "block" : "none";
      if (isVisible) anyVisible = true;
      if (type === "harv" && !isVisible) svg.classList.add("black");
    });

    if (defaultIcon) defaultIcon.style.display = anyVisible ? "none" : "block";
  });

  return edibilityClass; // expose for callers that need it
}

// ── Harvest part icons in planning table row ─────────────────────────────────

function insertPartIconsInTable(plant) {
  const rows      = Array.from(document.querySelectorAll('#planning-table-body tr'));
  const targetRow = rows.find(r => r.getAttribute('data-row-id') === 'harvesting-ground');
  if (!targetRow) { console.warn('planning table missing "harvesting-ground" row'); return; }

  HARVEST_PART_COLUMNS.forEach(({ key, term }) => {
    if (!Object.prototype.hasOwnProperty.call(plant, key)) return;
    const months = monthsFromValue(plant[key] || '');
    if (!months.length) return;

    months.forEach(month => {
      if (typeof month !== 'number' || month < 1 || month > 12) return;
      const cells = targetRow.querySelectorAll('td');
      const cell  = cells[month];
      if (!cell) return;
      if (!cell.querySelector('svg')) cell.textContent = '';
      const makeID = `_harv_icon_-${month}`;
      const svg = makeSvgIcon(term,makeID);
      if (svg) cell.appendChild(svg);
    });
  });

  // Colour icons after all are inserted (single pass)
  PARTS.forEach(part => {
    const cls   = edibilityClass(part);
    document.querySelectorAll(`.${part}-harvest-icon`).forEach(svg => {
      svg.classList.remove("green", "red", "black", "yellow");
      svg.classList.add(cls);
    });
  });
}

// ── Category icons row ───────────────────────────────────────────────────────

function insertCategoryIconsRow(plant, mode, vers) {
  // mode = 'per-category' : one icon per part per category column (original behaviour)
  // mode = 'unique'       : one icon per part, regardless of how many columns contain it
  // vers = 'harv' / 'med'                 : Which version is it harv - all part, med - medicinal part

  const container = document.querySelector('#part-icons-row');
  if (!container) { console.warn('Missing #part-icons-row container'); return; }
  const frag = document.createDocumentFragment();

  if (mode === 'unique') {
    // Collect all parts that appear in ANY category column, deduplicated
    const seenParts = new Set();

    CATEGORY_PART_COLUMNS.forEach(key => {
      if (!Object.prototype.hasOwnProperty.call(plant, key)) return;
      const value = plant[key];
      if (!value || value === '0') return;

      String(value).toLowerCase().split('|').map(v => v.trim()).filter(Boolean)
        .forEach(part => seenParts.add(part));
    });

    seenParts.forEach(part => {
      const id  = `${part}-${vers}-icon-r`;
      const svg = makeSvgIcon(part, id);
      if (svg) frag.appendChild(svg);
    });

  } else {
    // 'per-category': one icon per part per column
    CATEGORY_PART_COLUMNS.forEach(key => {
      if (!Object.prototype.hasOwnProperty.call(plant, key)) return;
      const value = plant[key];
      if (!value || value === '0') return;

      String(value).toLowerCase().split('|').map(v => v.trim()).filter(Boolean)
        .forEach(part => {
          const id  = `${part}-${vers}-icon-${key}`;
          const svg = makeSvgIcon(part, id);
          if (svg) frag.appendChild(svg);
        });
    });
  }
  // Colour icons after all are inserted (single pass)
  PARTS.forEach(part => {
    const cls   = edibilityClass(part);
    document.querySelectorAll(`.${part}-harvest-icon`).forEach(svg => {
      svg.classList.remove("green", "red", "black", "yellow");
      svg.classList.add(cls);
    });
  });
  container.innerHTML = '';
  container.appendChild(frag);
}

// ── Size icons ───────────────────────────────────────────────────────────────

function applySizeIcons(plant) {
  const humanSvg = document.getElementById("size-human-icon-1");
  if (!humanSvg) return;

  const sizeTargets = [
    { id: "size-tree-icon-2",   w: plant.Plant_width_average_mm,      h: plant.Plant_height_average_mm      },
    { id: "size-house-icon-1",  w: 6000,                              h: 4000                               },
    { id: "size-root-icon-1",   w: plant.Plant_root_width_average_mm, h: plant.Plant_root_deept_average_mm   },
    { id: "size-plant-icon-1",  w: plant.Plant_width_average_mm,      h: plant.Plant_height_average_mm      },
    { id: "size-bush-icon-1",   w: plant.Plant_width_average_mm,      h: plant.Plant_height_average_mm      },
  ];

  sizeTargets.forEach(({ id, w, h }) => {
    const el = document.getElementById(id);
    if (!el) return;
    try {
      resizeSvgByReference({
        baseSvg: humanSvg, targetSvg: el,
        baseRealSize: DEFAULT_BASE_REAL_SIZE_MM,
        targetRealSize: { width: Number(w), height: Number(h) },
      });
    } catch (err) {
      console.warn(`Unable to resize ${id}:`, err);
    }
  });

  // Show only the correct plant type icon
  const treeSvg  = document.getElementById("size-tree-icon-2");
  const bushSvg  = document.getElementById("size-bush-icon-1");
  const plantSvg = document.getElementById("size-plant-icon-1");
  [treeSvg, bushSvg, plantSvg].forEach(s => { if (s) s.style.display = "none"; });

  const type = splitPipe(plant.Plant_type).join(", ");
  if      (type === "Tree")  { if (treeSvg)  treeSvg.style.display  = ""; }
  else if (type === "Bush")  { if (bushSvg)  bushSvg.style.display  = ""; }
  else                       { if (plantSvg) plantSvg.style.display = ""; }
}

// ── Image loader ─────────────────────────────────────────────────────────────

async function loadPlantImage(plant) {
  const imgText  = `${plant.Nr}_${plant.LatinName}_${plant.Name_Variety}`;
  const searchId = normalizeName(imgText);
  const imgEl    = document.getElementById("plantImg");
  if (!imgEl) return;
  try {
    const response = await fetch("images/images.json");
    const data     = await response.json();
    imgEl.src = data[searchId] ? `images/${data[searchId][0]}` : "images/default.jpg";
  } catch {
    imgEl.src = "images/default.jpg";
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

const selectedNr  = localStorage.getItem("selectedPlantNr");
const urlParams   = new URLSearchParams(window.location.search);
const urlPlantId  = urlParams.get("id");

document.querySelector("#back-button").addEventListener("click", () => {
  window.location.href = "HomePage.html";
});

(async function init() {
  setupLanguageButtons();

  const title             = document.querySelector("#primary-title");
  const subtitle          = document.querySelector("#secondary-title");
  const identityfamily    = document.querySelector("#identity-family");
  const identitygenus     = document.querySelector("#identity-genus");
  const identitylatinName = document.querySelector("#identity-latinName");
  const identityvariety   = document.querySelector("#identity-variety");

  if (!selectedNr && !urlPlantId) {
    title.textContent    = t('detail.noPlantSelected');
    subtitle.textContent = t('detail.noPlantSelectedMsg');
    return;
  }

  try {
    // ── Single data load ──────────────────────────────────────────────────
    const plants    = (await loadPlantData()).filter(p => p.Active_in_page === 'Y');
    const lookupNr  = urlPlantId || selectedNr;
    const plant     = plants.find(p => String(p.Nr) === String(lookupNr));

    if (!plant) {
      title.textContent    = t('detail.plantNotFound');
      subtitle.textContent = t('detail.plantNotFoundMsg');
      return;
    }
    
    // ── Title & identity ──────────────────────────────────────────────────
    const lang          = getCurrentLang();
    const primaryName   = lang === 'en' ? (plant.Name_EN || plant.Name_HU || "Unknown") : (plant.Name_HU || plant.Name_EN || "Unknown");
    const secondaryName = lang === 'en' ? (plant.Name_HU || "") : (plant.Name_EN || "");
    title.textContent   = secondaryName ? `${primaryName}   |   ${secondaryName}` : primaryName;
    subtitle.textContent = plant.Name_Variety || "Unknown";

    setIdentityFilterLink(identityfamily,    "family", plant.Family);
    setIdentityFilterLink(identitygenus,     "genus",  plant.Genus);
    setIdentityFilterLink(identitylatinName, "latin",  plant.LatinName);
    if (identityvariety) identityvariety.innerHTML = `<strong> / ${plant.Name_Variety || ""}</strong>`;
    
    // ── Build search texts once ───────────────────────────────────────────
    edibleText         = buildSearchText(plant.Raw_edible_parts_all,      true);
    ediblePreparedText = buildSearchText(plant.Prepared_edible_parts_all, true);
    toxicText          = buildSearchText(plant.Toxic_parts_all,           true);
    medicinalText      = buildSearchText(plant.Medicinal_parts_all,       true);
    
    // ── Form fields ───────────────────────────────────────────────────────
    const fieldMap = {
      "#name_sz":                                    plant.Name_SZ,
      "#plant_type":                                 splitPipe(plant.Plant_type).join(", "),
      "#uses":                                       splitPipe(plant.Uses).join(", "),
      "#medicinal_use":                              plant.Medicinal_use,
      "#preparation_to_edibility":                   splitPipe(plant.Preparation_all).join(", "),
      "#plant_flower_color":                         plant.Plant_flower_color,
      "#plant_height_max_mm":                        plant.Plant_height_max_mm,
      "#plant_width_max_mm":                         plant.Plant_width_max_mm,
      "#plant_root_deept_average_mm":                 plant.Plant_root_deept_average_mm,
      "#plant_root_width_average_mm":                plant.Plant_root_width_average_mm,
      "#plant_height_average_mm":                    plant.Plant_height_average_mm,
      "#plant_width_average_mm":                     plant.Plant_width_average_mm,
      "#plant_space_filling_mm":                     plant.Plant_space_filling_mm,
      "#plant_root_type":                            plant.Plant_root_type,
      "#plant_growing_lifecycle":                    plant.Plant_growing_lifecycle,
      "#plant_growing_habit":                        plant.Plant_growing_habit,
      "#days_to_harvest":                            plant.Days_to_Harvest,
      "#days_to_maturity":                           plant.Days_to_Maturity,
      "#Hardiness_Zone_USDA":                        plant.Hardiness_Zone_USDA,
      "#plant_planting_seed_deept_mm":                plant.Plant_planting_seed_deept_mm,
      "#plant_planting_seed_soil_temperature_celsius": plant.Plant_planting_seed_soil_temperature_celsius,
      "#plant_planting_plant_distance_mm":           plant.Plant_planting_plant_distance_mm,
      "#plant_description":                          plant.Plant_description,
      "#plant_seed_germination_time_days":           plant.Days_to_Germination,
      "#plant_seed_survival_time_month":             plant.Plant_seed_survival_time_month,
      "#plant_dangers_to_humans":                    plant.Dangers_of_plant,
    };
    Object.entries(fieldMap).forEach(([selector, value]) => {
      const el = document.querySelector(selector);
      if (el) el.value = value || "";
    });

    // NFC link
    const nfcEl = document.querySelector("#nfc-link");
    if (nfcEl) nfcEl.textContent = `${plant.Nr}  / ${plant.Name_HU || ""} / ${plant.Name_Variety || ""} / ${plant.LatinName || ""} / ${window.location.href}`;
   
    // ── Planning table + calendar ─────────────────────────────────────────
    populatePlanningTable(plant);
    renderCALENDER1(plant);

    // ── Varieties list ────────────────────────────────────────────────────
    const varieties     = splitPipe(plant.List_of_varieties);
    const varietiesList = document.querySelector("#varieties-list");
    if (varietiesList) {
      varietiesList.innerHTML = varieties.length
        ? varieties.map(v => `<li>${v}</li>`).join("")
        : `<li>${t('detail.noVarieties')}</li>`;
    }
    
    // ── Icon colouring (single pass) ──────────────────────────────────────
    const edibilityClassValue = applyIconColours();
    
    // ── Harvest icons in table + category icons row (one colourByTerm pass)
    insertPartIconsInTable(plant);
    insertCategoryIconsRow(plant,"unique","harv");
    
    // ── Size icons ────────────────────────────────────────────────────────
    applySizeIcons(plant);

    // ── Image (non-blocking) ──────────────────────────────────────────────
    loadPlantImage(plant); // intentionally not awaited — fires & forgets

  } catch (error) {
    console.error("Error loading plant data:", error);
    document.querySelector("#primary-title").textContent = t('detail.error.loadPlant');
  }
})();
