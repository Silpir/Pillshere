package app.pillshere.ui.meds

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.TextButton
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
import app.pillshere.notifications.Reminders
import kotlinx.coroutines.flow.first
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
    var notifyEnabled by remember { mutableStateOf(true) }
    var missedAfter by remember { mutableStateOf(15) }
    var createdAt by remember { mutableStateOf(Instant.now()) }
    var confirmDelete by remember { mutableStateOf(false) }
    var loaded by remember { mutableStateOf(medId == null) }
    var colorIndex by remember { mutableStateOf(-1) }

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
                notifyEnabled = m.notificationsEnabled
                missedAfter = m.missedAfterMinutes
                createdAt = m.createdAt
                colorIndex = m.colorIndex
            }
            loaded = true
        } else {
            // New med: take the first palette slot no active medication uses yet.
            val used = container.medRepository.observeAll().first().map { it.colorIndex }.toSet()
            colorIndex = (0 until app.pillshere.ui.theme.Palette.Colors.size).firstOrNull { it !in used } ?: 0
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

        Text("Pill color")
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            app.pillshere.ui.theme.Palette.Colors.forEachIndexed { i, c ->
                Box(
                    Modifier
                        .size(34.dp)
                        .then(if (colorIndex == i) {
                            Modifier.border(2.dp, MaterialTheme.colorScheme.onBackground, RoundedCornerShape(17.dp))
                        } else {
                            Modifier
                        })
                        .background(c, RoundedCornerShape(17.dp))
                        .clickable { colorIndex = i },
                )
            }
        }

        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            Text("Send notifications", Modifier.weight(1f))
            Switch(checked = notifyEnabled, onCheckedChange = { notifyEnabled = it })
        }
        Text(
            "Remind me if not confirmed after",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Reminders.MISSED_DELAY_OPTIONS.forEach { minutes ->
                FilterChip(
                    selected = missedAfter == minutes,
                    enabled = notifyEnabled,
                    onClick = { missedAfter = minutes },
                    label = { Text("${minutes}m") },
                )
            }
        }

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
                    createdAt = createdAt,
                    archivedAt = null,
                    notificationsEnabled = notifyEnabled,
                    missedAfterMinutes = missedAfter,
                    colorIndex = colorIndex,
                )
                scope.launch {
                    container.reminders.cancelAll(med)
                    container.medRepository.upsert(med)
                    container.reminders.scheduleNextWindow(med)
                    onDone()
                }
            }) { Text("Save") }
            OutlinedButton(onClick = onDone) { Text("Cancel") }
            if (medId != null) {
                TextButton(onClick = { confirmDelete = true }) { Text("Delete") }
            }
        }
    }

    if (confirmDelete && medId != null) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("Delete medication?") },
            text = { Text("This removes ${name.ifBlank { "this medication" }} and its logged history.") },
            confirmButton = {
                TextButton(onClick = {
                    confirmDelete = false
                    scope.launch {
                        container.medRepository.byId(medId)?.let {
                            container.reminders.cancelAll(it)
                            container.medRepository.delete(it)
                        }
                        onDone()
                    }
                }) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancel") } },
        )
    }
}
