package app.pillshere.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.sp

private val LightColors = lightColorScheme()
private val DarkColors = darkColorScheme()

/** Stock Material 3 type scale bumped uniformly by +2sp for readability. */
val PillshereTypography = Typography(
    displayLarge = TextStyle(fontSize = 57.sp),
    displayMedium = TextStyle(fontSize = 45.sp),
    displaySmall = TextStyle(fontSize = 36.sp),
    headlineLarge = TextStyle(fontSize = 32.sp),
    headlineMedium = TextStyle(fontSize = 30.sp),
    headlineSmall = TextStyle(fontSize = 24.sp),
    titleLarge = TextStyle(fontSize = 24.sp),
    titleMedium = TextStyle(fontSize = 18.sp),
    titleSmall = TextStyle(fontSize = 16.sp),
    bodyLarge = TextStyle(fontSize = 18.sp),
    bodyMedium = TextStyle(fontSize = 16.sp),
    bodySmall = TextStyle(fontSize = 14.sp),
    labelLarge = TextStyle(fontSize = 16.sp),
    labelMedium = TextStyle(fontSize = 14.sp),
    labelSmall = TextStyle(fontSize = 13.sp),
)

@Composable
fun PillshereTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = PillshereTypography,
        content = content,
    )
}
