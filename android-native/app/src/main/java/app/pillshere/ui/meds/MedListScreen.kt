package app.pillshere.ui.meds

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.foundation.layout.Row
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.pillshere.di.AppContainer
import app.pillshere.data.db.entities.Medication
import kotlinx.coroutines.launch

@Composable
fun MedListScreen(
    container: AppContainer,
    onAdd: () -> Unit,
    onEdit: (String) -> Unit,
) {
    val meds by container.medRepository.observeAll().collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()
    var pendingDelete by remember { mutableStateOf<Medication?>(null) }
    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize().padding(16.dp)) {
            Text("Medications", style = androidx.compose.material3.MaterialTheme.typography.headlineMedium)
            if (meds.isEmpty()) {
                Text("No medications yet. Tap + to add one.", Modifier.padding(top = 16.dp))
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(top = 12.dp),
                ) {
                    items(meds) { med ->
                        Card(
                            Modifier
                                .fillMaxSize()
                                .clickable { onEdit(med.id) },
                        ) {
                            Column(Modifier.padding(12.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Box(
                                        Modifier
                                            .size(14.dp)
                                            .background(app.pillshere.ui.theme.Palette.color(med.colorIndex), shape = androidx.compose.foundation.shape.RoundedCornerShape(7.dp)),
                                    )
                                    Text(
                                        med.name,
                                        style = MaterialTheme.typography.titleMedium,
                                        modifier = Modifier.weight(1f),
                                    )
                                    IconButton(onClick = { pendingDelete = med }) {
                                        Icon(Icons.Filled.Delete, contentDescription = "Delete ${med.name}")
                                    }
                                }
                                Text("${med.dosageText}  ·  ${med.times.size} time(s)/day")
                                Text("${med.currentPills} pills left")
                                if (!med.notificationsEnabled) {
                                    Text(
                                        "Notifications off",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
        FloatingActionButton(
            onClick = onAdd,
            modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp),
        ) { Icon(Icons.Filled.Add, contentDescription = "Add medication") }
    }

    val target = pendingDelete
    if (target != null) {
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text("Delete ${target.name}?") },
            text = { Text("This removes the medication, its reminders, and its logged history.") },
            confirmButton = {
                TextButton(onClick = {
                    pendingDelete = null
                    scope.launch {
                        container.reminders.cancelAll(target)
                        container.medRepository.delete(target)
                    }
                }) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { pendingDelete = null }) { Text("Cancel") } },
        )
    }
}
