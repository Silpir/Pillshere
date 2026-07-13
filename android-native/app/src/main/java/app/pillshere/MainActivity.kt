package app.pillshere

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import app.pillshere.ui.nav.PillshereNav
import app.pillshere.ui.theme.PillshereTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val app = application as PillshereApp
        setContent {
            PillshereTheme {
                PillshereNav(container = app.container)
            }
        }
    }
}
