package app.pillshere.ui.nav

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Medication
import androidx.compose.material.icons.filled.Today
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import app.pillshere.di.AppContainer
import app.pillshere.ui.history.HistoryScreen
import app.pillshere.ui.meds.MedEditScreen
import app.pillshere.ui.meds.MedListScreen
import app.pillshere.ui.today.TodayScreen

private object Routes {
    const val TODAY = "today"
    const val MEDS = "meds"
    const val HISTORY = "history"
    const val MED_NEW = "meds/new"
    const val MED_EDIT = "meds/edit/{medId}"
    fun medEdit(id: String) = "meds/edit/$id"
}

private data class TopDest(val route: String, val label: String, val icon: @Composable () -> Unit)

@Composable
fun PillshereNav(container: AppContainer) {
    val nav = rememberNavController()
    val entry by nav.currentBackStackEntryAsState()
    val currentRoute = entry?.destination?.route

    val tabs = listOf(
        TopDest(Routes.TODAY, "Today") { Icon(Icons.Filled.Today, contentDescription = null) },
        TopDest(Routes.MEDS, "Meds") { Icon(Icons.Filled.Medication, contentDescription = null) },
        TopDest(Routes.HISTORY, "History") { Icon(Icons.Filled.History, contentDescription = null) },
    )

    Scaffold(
        bottomBar = {
            val showBar = tabs.any { it.route == currentRoute }
            if (showBar) {
                NavigationBar {
                    tabs.forEach { tab ->
                        val selected = entry?.destination?.hierarchy?.any { it.route == tab.route } == true
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                nav.navigate(tab.route) {
                                    popUpTo(Routes.TODAY) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = tab.icon,
                            label = { Text(tab.label) },
                        )
                    }
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = nav,
            startDestination = Routes.TODAY,
            modifier = androidx.compose.ui.Modifier.padding(padding),
        ) {
            composable(Routes.TODAY) { TodayScreen(container) }
            composable(Routes.MEDS) {
                MedListScreen(
                    container = container,
                    onAdd = { nav.navigate(Routes.MED_NEW) },
                    onEdit = { id -> nav.navigate(Routes.medEdit(id)) },
                )
            }
            composable(Routes.HISTORY) { HistoryScreen(container) }
            composable(Routes.MED_NEW) {
                MedEditScreen(container = container, medId = null, onDone = { nav.popBackStack() })
            }
            composable(Routes.MED_EDIT) { backStack ->
                val id = backStack.arguments?.getString("medId")
                MedEditScreen(container = container, medId = id, onDone = { nav.popBackStack() })
            }
        }
    }
}
