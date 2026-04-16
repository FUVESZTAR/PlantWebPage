const fs = require("fs");
const path = require("path");

const imageDir = path.join(__dirname, "images");
const outputFile = path.join(imageDir, "images.json");

const files = fs.readdirSync(imageDir)
  .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));

const grouped = {};

files.forEach(file => {
  const nameWithoutExt = file.replace(/\.[^.]+$/, '');
  const parts = nameWithoutExt.split("_");

  // If the first part is a numeric Plant_ID, use it as the key so all
  // images for the same plant (e.g. 1_malus_domestica_species.jpg,
  // 1_malus_domestica_species_2.jpg) are grouped together.
  // Otherwise fall back to the full name-without-extension as key.
  const key = (parts.length >= 1 && /^\d+$/.test(parts[0]))
    ? parts[0]
    : nameWithoutExt;

  if (!grouped[key]) {
    grouped[key] = [];
  }

  grouped[key].push(file);
});

fs.writeFileSync(outputFile, JSON.stringify(grouped, null, 2));

console.log("Grouped images.json generated");

//node JS kell hozza
//futtatni kell elotte ezt: node generateImagesJson.js