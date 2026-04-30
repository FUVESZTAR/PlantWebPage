package com.plantnfc.presentation.generator

import android.location.Location
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.plantnfc.domain.model.GpsData
import com.plantnfc.domain.model.NfcRecord
import com.plantnfc.domain.model.NfcType
import com.plantnfc.domain.model.Plant
import com.plantnfc.domain.repository.NfcRecordRepository
import com.plantnfc.domain.repository.PlantRepository
import com.plantnfc.util.GpsPacketCodec
import com.plantnfc.util.LinkBuilder
import com.plantnfc.util.NfcTextCodec
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import javax.inject.Inject

data class GeneratorUiState(
    val plants: List<Plant> = emptyList(),
    val isLoadingPlants: Boolean = false,
    val plantsError: String? = null,

    // Selection
    val selectedPlant: Plant? = null,
    val selectedVariety: String = "",
    val customVariety: String = "",
    val isCustomVariety: Boolean = false,
    val varieties: List<String> = emptyList(),

    // Data fields
    val nfcId: Int = 0,
    val plantId: String = "",
    val latinName: String = "",
    val datum: String = today(),
    val nfcType: NfcType = NfcType.PLANT,
    val serialNumber: String = "",

    // GPS
    val gpsEnabled: Boolean = false,
    val gpsState: GpsState = GpsState.Idle,
    val gpsData: GpsData? = null,
    val gpsPacket: String? = null,

    // Notes
    val notesEnabled: Boolean = false,
    val notes: String = "",

    // Preview / output
    val nfcText: String = "",
    val nfcLink: String = "",
    val nfcTextSizeBytes: Int = 0,
    val nfcLinkSizeBytes: Int = 0,

    // Status
    val statusMessage: StatusMessage? = null,
    val isSaving: Boolean = false,
    val isWritingNfc: Boolean = false,
)

sealed interface GpsState {
    data object Idle : GpsState
    data object Tracking : GpsState
    data class Locked(val lastUpdateMs: Long) : GpsState
}

data class StatusMessage(val text: String, val type: MessageType)
enum class MessageType { SUCCESS, ERROR, INFO }

private fun today(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

@HiltViewModel
class GeneratorViewModel @Inject constructor(
    private val plantRepository: PlantRepository,
    private val nfcRecordRepository: NfcRecordRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(GeneratorUiState())
    val uiState: StateFlow<GeneratorUiState> = _uiState.asStateFlow()

    val plantsFlow = plantRepository.getActivePlants()
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    init {
        loadData()
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Data loading
    // ──────────────────────────────────────────────────────────────────────────

    private fun loadData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingPlants = true) }
            try {
                plantRepository.refreshPlants()
            } catch (_: Exception) { /* use cached */ }

            val nextId = nfcRecordRepository.nextNfcId()
            _uiState.update { it.copy(nfcId = nextId, isLoadingPlants = false) }

            // Observe plant list
            plantsFlow.collect { plants ->
                _uiState.update { s -> s.copy(plants = plants) }
            }
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Selection events
    // ──────────────────────────────────────────────────────────────────────────

    fun selectPlant(plant: Plant?) {
        if (plant == null) { clearForm(); return }
        val varieties = _uiState.value.plants
            .filter { it.nameEn == plant.nameEn || it.nameHu == plant.nameHu }
            .map { it.nameVariety }
            .distinct()

        _uiState.update { s ->
            s.copy(
                selectedPlant  = plant,
                plantId        = plant.plantId,
                latinName      = plant.latinName,
                varieties      = varieties,
                selectedVariety = varieties.firstOrNull { it == "Species" } ?: varieties.firstOrNull() ?: "",
                isCustomVariety = false,
                customVariety  = "",
            )
        }
        updatePreview()
    }

    fun selectVariety(variety: String) {
        if (variety == "__custom__") {
            _uiState.update { it.copy(isCustomVariety = true, selectedVariety = "", customVariety = "") }
        } else {
            // Find matching plant row for this variety
            val plant = _uiState.value.plants.firstOrNull {
                (it.nameEn == _uiState.value.selectedPlant?.nameEn ||
                 it.nameHu == _uiState.value.selectedPlant?.nameHu) &&
                it.nameVariety == variety
            }
            _uiState.update { s ->
                s.copy(
                    selectedVariety = variety,
                    isCustomVariety  = false,
                    plantId          = plant?.plantId ?: s.plantId,
                    latinName        = plant?.latinName ?: s.latinName,
                )
            }
        }
        updatePreview()
    }

    fun setCustomVariety(text: String) {
        _uiState.update { it.copy(customVariety = text) }
        updatePreview()
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Field mutations
    // ──────────────────────────────────────────────────────────────────────────

    fun setNfcId(id: Int) { _uiState.update { it.copy(nfcId = id) }; updatePreview() }
    fun setLatinName(v: String) { _uiState.update { it.copy(latinName = v) }; updatePreview() }
    fun setDatum(v: String) { _uiState.update { it.copy(datum = v) }; updatePreview() }
    fun setNfcType(t: NfcType) { _uiState.update { it.copy(nfcType = t) }; updatePreview() }
    fun setSerialNumber(v: String) { _uiState.update { it.copy(serialNumber = v) } }
    fun setNotes(v: String) { _uiState.update { it.copy(notes = v) }; updatePreview() }
    fun setGpsEnabled(enabled: Boolean) { _uiState.update { it.copy(gpsEnabled = enabled) }; updatePreview() }
    fun setNotesEnabled(enabled: Boolean) { _uiState.update { it.copy(notesEnabled = enabled) }; updatePreview() }

    // ──────────────────────────────────────────────────────────────────────────
    //  GPS
    // ──────────────────────────────────────────────────────────────────────────

    fun onLocationUpdate(location: Location) {
        val gps = GpsData(
            latitude  = location.latitude,
            longitude = location.longitude,
            altitudeM = location.altitude.toInt(),
            accuracyM = location.accuracy.toInt(),
        )
        _uiState.update { it.copy(gpsData = gps, gpsState = GpsState.Tracking) }
    }

    fun lockGpsData() {
        val gps = _uiState.value.gpsData ?: return
        val packet = GpsPacketCodec.pack(gps)
        _uiState.update { it.copy(gpsPacket = packet, gpsState = GpsState.Locked(System.currentTimeMillis())) }
        updatePreview()
    }

    fun clearGps() {
        _uiState.update { it.copy(gpsData = null, gpsPacket = null, gpsState = GpsState.Idle) }
        updatePreview()
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Preview computation (mirrors JS updateNFCPreview)
    // ──────────────────────────────────────────────────────────────────────────

    private fun updatePreview() {
        val s = _uiState.value
        val variety = if (s.isCustomVariety) s.customVariety else s.selectedVariety
        val plantName = s.selectedPlant?.nameEn ?: ""

        val record = NfcRecord(
            nfcId     = s.nfcId,
            plantId   = s.plantId,
            plantName = plantName,
            variety   = variety,
            latinName = s.latinName,
            nfcType   = s.nfcType,
            datum     = s.datum,
            gpsPacket = s.gpsPacket,
            other     = s.notes.takeIf { s.notesEnabled && it.isNotBlank() },
        )

        val text = NfcTextCodec.encode(record, includeGps = s.gpsEnabled, includeOther = s.notesEnabled)
        val link = if (s.plantId.isNotBlank()) LinkBuilder.buildPlantLink(s.plantId) else ""

        _uiState.update { it.copy(
            nfcText          = text,
            nfcLink          = link,
            nfcTextSizeBytes = NfcTextCodec.sizeBytes(text),
            nfcLinkSizeBytes = NfcTextCodec.sizeBytes(link),
        )}
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Actions
    // ──────────────────────────────────────────────────────────────────────────

    fun generateAndRefreshId() {
        viewModelScope.launch {
            val next = nfcRecordRepository.nextNfcId()
            _uiState.update { it.copy(nfcId = next) }
            updatePreview()
        }
    }

    fun saveRecord() {
        val s = _uiState.value
        if (s.selectedPlant == null) {
            showStatus("Please select a plant first", MessageType.ERROR); return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true) }
            try {
                val variety = if (s.isCustomVariety) s.customVariety else s.selectedVariety
                val record = NfcRecord(
                    nfcId        = s.nfcId,
                    plantId      = s.plantId,
                    plantName    = s.selectedPlant.nameEn,
                    variety      = variety,
                    latinName    = s.latinName,
                    nfcType      = s.nfcType,
                    datum        = s.datum,
                    gpsPacket    = s.gpsPacket,
                    other        = s.notes.takeIf { s.notesEnabled && it.isNotBlank() },
                    serialNumber = s.serialNumber.takeIf { it.isNotBlank() },
                    link         = s.nfcLink,
                )
                nfcRecordRepository.insert(record)
                showStatus("NFC saved to list!", MessageType.SUCCESS)
                generateAndRefreshId()
            } catch (e: Exception) {
                showStatus("Save failed: ${e.message}", MessageType.ERROR)
            } finally {
                _uiState.update { it.copy(isSaving = false) }
            }
        }
    }

    fun onNfcTagDetected(serialNumber: String) {
        _uiState.update { it.copy(serialNumber = serialNumber) }
    }

    fun onNfcWriteSuccess() = showStatus("Successfully written to NFC tag! ✅", MessageType.SUCCESS)
    fun onNfcWriteError(msg: String) = showStatus("NFC write error: $msg", MessageType.ERROR)
    fun onNfcNotSupported() = showStatus("NFC is not supported on this device", MessageType.ERROR)

    fun clearForm() {
        _uiState.update { GeneratorUiState(nfcId = it.nfcId) }
        updatePreview()
    }

    fun dismissStatus() = _uiState.update { it.copy(statusMessage = null) }

    private fun showStatus(text: String, type: MessageType) {
        _uiState.update { it.copy(statusMessage = StatusMessage(text, type)) }
    }
}
