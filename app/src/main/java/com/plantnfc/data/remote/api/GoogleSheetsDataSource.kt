package com.plantnfc.data.remote.api

import com.plantnfc.domain.model.Plant
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.URL
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Fetches plant data from the public Google Sheets Visualization API.
 *
 * Endpoint pattern:
 *   https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:json&sheet={SHEET}&tq={QUERY}
 *
 * The response is wrapped in:
 *   google.visualization.Query.setResponse({...});
 * which we strip before JSON-parsing.
 */
@Singleton
class GoogleSheetsDataSource @Inject constructor() {

    companion object {
        // ── Configure these for your Google Sheet ──────────────────────────────
        const val SHEET_ID   = "1QHJzWztssucMlnozk2tV9ym6gLedgDj4Zh3DzCTFWCY"
        const val SHEET_NAME = "plant_list"

        // Column mapping (adjust if your sheet differs):
        //   A=Plant_ID, B=LatinName, C=Name_Variety, D=Name_HU, E=Name_EN
        //   CR = Active_in_NFC  (column 96 in 0-based is CR)
        private const val TQ_ACTIVE_NFC = "select A, B, C, D, E where CR = 'Y'"
        // ──────────────────────────────────────────────────────────────────────
    }

    /**
     * Loads plants where Active_in_NFC = 'Y', matching the web app's
     * [loadActiveNFCPlants] function.
     */
    suspend fun loadActivePlants(): List<Plant> = withContext(Dispatchers.IO) {
        val params = buildString {
            append("tqx=out:json")
            append("&sheet=").append(SHEET_NAME)
            append("&tq=").append(java.net.URLEncoder.encode(TQ_ACTIVE_NFC, "UTF-8"))
        }
        val url = "https://docs.google.com/spreadsheets/d/$SHEET_ID/gviz/tq?$params"
        val raw  = URL(url).readText()
        parseGvizResponse(raw)
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Response parser
    // ──────────────────────────────────────────────────────────────────────────

    private fun parseGvizResponse(raw: String): List<Plant> {
        // Strip JS wrapper: google.visualization.Query.setResponse({...});
        val jsonStr = raw
            .substringAfter("google.visualization.Query.setResponse(")
            .trimEnd(';', ')')
            .trim()

        val root  = JSONObject(jsonStr)
        val table = root.getJSONObject("table")
        val cols  = table.getJSONArray("cols")
        val rows  = table.getJSONArray("rows")

        // Build header list
        val headers = (0 until cols.length()).map { i ->
            val col   = cols.getJSONObject(i)
            val label = col.optString("label").trim()
            label.ifEmpty { col.optString("id") }
        }

        return (0 until rows.length()).mapNotNull { ri ->
            val row = rows.optJSONObject(ri) ?: return@mapNotNull null
            val cells = row.optJSONArray("c") ?: return@mapNotNull null

            val entry = mutableMapOf<String, String>()
            headers.forEachIndexed { ci, header ->
                val cell  = cells.optJSONObject(ci)
                val value = cell?.opt("v")?.toString() ?: ""
                entry[header] = value
            }

            // Skip empty rows
            if (entry.values.all { it.isBlank() }) return@mapNotNull null

            Plant(
                plantId     = entry["Plant_ID"] ?: "",
                latinName   = entry["LatinName"] ?: "",
                nameVariety = entry["Name_Variety"] ?: "",
                nameHu      = entry["Name_HU"] ?: "",
                nameEn      = entry["Name_EN"] ?: "",
                activeInNfc = true,
            )
        }
    }
}
