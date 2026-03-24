import { loadPlantData } from "./csv-utils.js";

document.getElementById("back-button").addEventListener("click", () => {
  window.location.href = "HomePage.html";
});

const FILTER_LABELS = {
  family: "Family",
  genus: "Genus",
  latin: "Latin Name",
};

const FILTER_FIELDS = {
  family: "Family",
  genus: "Genus",
  latin: "LatinName",
};

async function populate() {
  const tbody = document.getElementById("plant-list-body");
  const filterSummary = document.getElementById("filter-summary");
  const errorMsg = document.getElementById("error-message");

  const params = new URLSearchParams(window.location.search);
  const filterType = params.get("filterType") || "";
  const filterValue = params.get("filterValue") || "";

  if (filterType && filterValue) {
    filterSummary.textContent = `${FILTER_LABELS[filterType] || filterType}: ${filterValue}`;
  } else {
    filterSummary.textContent = "All plants";
  }

  let plants = [];
  try {
    plants = await loadPlantData();
    // Keep only plants active on the page and in NFC
   plants = plants.filter(p => p.Active_in_page === 'Y' && p.Active_in_NFC === 'Y');
  } catch (err) {
    console.error(err);
    errorMsg.textContent = "Failed to load plant data";
    tbody.innerHTML = '<tr><td colspan="4">Error loading data</td></tr>';
    return;
  }

  let filtered = plants;
  const field = FILTER_FIELDS[filterType];
  if (field && filterValue) {
    filtered = plants.filter((p) => (p[field] || "") === filterValue);
  }

  filtered.sort((a, b) => (a.LatinName || "").localeCompare(b.LatinName || ""));

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="4">No plants found</td></tr>';
    return;
  }

  tbody.innerHTML = "";
  filtered.forEach((plant) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${plant.LatinName || ""}</td>
      <td>${plant.Name_Variety || ""}</td>
      <td>${plant.Name_EN || ""}</td>
      <td>${plant.Name_HU || ""}</td>
    `;
    tr.addEventListener("click", () => {
      localStorage.setItem("selectedPlantNr", plant.Nr);
      window.location.href = `P.html?id=${encodeURIComponent(plant.Nr)}`;
    });
    tbody.appendChild(tr);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", populate);
} else {
  populate();
}
