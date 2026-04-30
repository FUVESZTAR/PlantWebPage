package com.plantnfc.util

import android.util.Base64
import com.plantnfc.domain.model.GpsData
import com.plantnfc.domain.model.NfcRecord
import com.plantnfc.domain.model.NfcType
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.roundToInt

// ──────────────────────────────────────────────────────────────────────────────
//  GPS packet codec
//  Binary layout (12 bytes, big-endian):
//    [0..3]  UInt32  lat = (lat + 90)  * 1_000_000
//    [4..7]  UInt32  lon = (lon + 180) * 1_000_000
//    [8..9]  UInt16  alt = alt + 1000
//    [10..11] UInt16 acc = acc + 1000
// ──────────────────────────────────────────────────────────────────────────────

object GpsPacketCodec {

    /** Encodes GPS to the compact "L|<base64>|L" packet. */
    fun pack(gps: GpsData): String {
        val buf = ByteBuffer.allocate(12).order(ByteOrder.BIG_ENDIAN)
        buf.putInt(((gps.latitude + 90.0) * 1_000_000).roundToInt())
        buf.putInt(((gps.longitude + 180.0) * 1_000_000).roundToInt())
        buf.putShort((gps.altitudeM + 1000).toShort())
        buf.putShort((gps.accuracyM + 1000).toShort())
        val b64 = Base64.encodeToString(buf.array(), Base64.NO_WRAP)
        return "L|$b64|L"
    }

    /** Decodes a "L|<base64>|L" or raw base64 string into GpsData. Returns null on failure. */
    fun unpack(packet: String): GpsData? = runCatching {
        val b64 = packet
            .removePrefix("L|")
            .removeSuffix("|L")
            .trim()
        val bytes = Base64.decode(b64, Base64.NO_WRAP)
        val buf = ByteBuffer.wrap(bytes).order(ByteOrder.BIG_ENDIAN)
        val latInt = buf.int.toLong() and 0xFFFFFFFFL
        val lonInt = buf.int.toLong() and 0xFFFFFFFFL
        val altInt = buf.short.toInt() and 0xFFFF
        val accInt = buf.short.toInt() and 0xFFFF
        GpsData(
            latitude  = latInt / 1_000_000.0 - 90.0,
            longitude = lonInt / 1_000_000.0 - 180.0,
            altitudeM = altInt - 1000,
            accuracyM = accInt - 1000,
        )
    }.getOrNull()

    /** Returns packet size in UTF-8 bytes (same as JS calculateSizeInBytes). */
    fun packetSizeBytes(packet: String): Int = packet.toByteArray(Charsets.UTF_8).size
}

// ──────────────────────────────────────────────────────────────────────────────
//  NFC text encoder / decoder
//  Format: nfcId/plantId/name/variety/latinName/nfcType/datum[/gpsPacket][/other]/
// ──────────────────────────────────────────────────────────────────────────────

object NfcTextCodec {

    private val KEYS = listOf(
        "ncfId", "plantId", "name", "variety", "latinName", "nfcType", "datum", "pos", "other"
    )

    /**
     * Encodes an NfcRecord to the slash-delimited text payload.
     * GPS packet and "other" fields are optional (toggle-driven).
     */
    fun encode(
        record: NfcRecord,
        includeGps: Boolean = record.gpsPacket != null,
        includeOther: Boolean = !record.other.isNullOrBlank(),
    ): String {
        val sb = StringBuilder()
        sb.append(record.nfcId).append('/')
        sb.append(record.plantId).append('/')
        sb.append(record.plantName).append('/')
        sb.append(record.variety).append('/')
        sb.append(record.latinName).append('/')
        sb.append(record.nfcType.code).append('/')
        sb.append(record.datum)
        if (includeGps && !record.gpsPacket.isNullOrBlank()) {
            sb.append('/').append(record.gpsPacket)
        }
        if (includeOther && !record.other.isNullOrBlank()) {
            sb.append('/').append(record.other)
        }
        sb.append('/')
        return sb.toString()
    }

    /**
     * Decodes a slash-delimited NFC text into a Map<String, String> keyed by KEYS.
     * Follows the same logic as the JS decodeToMap().
     */
    fun decodeToMap(text: String): Map<String, String> {
        val parts = text.split('/')
        return KEYS.mapIndexed { index, key ->
            key to (parts.getOrNull(index)?.trim() ?: "")
        }.toMap()
    }

    /**
     * Parses the decoded map into a partial NfcRecord (no id / link / serialNumber).
     */
    fun parseRecord(text: String): NfcRecord {
        val m = decodeToMap(text)
        return NfcRecord(
            nfcId      = m["ncfId"]?.toIntOrNull() ?: 0,
            plantId    = m["plantId"] ?: "",
            plantName  = m["name"] ?: "",
            variety    = m["variety"] ?: "",
            latinName  = m["latinName"] ?: "",
            nfcType    = NfcType.fromCode(m["nfcType"] ?: "n"),
            datum      = m["datum"] ?: "",
            gpsPacket  = m["pos"]?.takeIf { it.startsWith("L|") },
            other      = m["other"]?.takeIf { it.isNotBlank() },
        )
    }

    /** UTF-8 byte size of the text (matches JS calculateSizeInBytes). */
    fun sizeBytes(text: String): Int = text.toByteArray(Charsets.UTF_8).size

    /** Human-readable size string, e.g. "42 B" / "1.23 KB". */
    fun formatSize(bytes: Int): String = when {
        bytes < 1024        -> "$bytes B"
        bytes < 1024 * 1024 -> "${"%.2f".format(bytes / 1024.0)} KB"
        else                -> "${"%.2f".format(bytes / (1024.0 * 1024.0))} MB"
    }
}

/** Generates the plant-detail link, mirroring the JS origin+path pattern. */
object LinkBuilder {
    private const val BASE_URL = "https://your-domain.com/W/P.html"

    fun buildPlantLink(plantId: String): String =
        "$BASE_URL?id=${java.net.URLEncoder.encode(plantId, "UTF-8")}"
}
