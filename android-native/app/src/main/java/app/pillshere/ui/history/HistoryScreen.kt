package app.pillshere.ui.history

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material3.Card
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import android.widget.Toast
import app.pillshere.di.AppContainer
import kotlinx.coroutines.launch
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Composable
fun HistoryScreen(container: AppContainer) {
    val entries by container.doseRepository.observeRecent().collectAsState(initial = emptyList())
    val meds by container.medRepository.observeAll().collectAsState(initial = emptyList())
    val medNameById = remember(meds) { meds.associate { it.id to it.name } }
    val fmt = remember { DateTimeFormatter.ofPattern("MMM d, h:mm a").withZone(ZoneId.systemDefault()) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    val exportLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.CreateDocument("application/json")
    ) { uri ->
        if (uri != null) scope.launch {
            runCatching { container.backup.exportTo(uri) }
                .onSuccess { n ->
                    Toast.makeText(context, "Exported $n records", Toast.LENGTH_SHORT).show()
                }
                .onFailure {
                    Toast.makeText(context, "Export failed: ${it.message}", Toast.LENGTH_LONG).show()
                }
        }
    }
    val importLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri != null) scope.launch {
            runCatching { container.backup.importFrom(uri) }
                .onSuccess { (m, d) ->
                    Toast.makeText(context, "Imported $m meds, $d doses", Toast.LENGTH_SHORT).show()
                }
                .onFailure {
                    Toast.makeText(context, "Import failed: ${it.message}", Toast.LENGTH_LONG).show()
                }
        }
    }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("History", style = androidx.compose.material3.MaterialTheme.typography.headlineMedium)
        Row(
            Modifier.fillMaxWidth().padding(top = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Button(onClick = {
                val ts = java.time.LocalDateTime.now().toString().replace(':', '-').substringBefore('.')
                exportLauncher.launch("pillshere-backup-$ts.json")
            }) { Text("Export backup") }
            OutlinedButton(onClick = {
                importLauncher.launch(arrayOf("application/json", "*/*"))
            }) { Text("Import backup") }
        }
        if (entries.isEmpty()) {
            Text("No dose history yet.", Modifier.padding(top = 16.dp))
            return@Column
        }
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(top = 12.dp),
        ) {
            items(entries) { entry ->
                Card(Modifier.fillMaxSize()) {
                    Column(Modifier.padding(12.dp)) {
                        Text(medNameById[entry.medId] ?: "(deleted)", style = androidx.compose.material3.MaterialTheme.typography.titleMedium)
                        Text("${entry.status.name.lowercase().replaceFirstChar { it.uppercase() }}  ·  ${fmt.format(entry.actedAt)}")
                        OutlinedButton(
                            onClick = { scope.launch { container.doseRepository.undo(entry) } },
                            modifier = Modifier.padding(top = 8.dp),
                        ) { Text("Undo") }
                    }
                }
            }
        }
    }
}
