package app.pillshere.ui.today

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.weight
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.TextButton
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import android.widget.Toast
import app.pillshere.data.db.entities.Medication
import app.pillshere.data.db.entities.DoseStatus
import app.pillshere.di.AppContainer
import app.pillshere.domain.Schedule
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.Duration
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private data class DueDose(val med: Medication, val at: Instant)

@Composable
fun TodayScreen(container: AppContainer) {
    val meds by container.medRepository.observeActive().collectAsState(initial = emptyList())
    val doseLog by container.doseRepository.observeRecent().collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val fmt = remember { DateTimeFormatter.ofPattern("h:mm a").withZone(ZoneId.systemDefault()) }

    val dueToday = remember(meds) {
        val nowInstant = Instant.now()
        val end = nowInstant.plusSeconds(24 * 3600)
        meds.flatMap { med ->
            Schedule.upcomingFireTimes(med, now = nowInstant.minusSeconds(3600), windowHours = 25)
                .filter { it.isBefore(end) }
                .map { DueDose(med, it) }
        }.sortedBy { it.at }
    }

    // Confirmation dialog state. `warning` is non-null when we detected a
    // recent TAKEN entry for the same med so the user can back out of an
    // accidental double-tap.
    var pending by remember { mutableStateOf<DueDose?>(null) }
    var warning by remember { mutableStateOf<String?>(null) }

    fun onTakenTapped(due: DueDose) {
        scope.launch {
            val last = container.doseRepository.lastTaken(due.med.id)
            warning = last
                ?.takeIf { Duration.between(it.actedAt, Instant.now()).toMinutes() < 30 }
                ?.let { "You already took ${due.med.name} at ${fmt.format(it.actedAt)}. Are you sure?" }
            pending = due
        }
    }

    fun confirmTaken() {
        val due = pending ?: return
        pending = null; warning = null
        scope.launch {
            container.doseRepository.recordTaken(due.med.id, due.at)
            container.reminders.cancelMissedCheck(due.med.id, due.at)
            Toast.makeText(context, "Pills taken!", Toast.LENGTH_SHORT).show()
        }
    }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Today", style = MaterialTheme.typography.headlineMedium)
        if (dueToday.isEmpty()) {
            Text("Nothing scheduled in the next 24 hours.", Modifier.padding(top = 16.dp))
            return@Column
        }
        // Few cards → let each card expand to fill the screen. Many cards →
        // scroll at their natural size. `weight` inside LazyColumn is not
        // valid, so switch containers.
        if (dueToday.size <= 2) {
            Column(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(top = 12.dp).fillMaxSize(),
            ) {
                dueToday.forEach { due ->
                    DueDoseCard(
                        due = due,
                        doseLog = doseLog,
                        fmt = fmt,
                        onTaken = ::onTakenTapped,
                        onSkip = { d ->
                            scope.launch {
                                container.doseRepository.recordSkipped(d.med.id, d.at)
                                container.reminders.cancelMissedCheck(d.med.id, d.at)
                            }
                        },
                        modifier = Modifier.fillMaxWidth().weight(1f),
                    )
                }
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(top = 12.dp),
            ) {
                items(dueToday) { due ->
                    DueDoseCard(
                        due = due,
                        doseLog = doseLog,
                        fmt = fmt,
                        onTaken = ::onTakenTapped,
                        onSkip = { d ->
                            scope.launch {
                                container.doseRepository.recordSkipped(d.med.id, d.at)
                                container.reminders.cancelMissedCheck(d.med.id, d.at)
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }
    }

    val current = pending
    if (current != null) {
        AlertDialog(
            onDismissRequest = { pending = null; warning = null },
            title = { Text("Confirm dose") },
            text = {
                Text(
                    warning
                        ?: "Log ${current.med.name} (${current.med.pillsPerDose} pill(s)) as taken?"
                )
            },
            confirmButton = { TextButton(onClick = ::confirmTaken) { Text("Yes, taken") } },
            dismissButton = {
                TextButton(onClick = { pending = null; warning = null }) { Text("Cancel") }
            },
        )
    }
}

@Composable
private fun DueDoseCard(
    due: DueDose,
    doseLog: List<app.pillshere.data.db.entities.DoseLog>,
    fmt: DateTimeFormatter,
    onTaken: (DueDose) -> Unit,
    onSkip: (DueDose) -> Unit,
    modifier: Modifier = Modifier,
) {
    val taken = remember(doseLog, due) {
        doseLog.any {
            it.medId == due.med.id &&
                it.scheduledFor == due.at &&
                it.status == DoseStatus.TAKEN
        }
    }
    val cardColors = if (taken) {
        CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)
    } else CardDefaults.cardColors()
    Card(modifier, colors = cardColors) {
        Column(Modifier.padding(12.dp).fillMaxSize()) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    due.med.name,
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.weight(1f),
                )
                if (taken) {
                    AssistChip(
                        onClick = {},
                        enabled = false,
                        label = { Text("Taken today") },
                        colors = AssistChipDefaults.assistChipColors(
                            disabledLabelColor = MaterialTheme.colorScheme.onSecondaryContainer,
                        ),
                    )
                }
            }
            Text("${due.med.dosageText}  ·  ${fmt.format(due.at)}")
            Spacer(Modifier.weight(1f))
            Row(
                Modifier.padding(top = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Button(enabled = !taken, onClick = { onTaken(due) }) { Text("Taken") }
                OutlinedButton(enabled = !taken, onClick = { onSkip(due) }) { Text("Skip") }
            }
        }
    }
}
