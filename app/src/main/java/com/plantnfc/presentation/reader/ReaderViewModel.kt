package com.plantnfc.presentation.reader

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.plantnfc.domain.model.GpsData
import com.plantnfc.domain.model.NfcRecord
import com.plantnfc.util.GpsPacketCodec
import com.plantnfc.util.NfcTextCodec
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject

data class ReaderUiState(
    val nfcText: String = "",
    val nfcLink: String = "",
    val nfcTextSizeBytes: Int = 0,
    val nfcLinkSizeBytes: Int = 0,
    val serialNumber: String = "",

    // Decoded fields
    val nfcId: String = "",
    val plantId: String = "",
    val plantName: String = "",
    val variety: String = "",
    val latinName: String = "",
    val datum: String = "",
    val nfcType: String = "",
    val other: String = "",

    // GPS
    val gpsData: GpsData? = null,
    val gpsPacketRaw: String = "",
    val gpsPacketSizeBytes: Int = 0,

    val isScanning: Boolean = false,
    val lastTagId: String = "",  // debounce: skip duplicate reads
    val statusMessage: String? = null,
)

@HiltViewModel
class ReaderViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(ReaderUiState())
    val uiState: StateFlow<ReaderUiState> = _uiState.asStateFlow()

    fun onNfcTagScanned(
        tagId: String,
        textRecords: List<String>,
        urlRecords: List<String>,
    ) {
        // Debounce: skip same tag scanned twice in a row
        if (tagId == _uiState.value.lastTagId) return

        val text = textRecords.firstOrNull() ?: ""
        val link = urlRecords.firstOrNull() ?: ""

        val decoded = NfcTextCodec.decodeToMap(text)
        val gpsRaw  = decoded["pos"] ?: ""
        val gpsData = if (gpsRaw.isNotBlank()) GpsPacketCodec.unpack(gpsRaw) else null

        _uiState.update {
            it.copy(
                nfcText          = text,
                nfcLink          = link,
                nfcTextSizeBytes = NfcTextCodec.sizeBytes(text),
                nfcLinkSizeBytes = NfcTextCodec.sizeBytes(link),
                serialNumber     = tagId,
                lastTagId        = tagId,

                nfcId     = decoded["ncfId"] ?: "",
                plantId   = decoded["plantId"] ?: "",
                plantName = decoded["name"] ?: "",
                variety   = decoded["variety"] ?: "",
                latinName = decoded["latinName"] ?: "",
                datum     = decoded["datum"] ?: "",
                nfcType   = decoded["nfcType"] ?: "",
                other     = decoded["other"] ?: "",

                gpsData          = gpsData,
                gpsPacketRaw     = gpsRaw,
                gpsPacketSizeBytes = if (gpsRaw.isNotBlank()) NfcTextCodec.sizeBytes(gpsRaw) else 0,
                isScanning       = false,
                statusMessage    = null,
            )
        }
    }

    fun setScanning(scanning: Boolean) = _uiState.update { it.copy(isScanning = scanning) }

    fun clearFields() = _uiState.update {
        ReaderUiState() // reset everything
    }

    fun onScanError(msg: String) = _uiState.update { it.copy(statusMessage = msg, isScanning = false) }
    fun dismissStatus() = _uiState.update { it.copy(statusMessage = null) }
}
