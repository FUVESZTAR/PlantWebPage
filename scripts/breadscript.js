// Initialization
lucide.createIcons();

const translations = {
    en: {
        title: "Szandi's Sourdough",
        subtitle: "Perfect Bread, Every Time",
        heroSub: "Calculate, customize, and master your baking process with smart ratios.",
        ingredients: "Ingredients",
        results: "Recipe Output",
        flour: "Flour",
        water: "Water",
        starter: "Starter",
        salt: "Salt",
        hydration: "Hydration",
        timeline: "Baking Timeline",
        tip: "Tip: Higher hydration results in a more open crumb but stickier dough."
    },
    hu: {
        title: "Szandi Kovászműhelye",
        subtitle: "Tökéletes kenyér, mindig",
        heroSub: "Számolj, szabj személyre és válj a sütés mesterévé okos arányokkal.",
        ingredients: "Összetevők",
        results: "Recept",
        flour: "Liszt",
        water: "Víz",
        starter: "Kovász",
        salt: "Só",
        hydration: "Hidratáció",
        timeline: "Idővonal",
        tip: "Tipp: A magasabb hidratáció lyukacsosabb belet, de ragadósabb tésztát eredményez."
    }
};

let currentLang = 'en';
let currentMode = 'beginner';

// DOM Elements
const inputFlour = document.getElementById('input-flour');
const inputHydration = document.getElementById('input-hydration');
const valFlour = document.getElementById('val-flour');
const valHydration = document.getElementById('val-hydration');

const resFlour = document.getElementById('res-flour');
const resWater = document.getElementById('res-water');
const resStarter = document.getElementById('res-starter');
const resSalt = document.getElementById('res-salt');
const resTotal = document.getElementById('res-total');

// Calculation Logic
function calculate() {
    const flour = parseInt(inputFlour.value);
    const hydro = parseInt(inputHydration.value);
    
    const water = Math.round(flour * (hydro / 100));
    const starter = Math.round(flour * 0.2); // 20% default
    const salt = Math.round(flour * 0.02); // 2% default
    const total = flour + water + starter + salt;

    // Update UI
    valFlour.innerText = flour;
    valHydration.innerText = hydro;
    
    resFlour.innerText = `${flour}g`;
    resWater.innerText = `${water}g`;
    resStarter.innerText = `${starter}g`;
    resSalt.innerText = `${salt}g`;
    resTotal.innerText = `${total}g`;
}

// Toggle Language
function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'hu' : 'en';
    document.getElementById('lang-label').innerText = currentLang.toUpperCase();
    
    const t = translations[currentLang];
    document.getElementById('ui-title').innerText = t.title;
    document.getElementById('ui-subtitle').innerText = t.subtitle;
    document.getElementById('ui-heroSub').innerText = t.heroSub;
    document.getElementById('ui-ingredients').innerText = t.ingredients;
    document.getElementById('ui-results').innerText = t.results;
    document.getElementById('ui-flour').innerText = `${t.flour} (g)`;
    document.getElementById('ui-hydration').innerText = `${t.hydration} (%)`;
    document.getElementById('ui-timeline').innerText = t.timeline;
    document.getElementById('ui-res-flour').innerText = t.flour;
    document.getElementById('ui-res-water').innerText = t.water;
    document.getElementById('ui-res-starter').innerText = t.starter;
    document.getElementById('ui-res-salt').innerText = t.salt;
    document.getElementById('ui-tip').innerText = t.tip;
}

// Mode Toggle
function setMode(mode) {
    currentMode = mode;
    const btnBeg = document.getElementById('btn-beginner');
    const btnPro = document.getElementById('btn-pro');
    
    if(mode === 'pro') {
        btnPro.className = "px-4 py-1 rounded-full text-sm transition bg-orange-500 text-white shadow-md";
        btnBeg.className = "px-4 py-1 rounded-full text-sm transition";
    } else {
        btnBeg.className = "px-4 py-1 rounded-full text-sm transition bg-orange-500 text-white shadow-md";
        btnPro.className = "px-4 py-1 rounded-full text-sm transition";
    }
}

// Bread Presets
function updateBreadType() {
    const type = document.getElementById('bread-type').value;
    if(type === 'baguette') {
        inputHydration.value = 65;
    } else if (type === 'buns') {
        inputHydration.value = 60;
    } else {
        inputHydration.value = 70;
    }
    calculate();
}

// Event Listeners
inputFlour.addEventListener('input', calculate);
inputHydration.addEventListener('input', calculate);

// Initial Run
calculate();
