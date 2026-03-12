import fetch from 'node-fetch';

export const loadPlantData = async () => {
    const response = await fetch('https://docs.google.com/spreadsheets/d/1QHJzWztssucMlnozk2tV9ym6gLedgDj4Zh3DzCTFWCY/gviz/tq?tqx=out:json&sheet=PlantDataSheet');
    const data = await response.json();

    // Extract the rows from the returned data
    const rows = data.table.rows;
    const plantData = rows.map(row => {
        // Adjust this based on how your data is structured in the sheet
        return row.c.map(cell => cell ? cell.v : '').join(';');
    });

    return plantData;
};

export const parseSemicolonCsv = (csv) => {
    // existing implementation
};

export const splitPipe = (str) => {
    // existing implementation
};

export const monthsFromValue = (value) => {
    // existing implementation
};
