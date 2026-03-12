const fs = require("fs");
const path = require("path");

const imageDir = path.join(__dirname, "images");
const outputFile = path.join(imageDir, "images.json");

const files = fs.readdirSync(imageDir)
  .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));

const grouped = {};

files.forEach(file => {

  const parts = file.split("_");

  if (parts.length >= 3) {

    const plantId = parts.slice(0,3).join("_"); // Nr_Latin_species

    if (!grouped[plantId]) {
      grouped[plantId] = [];
    }

    grouped[plantId].push(file);
  }

});

fs.writeFileSync(outputFile, JSON.stringify(grouped, null, 2));

console.log("Grouped images.json generated");

//node JS kell hozza
//futtatni kell elotte ezt: node generateImagesJson.js