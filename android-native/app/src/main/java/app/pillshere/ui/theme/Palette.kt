package app.pillshere.ui.theme

import androidx.compose.ui.graphics.Color

/** Fixed palette of 10 pill colors; Medication.colorIndex maps into this list. */
object Palette {
    val Colors = listOf(
        Color(0xFFE57373), // red
        Color(0xFFF2984A), // orange
        Color(0xFFFFC65C), // amber
        Color(0xFF8BC34A), // green
        Color(0xFF4DB6AC), // teal
        Color(0xFF4FC3F7), // cyan
        Color(0xFF64B5F6), // blue
        Color(0xFF9FA8DA), // indigo
        Color(0xFFBA68C8), // purple
        Color(0xFFF06292), // pink
    )

    fun color(index: Int): Color = Colors.getOrElse(index) { Colors[0] }

    /** Translucent fill for cards: [strength] fraction over the surface. */
    fun tint(index: Int, strength: Float): Color = color(index).copy(alpha = strength)
}