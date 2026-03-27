import { loadPlantData, splitPipe, monthsFromValue } from "./csv-utils.js";
import { t, getCurrentLang, setupLanguageButtons } from "./lang.js";

function getMonthColumns() {
  return [
    { field: "Planting_time_in_cover_months", label: t('planning.plantingCover'), id: "planting-cover" },
    { field: "Planting_time_in_ground_month", label: t('planning.plantingGround'), id: "planting-ground" },
    { field: "Harvesting_time_in_cover_month", label: t('planning.harvestingCover'), id: "harvesting-cover" },
    { field: "Harvesting_time_in_ground_month", label: t('planning.harvestingGround'), id: "harvesting-ground" },
  ];
}

// colors to use for active cells on each row (cycle if more than length)

function getCalender1MonthLabels() {
  return t('cal.months');
}

function getCalender1Tracks() {
  return [
    { id: "planting",       label: t('cal.tracks.planting'),       color: "#3f3f3f" },
    { id: "flowering",      label: t('cal.tracks.flowering'),      color: "#b6b62d" },
    { id: "ripe",           label: t('cal.tracks.ripe'),           color: "#ff7d00" },
    { id: "fruiting",       label: t('cal.tracks.fruiting'),       color: "#c40000" },
    { id: "occupyingSpace", label: t('cal.tracks.occupyingSpace'), color: "#88b62d" },
    { id: "harvesting",     label: t('cal.tracks.harvesting'),     color: "#00ccbb" },
    { id: "harvestStoring", label: t('cal.tracks.harvestStoring'), color: "#cc8f0090" },
    { id: "seedSaving",     label: t('cal.tracks.seedSaving'),     color: "#0018cc" },
  ];
}

// colors to use for active cells on each row (cycle if more than length)
const ROW_COLORS = [
  '#F7E6A4',
  '#F7E6A4',
  '#F7B0A1',
  '#A4F7A4',
  '#F7E6A4',
  '#F7E6A4',
  '#A4F7DA',
  '#F7E6A4',
];

const selectedNr = localStorage.getItem("selectedPlantNr");
const urlParams = new URLSearchParams(window.location.search);
const urlPlantId = urlParams.get("id"); // Get plant Nr from URL query param

console.log("view.js loaded");
console.log("selectedNr from localStorage:", selectedNr);
console.log("urlPlantId from URL:", urlPlantId);

document.querySelector("#back-button").addEventListener("click", () => {
  window.location.href = "HomePage.html";
});

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

function uniqueValidMonths(...values) {
  const all = values.flatMap((value) => monthsFromValue(value || ""));
  return Array.from(new Set(all.filter((m) => Number.isInteger(m) && m >= 1 && m <= 12)));
}

function uniqueCALENDER1Slots(...values) {
  const slots = new Set();

  splitPipe(values.join("|")).forEach((token) => {
    const match = token.match(/^(\d{1,2})(?:\.(\d))?$/);
    if (!match) return;

    const month = Number.parseInt(match[1], 10);
    if (!Number.isInteger(month) || month < 1 || month > 12) return;

    const weekRaw = match[2];
    if (weekRaw === undefined) {
      for (let week = 1; week <= 4; week += 1) {
        slots.add(`${month}-${week}`);
      }
      return;
    }

    const week = Number.parseInt(weekRaw, 10);
    if (!Number.isInteger(week) || week < 1 || week > 4) return;
    slots.add(`${month}-${week}`);
  });

  return slots;
}

function renderCALENDER1(plant) {
  const root = document.querySelector("#CALENDER1");
  if (!root) return;

  const data = {
    planting: uniqueCALENDER1Slots(plant.Planting_time_in_cover_months, plant.Planting_time_in_ground_month),
    occupyingSpace: uniqueCALENDER1Slots(plant.Occuppying_space_month, plant.Ocuppying_space_month),
    flowering: uniqueCALENDER1Slots(plant.Flowering_time_month),
    ripe: uniqueCALENDER1Slots(plant.Harvesting_time_in_cover_month, plant.Harvesting_time_in_ground_month),
    fruiting: uniqueCALENDER1Slots(plant.Fruit_Harvesting_time_month),
    harvesting: uniqueCALENDER1Slots(plant.Leaf_Harvesting_time_month, plant.Stem_Harvesting_time_month, plant.Flower_Harvesting_time_month, plant.Fruit_Harvesting_time_month, plant.Seed_Harvesting_time_month, plant.Root_Harvesting_time_month),
    harvestStoring: uniqueCALENDER1Slots(plant.Harvest_storing_month),
    seedSaving: uniqueCALENDER1Slots(plant.Seed_saving),
  };

  root.innerHTML = "";

  const CALENDER1_MONTH_LABELS = getCalender1MonthLabels();
  const CALENDER1_TRACKS = getCalender1Tracks();

  const monthHeader = document.createElement("div");
  monthHeader.className = "CALENDER1-months";
  CALENDER1_MONTH_LABELS.forEach((label) => {
    const monthCell = document.createElement("div");
    monthCell.className = "CALENDER1-month";
    monthCell.textContent = label;
    monthHeader.appendChild(monthCell);
  });
  root.appendChild(monthHeader);

  CALENDER1_TRACKS.forEach((track) => {
    const row = document.createElement("div");
    row.className = "CALENDER1-row";
    const activeSlots = data[track.id];

    for (let month = 1; month <= 12; month += 1) {
      for (let subCell = 1; subCell <= 4; subCell += 1) {
        const cell = document.createElement("div");
        cell.className = "CALENDER1-cell";
        if (subCell === 4) {
          cell.classList.add("month-end");
        }
        if (activeSlots.has(`${month}-${subCell}`)) {
          cell.classList.add("active");
          cell.style.setProperty("--CALENDER1-color", track.color);
        }
        row.appendChild(cell);
      }
    }

    root.appendChild(row);
  });

  const legend = document.createElement("div");
  legend.className = "CALENDER1-legend";
  CALENDER1_TRACKS.forEach((track) => {
    const item = document.createElement("div");
    item.className = "CALENDER1-legend-item";
    item.innerHTML = `<span class="swatch" style="background:${track.color}"></span>${track.label}`;
    legend.appendChild(item);
  });

  root.appendChild(legend);
}
//start of main init function
console.log("start1");
(async function init() {
  setupLanguageButtons();

  const title = document.querySelector("#primary-title");
  const subtitle = document.querySelector("#secondary-title");
  const identityfamily = document.querySelector("#identity-family");
  const identitygenus = document.querySelector("#identity-genus");
  const identitylatinName = document.querySelector("#identity-latinName");
  const identityvariety = document.querySelector("#identity-variety");
   console.log("start2");
  if (!selectedNr && !urlPlantId) {
    title.textContent = t('detail.noPlantSelected');
    subtitle.textContent = t('detail.noPlantSelectedMsg');
    return;
  }

  try {
    let plants = await loadPlantData();
    // Keep only plants active on the page
    plants = plants.filter(p => p.Active_in_page === 'Y');
    // Find plant by Nr (from URL param or localStorage)
    let plant;
    const lookupNr = urlPlantId || selectedNr;
    console.log("load" ,lookupNr);
    plant = plants.find((item) => String(item.Nr) === String(lookupNr));

    if (!plant) {
      title.textContent = t('detail.plantNotFound');
      subtitle.textContent = t('detail.plantNotFoundMsg');
      return;
    }
 
    // Keep the full plant object intact; all CSV columns remain accessible via plant.<colname>
    // Previously we destructured a fixed subset, which omitted many fields. Remove that
    // so developers can freely refer to any column from the loaded row.
    // Example usage below will access plant.Name_HU, plant.Edible_parts_all, etc.

       // Set page title and headers using loaded variables – language-aware
       const lang = getCurrentLang();
       const primaryName = lang === 'en'
         ? (plant.Name_EN || plant.Name_HU || "Unknown")
         : (plant.Name_HU || plant.Name_EN || "Unknown");
       const secondaryName = lang === 'en'
         ? (plant.Name_HU || "")
         : (plant.Name_EN || "");
       title.textContent = secondaryName
         ? `${primaryName}   |   ${secondaryName}`
         : primaryName;
  setIdentityFilterLink(identityfamily, "family", plant.Family);
  setIdentityFilterLink(identitygenus, "genus", plant.Genus);
  setIdentityFilterLink(identitylatinName, "latin", plant.LatinName);
    identityvariety.innerHTML = `<strong> / ${plant.Name_Variety|| ""}</strong>`;

    subtitle.textContent = plant.Name_Variety || "Unknown";
    //title.textContent = `<strong>#${plant.Name_HU || "Unknown"} | ${plant.Name_EN || ""} | ${plant.Name_SZ  || ""}</strong>`;
    // Fill form fields with CSV data
     // document.querySelector("#name_hu").value = plant.Name_HU || "";
     // document.querySelector("#name_en").value = plant.Name_EN || "";
    document.querySelector("#name_sz").value = plant.Name_SZ || "";
    document.querySelector("#plant_type").value = splitPipe(plant.Plant_type).join(", ") || "";
    document.querySelector("#uses").value = splitPipe(plant.Uses).join(", ") || "";
    document.querySelector("#edible_parts").value = splitPipe(plant.Raw_edible_parts_all).join(", ") || "";
    document.querySelector("#prepared_edible_parts").value = splitPipe(plant.Prepared_edible_parts_all).join(", ") || "";
    document.querySelector("#preparation_to_edibility").value = splitPipe(plant.Preparation_all).join(", ") || "";
    document.querySelector("#toxic_parts").value = splitPipe(plant.Toxic_parts_all).join(", ") || "";
    document.querySelector("#medicinal_parts").value = splitPipe(plant.Medicinal_parts_all).join(", ") || "";
    document.querySelector("#medicinal_use").value = plant.Medicinal_use || "";
    
    document.querySelector("#plant_flower_color").value = plant.Plant_flower_color || "";
    document.querySelector("#plant_height_max_mm").value = plant.Plant_height_max_mm || "";
    document.querySelector("#plant_width_max_mm").value = plant.Plant_width_max_mm || "";
    document.querySelector("#plant_root_dept_average_mm").value = plant.Plant_root_dept_average_mm || "";
    document.querySelector("#plant_root_width_average_mm").value = plant.Plant_root_width_average_mm || "";
    document.querySelector("#plant_height_average_mm").value = plant.Plant_height_average_mm || "";
    document.querySelector("#plant_width_average_mm").value = plant.Plant_width_average_mm || "";
    document.querySelector("#plant_space_filling_mm").value = plant.Plant_space_filling_mm || "";
  
    document.querySelector("#plant_root_type").value = plant.Plant_root_type || "";
    document.querySelector("#plant_growing_lifecycle").value = plant.Plant_growing_lifecycle || "";
    document.querySelector("#plant_growing_habit").value = plant.Plant_growing_habit || "";
    document.querySelector("#days_to_harvest").value = plant.Days_to_Harvest || "";
    document.querySelector("#days_to_maturity").value = plant.Days_to_Maturity || "";
    document.querySelector("#days_to_germination").value = plant.Days_to_Germination || "";
    document.querySelector("#hardiness_zone").value = plant.Hardiness_Zone || "";
    document.querySelector("#plant_planting_seed_dept_mm").value = plant.Plant_planting_seed_dept_mm || "";
    document.querySelector("#plant_planting_seed_soil_temperature_celsius").value = plant.Plant_planting_seed_soil_temperature_celsius || "";
    document.querySelector("#plant_planting_plant_distance_mm").value = plant.Plant_planting_plant_distance_mm || "";
    document.querySelector("#plant_description").value = plant.Plant_description || "";
    document.querySelector("#plant_seed_germination_time_days").value = plant.Plant_seed_germination_time_days || "";
    document.querySelector("#plant_seed_survival_time_month").value = plant.Plant_seed_survival_time_month || "";
    document.querySelector("#plant_dangers_to_humans").value = plant.Plant_dangers_to_humans || "";
    
    // after the two text fields are populated we can colour the harvest icons
    // depending on whether the parts appear in the edible or toxic lists.
    // the text inputs above contain comma‑separated values, so we'll just
    // work with the lowercase string and test for the presence of keywords.
    const edibleText = document.querySelector("#edible_parts").value.toLowerCase();
    const ediblePreparedText = document.querySelector("#prepared_edible_parts").value.toLowerCase();
    const toxicText = document.querySelector("#toxic_parts").value.toLowerCase();
    const medicinalText = document.querySelector("#medicinal_parts").value.toLowerCase();


    // icon colouring
    function colourByTerm(iconClass, term) {
      // update every occurrence of the icon class on the page
      const svgs = document.querySelectorAll(`.${iconClass}`);
      if (!svgs.length) return;
      svgs.forEach(svg => {
        svg.classList.remove("green", "red", "black", "yellow");
        if (toxicText.includes(term.toLowerCase())){
          svg.classList.add("red");
        } else if (ediblePreparedText.includes(term.toLowerCase()))  {
          svg.classList.add("yellow");
        } else if (edibleText.includes(term.toLowerCase())) {
          svg.classList.add("green");
        } else {
          svg.classList.add("black");
        }
      });
    }

    // perform the check for each of the harvest icons
    document.getElementById("none-med-icon").style.display = "block";
    document.getElementById("none-harv-icon").style.display = "block";
    colourByTerm("root-harvest-icon", "root");
    colourByTerm("stem-harvest-icon", "stem");
    colourByTerm("leaf-harvest-icon", "leaf");
    colourByTerm("flower-harvest-icon", "flower");
    colourByTerm("fruit-harvest-icon", "fruit");
    colourByTerm("seed-harvest-icon", "seed");

     // icon visiblility Harvest, Medical
function setVisibiltyHIcon(iconType,svgName,svgDefName, term) {
    const svg = document.getElementById(svgName);
    const svgDefault = document.getElementById(svgDefName);
    if (!svg) {
        console.warn("SVG not found: ", svgName);
        return { show: 0 };
    }
    console.log("Visibility change: ", svgName);
    svg.style.display = "none";
    if (iconType === "med") {
        if (medicinalText.includes(term.toLowerCase())){
           svg.style.display = "block";
           svgDefault.style.display = "none";
         } 
    } else if (iconType === "harv") {
      if (toxicText.includes(term.toLowerCase())){
          svg.style.display = "block";
          svgDefault.style.display = "none";
        } else if (ediblePreparedText.includes(term.toLowerCase()))  {
          svg.style.display = "block";
          svgDefault.style.display = "none";
        } else if (edibleText.includes(term.toLowerCase())) {
          svg.style.display = "block";
          svgDefault.style.display = "none";
        } else {
          svg.classList.add("black");
        }
   } 
}
    // make med icon visible
    setVisibiltyHIcon("med","root-med-icon","none-med-icon","root");
    setVisibiltyHIcon("med","stem-med-icon","none-med-icon","stem");
    setVisibiltyHIcon("med","leaf-med-icon","none-med-icon","leaf");
    setVisibiltyHIcon("med","flower-med-icon","none-med-icon","flower");
    setVisibiltyHIcon("med","fruit-med-icon","none-med-icon","fruit");
    setVisibiltyHIcon("med","seed-med-icon","none-med-icon","seed");
    // make haqrv icon visible
    setVisibiltyHIcon("harv","root-harv-icon","none-harv-icon","root");
    setVisibiltyHIcon("harv","stem-harv-icon","none-harv-icon","stem");
    setVisibiltyHIcon("harv","leaf-harv-icon","none-harv-icon","leaf");
    setVisibiltyHIcon("harv","flower-harv-icon","none-harv-icon","flower");
    setVisibiltyHIcon("harv","fruit-harv-icon","none-harv-icon","fruit");
    setVisibiltyHIcon("harv","seed-harv-icon","none-harv-icon","seed");
    
    // Fill planning table with month data
    populatePlanningTable(plant);
    renderCALENDER1(plant);

    // Place icons for each harvestable part into the "Harvesting in Ground" row
    // based on their corresponding CSV month column.
    (function insertPartIcons(p) {
      // mapping of part names to CSV column names, icon classes, and sprite symbols
      const parts = [
        { key: 'Leaf_Harvesting_time_month', term: 'leaf', iconClass: 'leaf-harvest-icon', symbol: '#icon-leaf' },
        { key: 'Stem_Harvesting_time_month', term: 'stem', iconClass: 'stem-harvest-icon', symbol: '#icon-stem' },
        { key: 'Flower_Harvesting_time_month', term: 'flower', iconClass: 'flower-harvest-icon', symbol: '#icon-flower' },
        { key: 'Fruit_Harvesting_time_month', term: 'fruit', iconClass: 'fruit-harvest-icon', symbol: '#icon-fruit' },
        { key: 'Seed_Harvesting_time_month', term: 'seed', iconClass: 'seed-harvest-icon', symbol: '#icon-seed' },
        { key: 'Root_Harvesting_time_month', term: 'root', iconClass: 'root-harvest-icon', symbol: '#icon-root' },
      ];

      const rows = Array.from(document.querySelectorAll('#planning-table-body tr'));
      const targetRow = rows.find(r => r.getAttribute('data-row-id') === 'harvesting-ground');
      if (!targetRow) {
        console.warn('planning table missing "Harvesting in Ground" row');
        return;
      }

      const svgns = 'http://www.w3.org/2000/svg';

      parts.forEach(({ key, term, iconClass, symbol }) => {
        if (!p.hasOwnProperty(key)) {
          // skip if column absent
          return;
        }
        const months = monthsFromValue(p[key] || '');
        if (!months.length) return;
        console.log(`inserting ${term} icons for months`, months);

        months.forEach(month => {
          if (typeof month !== 'number' || month < 1 || month > 12) return;
          const cells = targetRow.querySelectorAll('td');
          const cell = cells[month];
          if (!cell) return;
          // Only clear the "●" bullet; if icons are already present, just append
          if (!cell.querySelector('svg')) {
            cell.textContent = '';
          }

          const svg = document.createElementNS(svgns, 'svg');
          svg.setAttribute('class', iconClass);
          svg.setAttribute('viewBox', '0 0 512 512');
          svg.setAttribute('aria-hidden', 'true');
          svg.style.width = '20px';
          svg.style.height = '20px';
          svg.style.display = 'inline-block';

          const use = document.createElementNS(svgns, 'use');
          use.setAttribute('href', symbol);
          use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', symbol);
          svg.appendChild(use);
          cell.appendChild(svg);
        });

        // apply colouring for this part
        colourByTerm(iconClass, term);
      });
    })(plant);

    // Fill varieties list from CSV
    const varieties = splitPipe(plant.List_of_varieties);
    const varietiesList = document.querySelector("#varieties-list");
    if (varieties.length) {
      varietiesList.innerHTML = varieties.map((v) => `<li>${v}</li>`).join("");
    } else {
      varietiesList.innerHTML = `<li>${t('detail.noVarieties')}</li>`;
    }

    // Set NFC link
    // Set NFC link text to current page URL (could also keep plant:// scheme if needed)
    document.querySelector("#nfc-link").textContent = `${plant.Nr}  / ${plant.Name_HU || ""} / ${plant.Name_Variety || ""} / ${plant.LatinName || ""} / ${window.location.href}`;

    // Log all loaded variables to console for debugging
    console.log("Plant data loaded from CSV row with Nr =", plant.Nr, plant);
  } catch (error) {
    console.error("Error loading plant data:", error);
    document.querySelector("#primary-title").textContent = t('detail.error.loadPlant');
  }
})();

function populatePlanningTable(plant) {
  const tbody = document.querySelector("#planning-table-body");
  
  tbody.innerHTML = "";
  const MONTH_COLUMNS = getMonthColumns();
  MONTH_COLUMNS.forEach(({ field, label, id }, rowIndex) => {
    const rawValue = plant[field] || "";
    const monthList = monthsFromValue(rawValue);
    console.log("populatePlanningTable", field, rawValue, monthList);
    const months = new Set(monthList);
    const row = document.createElement("tr");
    if (id) row.setAttribute('data-row-id', id);
    row.innerHTML = `<td>${label}</td>`;
    
    for (let month = 1; month <= 12; month++) {
      const cell = document.createElement("td");
      if (months.has(month)) {
        // apply color based on row index
        const color = ROW_COLORS[rowIndex % ROW_COLORS.length];
        cell.style.backgroundColor = color;
        cell.textContent = "●";
      }
      row.appendChild(cell);
    }
    
    tbody.appendChild(row);
  });

//resizing
const DEFAULT_BASE_REAL_SIZE_MM = { width: 845, height: 1800 };

//read size of SVG in pixels, trying width/height attributes first, then viewBox, then computed styles
function readSvgPixelSize(svgElement) {
  if (!(svgElement instanceof SVGElement)) {
    throw new Error("Expected an SVGElement when reading SVG size.");
  }

  const widthAttr = Number.parseFloat(svgElement.getAttribute("width"));
  const heightAttr = Number.parseFloat(svgElement.getAttribute("height"));
  if (Number.isFinite(widthAttr) && Number.isFinite(heightAttr)) {
    return { width: widthAttr, height: heightAttr };
  }

  const viewBox = svgElement.viewBox?.baseVal;
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    return { width: viewBox.width, height: viewBox.height };
  }

  const computed = window.getComputedStyle(svgElement);
  const widthCss = Number.parseFloat(computed.width);
  const heightCss = Number.parseFloat(computed.height);
  if (Number.isFinite(widthCss) && Number.isFinite(heightCss)) {
    return { width: widthCss, height: heightCss };
  }

  throw new Error("Unable to detect SVG dimensions from width/height, viewBox, or computed styles.");
}

function normalizeRealSize(realSize, label) {
  const width = Number(realSize?.width);
  const height = Number(realSize?.height);

  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new Error(`${label} must include positive width and height values.`);
  }

  return { width, height };
}

/**
 * Keep base SVG exactly the same visible size, and resize target SVG by
 * real-world proportion (target/base) using each axis.
 */
function resizeSvgByReference({
  baseSvg,
  targetSvg,
  baseRealSize,
  targetRealSize,
  keepAspectRatio = false,
}) {
  if (!(baseSvg instanceof SVGElement) || !(targetSvg instanceof SVGElement)) {
    throw new Error("Both baseSvg and targetSvg must be SVG elements.");
  }
  const basePixels = readSvgPixelSize(baseSvg);
  const normalizedBaseReal = normalizeRealSize(baseRealSize, "baseRealSize");
  const normalizedTargetReal = normalizeRealSize(targetRealSize, "targetRealSize");
  const scaleX = normalizedTargetReal.width / normalizedBaseReal.width;
  const scaleY = normalizedTargetReal.height / normalizedBaseReal.height;
  let targetWidth = basePixels.width * scaleX;
  let targetHeight = basePixels.height * scaleY;
  if (keepAspectRatio) {
    const uniformScale = Math.min(scaleX, scaleY);
    targetWidth = basePixels.width * uniformScale;
    targetHeight = basePixels.height * uniformScale;
  }

  baseSvg.style.width = `${basePixels.width}px`;
  baseSvg.style.height = `${basePixels.height}px`;
  targetSvg.style.width = `${targetWidth}px`;
  targetSvg.style.height = `${targetHeight}px`;

  return {
    basePixels,
    targetPixels: { width: targetWidth, height: targetHeight },
    scaleX,
    scaleY,
  };
}

const humanSvg = document.getElementById("size-human-icon-1");

    // Resize tree icon relative to the fixed-size human icon.
    const treeSVG = document.getElementById("size-tree-icon-2");
    if (humanSvg && treeSVG) {
      const targetRealSize = {
        width: Number(plant.Plant_width_average_mm),
        height: Number(plant.Plant_height_average_mm),
      };

      try { 
        const result = resizeSvgByReference({
          baseSvg: humanSvg,
          targetSvg: treeSVG,
          baseRealSize: DEFAULT_BASE_REAL_SIZE_MM,
          targetRealSize,
          keepAspectRatio: false,
        });
       // console.log("Icon resized:", result);
      } catch (error) {
        console.warn("Unable to resize plant icon:", error);
      }
    }

     // Resize house icon relative to the fixed-size human icon.
    const houseSVG = document.getElementById("size-house-icon-1");
    if (humanSvg && houseSVG) {
      const targetRealSize = {
        width: 6000,
        height: 4000,
      };

      try {
        const result = resizeSvgByReference({
          baseSvg: humanSvg,
          targetSvg: houseSVG,
          baseRealSize: DEFAULT_BASE_REAL_SIZE_MM,
          targetRealSize,
          keepAspectRatio: false,
        });
        //console.log("Icon resized:", result);
      } catch (error) {
        console.warn("Unable to resize icon:", error);
      }
    }

           // Resize root icon relative to the fixed-size human icon.
    const rootSvg = document.getElementById("size-root-icon-1");
    if (humanSvg && rootSvg) {
      const targetRealSize = {
        width: Number(plant.Plant_root_width_average_mm),
        height: Number(plant.Plant_root_dept_average_mm),
      };

      try {
        const result = resizeSvgByReference({
          baseSvg: humanSvg,
          targetSvg: rootSvg,
          baseRealSize: DEFAULT_BASE_REAL_SIZE_MM,
          targetRealSize,
          keepAspectRatio: false,
        });
       // console.log("Icon resized:", result);
      } catch (error) {
        console.warn("Unable to resize icon:", error);
      }
    } 
    
// Resize plant icon relative to the fixed-size human icon.
    
    const plantSvg = document.getElementById("size-plant-icon-1");
    if (humanSvg && plantSvg) {
      const targetRealSize = {
        width: Number(plant.Plant_width_average_mm),
        height: Number(plant.Plant_height_average_mm),
      };

      try {
        const result = resizeSvgByReference({
          baseSvg: humanSvg,
          targetSvg: plantSvg,
          baseRealSize: DEFAULT_BASE_REAL_SIZE_MM,
          targetRealSize,
          keepAspectRatio: false,
        });
       // console.log("Plant icon resized:", result);
      } catch (error) {
        console.warn("Unable to resize plant icon:", error);
      }
    }

       // Resize bush icon relative to the fixed-size human icon.
    const bushSvg = document.getElementById("size-bush-icon-1");
    if (humanSvg && bushSvg) {
      const targetRealSize = {
        width: Number(plant.Plant_width_average_mm),
        height: Number(plant.Plant_height_average_mm),
      };

      try {
        const result = resizeSvgByReference({
          baseSvg: humanSvg,
          targetSvg: bushSvg,
          baseRealSize: DEFAULT_BASE_REAL_SIZE_MM,
          targetRealSize,
          keepAspectRatio: false,
        });
       // console.log("Plant icon resized:", result);
      } catch (error) {
        console.warn("Unable to resize plant icon:", error);
      }
    }     

    // make other plant type icon invisible
  function setPlantType(type) {
    const svg1 = treeSVG; // tree
    const svg2 = bushSvg; // bush
    const svg3 = plantSvg; // other
    const show = 0;
    console.log("Plant type", type);
    // hide all first
    svg1.style.display = "none";
    svg2.style.display = "none";
    svg3.style.display = "none";

    if (type === "Tree") {
        svg1.style.display = "";
        return {show: 1};
    }
    else if (type === "Bush") {
        svg2.style.display = "";
        return {show: 2};
    }
    else {
        svg3.style.display = "";
        return {show: 3};
    }
};

  // plant type
  const plantTypeVar = splitPipe(plant.Plant_type).join(", ") || "";
  const result2 = setPlantType(plantTypeVar);


  // images 
    //const latinNamePlain = plant.LatinName.replace(/ /g, "_");
   /* const imgText = plant.Nr + "_" + plant.LatinName;
fetch("images/images.json")
  .then(r => r.json())
  .then(data => {

    const plantId = normalizeName(imgText) + ".jpg";;
     console.log("plantId: ", plantId);
      
    if (data[plantId]) {
        document.getElementById("plantImg").src = "images/" + data[plantId][0];
    } else {
        document.getElementById("plantImg").src = "images/default.jpg";
        console.log("fetch: ", "no picture");
    }

  });*/
const imgText = plant.Nr + "_" + plant.LatinName+ "_" + plant.Name_Variety;
const searchId = normalizeName(imgText);

fetch("images/images.json")
.then(r => r.json())
.then(data => {

    console.log("search:", searchId);
    console.log("images json:", data);
    if (data[searchId]) {

        const match = data[searchId][0];   // first image

        document.getElementById("plantImg").src = "images/" + match;

        console.log("image:", match);

    } 
    else {

        document.getElementById("plantImg").src = "images/default.jpg";

        console.log("no picture");

    }

});

function normalizeName(name) {
  return name
    .toLowerCase()
    .replaceAll(" ", "_");
}



  /** old
 * Resize a target SVG relative to a fixed base SVG using proportional values.
 *
 * basePixelSize stays unchanged (default 60x60), while target pixel size is
 * scaled by (target proportional value / base proportional value) per axis.
 
function resizeSvgByReference({
  baseSvg,
  targetSvg,
  base2Svg,
  basePixelSize = { width: 60, height: 60 },
  baseProportional,
  targetProportional,
  base2Proportional,
  keepAspectRatio = false,
}) {
  if (!baseSvg || !targetSvg) {
    throw new Error('Both baseSvg and targetSvg are required.');
  }

  const scaleX = targetProportional.width / baseProportional.width;
  const scaleY = targetProportional.height / baseProportional.height;
  const scaleX2 = base2Proportional.width / baseProportional.width;
  const scaleY2 = base2Proportional.height / baseProportional.height;
  let width = basePixelSize.width * scaleX;
  let height = basePixelSize.height * scaleY;
  let width2 = basePixelSize.width * scaleX;
  let height2 = basePixelSize.height * scaleY;

  if (keepAspectRatio) {
    const uniformScale = Math.min(scaleX, scaleY);
    width = basePixelSize.width * uniformScale;
    height = basePixelSize.height * uniformScale;
  }

  if (keepAspectRatio) {
    const uniformScale = Math.min(scaleX2, scaleY2);
    width2 = basePixelSize.width * uniformScale;
    height2 = basePixelSize.height * uniformScale;
  }

  baseSvg.style.width = `${basePixelSize.width}px`;
  baseSvg.style.height = `${basePixelSize.height}px`;
  targetSvg.style.width = `${width}px`;
  targetSvg.style.height = `${height}px`;
  base2Svg.style.width = `${width2}px`;
  base2Svg.style.height = `${height2}px`;

  return { width, height, scaleX, scaleY };
}

const bild1 = document.getElementById('size-human-icon');
const bild2 = document.getElementById('size-tree-icon');
const bild3 = document.getElementById('size-house-icon');
const baseProportionalWidth = 500;
const baseProportionalHeight= 1800;
const base2ProportionalWidth = 30000;
const base2ProportionalHeight= 30000;
const targetProportionalWidth= plant.Plant_width_average_mm;
const targetProportionalHeight = plant.Plant_width_average_mm;
// Ellenőrizzük, hogy léteznek-e az elemek
if (bild1 && bild2 && bild3) {
  const result2 = resizeSvgByReference({
    baseSvg: bild1,
    targetSvg: bild2,
    base2Svg: bild3,
    basePixelSize: { width: 60, height: 60 },
    baseProportional: { width: baseProportionalWidth, height: baseProportionalHeight },
    targetProportional: { width: targetProportionalWidth, height: targetProportionalHeight },
    base2Proportional: { width: base2ProportionalWidth, height: base2ProportionalHeight },
    keepAspectRatio: false,
  });

  // Itt a result2 változót használd a logoláshoz
  console.log(bild2, 'bild2 resized to:', result2.width, 'x', result2.height);
}
  */


/*
// Example usage with your values:
// bild1 (fixed): viewBox="0 0 24 24", width=60, height=60, proportional=500x1800
// bild2 (resized): viewBox="0 0 512 512", start 60x60, proportional=3000x2500
window.addEventListener('DOMContentLoaded', () => {
  const bild1 = document.getElementById('size-human-icon');
  const bild2 = document.getElementById('size-tree-icon');

  if (!bild1 || !bild2) return;

  const result = resizeSvgByReference({
    baseSvg: bild1,
    targetSvg: bild2,
    basePixelSize: { width: 60, height: 60 },
    baseProportional: { width: 500, height: 1800 },
    targetProportional: { width: 3000, height: 2500 },
    keepAspectRatio: false, // set true if you want uniform scaling
  });

  console.log('bild2 resized to:', result.width, 'x', result.height);
});*/

}
