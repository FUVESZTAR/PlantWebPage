async function loadPlantData() {
    const sheetId = '1QHJzWztssucMlnozk2tV9ym6gLedgDj4Zh3DzCTFWCY';
    const range = 'PlantDataSheet';
    const apiKey = 'YOUR_API_KEY';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.values;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}