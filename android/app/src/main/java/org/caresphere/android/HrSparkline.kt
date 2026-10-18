package org.caresphere.android

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.view.View

/** Only readings the connected monitor actually sent; nothing interpolated or generated. */
object HrSparkline {
    const val LIMIT = 36
    private val RANGE = 20..250

    fun append(samples: List<Int>, bpm: Int?): List<Int> =
        if (bpm == null || bpm !in RANGE) samples else (samples + bpm).takeLast(LIMIT)

    /** Points scaled inside the view; empty below two samples so no line implies data. */
    fun points(samples: List<Int>, width: Float, height: Float, pad: Float = 2f): List<Pair<Float, Float>> {
        if (samples.size < 2 || width <= 0f || height <= 0f) return emptyList()
        val min = samples.min() - 2f
        val max = samples.max() + 2f
        val span = (max - min).takeIf { it > 0f } ?: 1f
        val usable = (height - pad * 2).coerceAtLeast(0f)
        val last = samples.size - 1
        return samples.mapIndexed { index, value ->
            index.toFloat() / last * width to pad + (1f - (value - min) / span) * usable
        }
    }
}

class SparklineView(context: Context, private val light: Boolean) : View(context) {
    private val line = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 2f * resources.displayMetrics.density
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
        color = if (light) Color.rgb(16, 122, 87) else Color.rgb(52, 211, 153)
    }
    private var samples: List<Int> = emptyList()

    fun show(values: List<Int>) {
        samples = values
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val pts = HrSparkline.points(samples, width.toFloat(), height.toFloat())
        if (pts.size < 2) return
        val path = Path().apply {
            moveTo(pts.first().first, pts.first().second)
            pts.drop(1).forEach { (x, y) -> lineTo(x, y) }
        }
        canvas.drawPath(path, line)
    }
}
