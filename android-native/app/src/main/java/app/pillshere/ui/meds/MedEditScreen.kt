package app.pillshere.ui.meds

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.pillshere.data.db.entities.Medication
import app.pillshere.di.AppContainer
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.UUID

@Composable
fun MedEditScreen(
    container: AppContainer,
    medId: String?,
    onDone: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var name by remember { mutableStateOf("") }
    var dosageText by remember { mutableStateOf("") }
    var pillsPerDose by remember { mutableStateOf("1") }
    var currentPills by remember { mutableStateOf("30") }
    var lowThreshold by remember { mutableStateOf("5") }
    var timesText by remember { mutableStateOf("08:00, 20:00") }
    var loaded by remember { mutableStateOf(medId == null) }

    LaunchedEffect(medId) {
        if (medId != null) {
            container.medRepository.byId(medId)?.let { m ->
                name = m.name
                dosageText = m.dosageText
                pillsPerDose = m.pillsPerDose.toString()
                currentPills = m.currentPills.toString()
                lowThreshold = m.lowSupplyThreshold.toString()
                timesText = m.times.joinToString(", ") {
                    it.format(DateTimeFormatter.ofPattern("HH:mm"))
                }
            }
            loaded = true
        }
    }

    if (!loaded) return

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            if (medId == null) "New medication" else "Edit medication",
            style = androidx.compose.material3.MaterialTheme.typography.headlineMedium,
        )
        OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Name") })
        OutlinedTextField(value = dosageText, onValueChange = { dosageText = it }, label = { Text("Dose (e.g. 10 mg)") })
        OutlinedTextField(value = pillsPerDose, onValueChange = { pillsPerDose = it }, label = { Text("Pills per dose") })
        OutlinedTextField(value = currentPills, onValueChange = { currentPills = it }, label = { Text("Current pills") })
        OutlinedTextField(value = lowThreshold, onValueChange = { lowThreshold = it }, label = { Text("Low-supply alert at") })
        OutlinedTextField(
            value = timesText,
            onValueChange = { timesText = it },
            label = { Text("Times (HH:mm, comma-separated)") },
        )

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = {
                val parsedTimes = timesText
                    .split(",")
                    .map { it.trim() }
                    .filter { it.isNotEmpty() }
                    .mapNotNull { runCatching { LocalTime.parse(it, DateTimeFormatter.ofPattern("HH:mm")) }.getOrNull() }
                val id = medId ?: UUID.randomUUID().toString()
                val med = Medication(
                    id = id,
                    name = name.trim(),
                    dosageText = dosageText.trim(),
                    pillsPerDose = pillsPerDose.toIntOrNull() ?: 1,
                    currentPills = currentPills.toIntOrNull() ?: 0,
                    lowSupplyThreshold = lowThreshold.toIntOrNull() ?: 0,
                    times = parsedTimes,
                    createdAt = Instant.now(),
                    archivedAt = null,
                )
                scope.launch {
                    container.medRepository.upsert(med)
                    container.reminders.scheduleNextWindow(med)
                    onDone()
                }
            }) { Text("Save") }
            OutlinedButton(onClick = onDone) { Text("Cancel") }
        }
    }
}
