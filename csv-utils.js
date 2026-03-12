function loadPlantData() {
    const sheetId = '1QHJzWztssucMlnozk2tV9ym6gLedgDj4Zh3DzCTFWCY';
    const sheetName = 'PlantDataSheet';
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;  
    console.log("laod data1");

    return fetch(url)
        .then(response => response.text())
        .then(data => parseGoogleSheets(data));
}

function parseGoogleSheets(data) {
    const json = data.substr(47).slice(0, -2); // Remove the callback wrapper
    const parsedData = JSON.parse(json);
    const rows = parsedData.table.rows;

    return rows.map(row => {
        return row.c.map(cell => (cell ? cell.v : '')).join('\t'); // Assuming tab separation
    });
}
