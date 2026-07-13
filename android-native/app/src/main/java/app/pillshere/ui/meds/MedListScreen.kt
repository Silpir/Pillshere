package app.pillshere.ui.meds

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Card
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.pillshere.di.AppContainer

@Composable
fun MedListScreen(
    container: AppContainer,
    onAdd: () -> Unit,
    onEdit: (String) -> Unit,
) {
    val meds by container.medRepository.observeAll().collectAsState(initial = emptyList())
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
                                Text(med.name, style = androidx.compose.material3.MaterialTheme.typography.titleMedium)
                                Text("${med.dosageText}  ·  ${med.times.size} time(s)/day")
                                Text("${med.currentPills} pills left")
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
}
