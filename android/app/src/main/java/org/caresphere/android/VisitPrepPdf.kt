package org.caresphere.android

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.LinearGradient
import android.graphics.pdf.PdfDocument
import android.net.Uri
import java.io.File
import java.io.FileOutputStream
import java.security.MessageDigest
import java.util.UUID

/** Local, user-selected PDF with a SHA-256 content fingerprint (not an identity signature). */
internal object VisitPrepPdf {
    private const val PAGE_W = 595
    private const val PAGE_H = 842
    private const val LEFT = 52f
    private const val RIGHT = 543f
    private const val WIDTH = RIGHT - LEFT

    fun create(context: Context, content: String): Uri {
        val fingerprint = MessageDigest.getInstance("SHA-256")
            .digest(content.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it.toInt() and 0xff) }
        val document = PdfDocument()
        var pageNumber = 0
        var y = 0f
        var canvas = Canvas()
        var currentPage: PdfDocument.Page? = null

        fun paint(size: Float, color: Int, bold: Boolean = false): Paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textSize = size
            this.color = color
            typeface = if (bold) android.graphics.Typeface.create("sans-serif", android.graphics.Typeface.BOLD)
            else android.graphics.Typeface.create("sans-serif", android.graphics.Typeface.NORMAL)
        }

        fun footer() {
            val rule = paint(7f, Color.rgb(211, 225, 218))
            rule.strokeWidth = 0.8f
            canvas.drawLine(LEFT, 804f, RIGHT, 804f, rule)
            canvas.drawText("CareSphere  ·  Personal visit preparation", LEFT, 820f, paint(7f, Color.rgb(92, 116, 115)))
            canvas.drawText("Page $pageNumber", RIGHT - 45f, 820f, paint(7f, Color.rgb(92, 116, 115)))
        }

        fun newPage() {
            pageNumber++
            val info = PdfDocument.PageInfo.Builder(PAGE_W, PAGE_H, pageNumber).create()
            val page = document.startPage(info)
            currentPage = page
            canvas = page.canvas
            canvas.drawColor(Color.WHITE)
            if (pageNumber == 1) {
                val background = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    shader = LinearGradient(0f, 0f, PAGE_W.toFloat(), 190f,
                        intArrayOf(Color.rgb(17, 61, 68), Color.rgb(21, 119, 105)), null, Shader.TileMode.CLAMP)
                }
                canvas.drawRect(0f, 0f, PAGE_W.toFloat(), 190f, background)
                val rings = paint(1f, Color.argb(40, 255, 255, 255)).apply { style = Paint.Style.STROKE; strokeWidth = 1f }
                canvas.drawCircle(567f, -12f, 92f, rings)
                canvas.drawCircle(567f, -12f, 119f, rings)
                val badge = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(227, 245, 235) }
                canvas.drawCircle(74f, 55f, 22f, badge)
                canvas.drawText("C", 68f, 62f, paint(20f, Color.rgb(19, 92, 78), true))
                canvas.drawText("CARESPHERE  ·  PERSONAL CARE TOOLS", 108f, 59f, paint(9f, Color.rgb(221, 241, 232), true))
                canvas.drawText("VISIT PREPARATION", LEFT, 110f, paint(8f, Color.rgb(205, 233, 220), true))
                canvas.drawText("Care visit preparation", LEFT, 145f, paint(27f, Color.WHITE, true))
                canvas.drawText("A personal briefing made from the items you chose.", LEFT + 1f, 169f, paint(9f, Color.rgb(221, 241, 232)))
                y = 218f
            } else {
                y = 54f
                canvas.drawText("CARESPHERE  ·  VISIT PREPARATION", LEFT, 35f, paint(8f, Color.rgb(20, 112, 94), true))
            }
        }

        fun ensureSpace(height: Float) {
            if (y + height > 782f) {
                footer()
                currentPage?.let { document.finishPage(it) }
                currentPage = null
                newPage()
            }
        }

        fun wrapped(value: String, x: Float = LEFT, maxWidth: Float = WIDTH, size: Float = 9f,
                    color: Int = Color.rgb(25, 48, 53), bold: Boolean = false, bullet: Boolean = false) {
            val p = paint(size, color, bold)
            val text = if (bullet) "•  $value" else value
            var rest = text
            do {
                val count = p.breakText(rest, true, maxWidth, null).coerceAtLeast(1)
                val end = if (count < rest.length) {
                    val space = rest.lastIndexOf(' ', count - 1)
                    if (space > 0) space else count
                } else rest.length
                val line = rest.substring(0, end).trimEnd()
                val lineHeight = size * 1.45f
                ensureSpace(lineHeight + 5f)
                canvas.drawText(line, x, y + size, p)
                y += lineHeight + 4f
                rest = rest.substring(end).trimStart()
            } while (rest.isNotEmpty())
        }

        try {
            newPage()
            canvas.drawText("YOUR SELECTED INFORMATION", LEFT, y + 8f, paint(8f, Color.rgb(22, 111, 94), true))
            y += 24f
            val headings = listOf("MEDICATION REMINDERS", "MOOD CHECK-INS", "CARE NOTES", "LIVE BLUETOOTH HEART RATE", "MANUALLY ENTERED VITALS", "QUESTIONS OR TOPICS I WANT TO DISCUSS")
            content.lines().forEachIndexed { index, raw ->
                val line = raw.trimEnd()
                if (index == 0 || line.isBlank()) return@forEachIndexed
                if (line.startsWith("User-prepared information only.")) {
                    ensureSpace(55f)
                    val rect = RectF(LEFT, y, RIGHT, y + 48f)
                    val fill = paint(1f, Color.rgb(239, 247, 242))
                    canvas.drawRoundRect(rect, 8f, 8f, fill)
                    canvas.drawRoundRect(RectF(LEFT, y, LEFT + 3f, y + 48f), 2f, 2f, paint(1f, Color.rgb(73, 155, 126)))
                    y += 8f
                    wrapped(line, LEFT + 14f, WIDTH - 25f, 8f, Color.rgb(75, 103, 101))
                    y += 3f
                    return@forEachIndexed
                }
                val heading = headings.firstOrNull { line.startsWith(it) }
                if (heading != null) {
                    ensureSpace(42f)
                    y += 8f
                    wrapped(heading.lowercase().replaceFirstChar { it.titlecase() }, size = 12f, color = Color.rgb(19, 91, 83), bold = true)
                    val source = line.substringAfter("(", "").removeSuffix(")")
                    if (source.isNotBlank()) wrapped(source, size = 7.5f, color = Color.rgb(92, 116, 115))
                } else if (line.startsWith("- ")) {
                    wrapped(line.removePrefix("- "), x = LEFT + 8f, maxWidth = WIDTH - 10f, bullet = true)
                } else if (line.startsWith("Display name:") || line.startsWith("Schedule reviewed in CareSphere:")) {
                    val split = line.split(":", limit = 2)
                    wrapped(split[0] + ":", size = 8f, color = Color.rgb(83, 111, 111), bold = true)
                    if (split.size > 1) wrapped(split[1].trim(), x = LEFT + 179f, maxWidth = WIDTH - 179f)
                } else wrapped(line)
            }

            footer()
            currentPage?.let { document.finishPage(it) }
            currentPage = null
            newPage()
            canvas.drawText("REVERSE SIDE  ·  SELECTED DATA RECORD", LEFT, 68f, paint(8f, Color.rgb(22, 111, 94), true))
            canvas.drawText("Data & electronic stamp", LEFT, 101f, paint(23f, Color.rgb(25, 48, 53), true))
            val sealBitmap = android.graphics.BitmapFactory.decodeResource(context.resources, R.drawable.caresphere_visit_prep_seal)
            val sealFrame = RectF(352f, 111f, 543f, 302f)
            canvas.save()
            canvas.clipPath(Path().apply { addOval(sealFrame, Path.Direction.CW) })
            canvas.drawBitmap(sealBitmap, null, sealFrame, Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG))
            canvas.restore()
            sealBitmap.recycle()
            val preparedAt = content.lineSequence().firstOrNull { it.startsWith("Prepared:") || it.startsWith("Prepared (UTC):") }?.substringAfter(":")?.trim().orEmpty().ifBlank { "Time not recorded" }
            y = 126f
            wrapped("ELECTRONIC INTEGRITY STAMP  ·  ${fingerprint.take(12).uppercase()}", x = LEFT, maxWidth = 282f, size = 8f, color = Color.rgb(22, 103, 85), bold = true)
            wrapped("Prepared: $preparedAt", x = LEFT, maxWidth = 282f, size = 7.5f, color = Color.rgb(75, 103, 101))
            wrapped("Data source: items selected by the user in CareSphere.", x = LEFT, maxWidth = 282f, size = 7.5f, color = Color.rgb(75, 103, 101))
            wrapped("SHA-256 fingerprints report text only; it does not sign the PDF or prove identity.", x = LEFT, maxWidth = 282f, size = 7.5f, color = Color.rgb(75, 103, 101))
            y = maxOf(y, 318f)
            wrapped(fingerprint, x = LEFT, maxWidth = WIDTH, size = 6.5f, color = Color.rgb(25, 65, 68), bold = true)
            wrapped("SELECTED DATA INCLUDED IN THIS COPY", x = LEFT, maxWidth = WIDTH, size = 8f, color = Color.rgb(22, 111, 94), bold = true)
            val selectedSections = listOf("MEDICATION REMINDERS", "MOOD CHECK-INS", "CARE NOTES", "LIVE BLUETOOTH HEART RATE", "MANUALLY ENTERED VITALS", "QUESTIONS OR TOPICS I WANT TO DISCUSS")
            var inSelectedSection = false
            var genericLedgerStarted = false
            content.lines().forEach { line ->
                if (line.isBlank() || line.startsWith("Prepared") || line.startsWith("User-prepared information only.") || line.startsWith("CareSphere")) return@forEach
                val heading = selectedSections.firstOrNull { line.startsWith(it) }
                if (heading != null) {
                    inSelectedSection = true
                    wrapped(heading.lowercase().replaceFirstChar { it.titlecase() }, x = LEFT, maxWidth = WIDTH, size = 11f, color = Color.rgb(19, 91, 83), bold = true)
                    val source = line.substringAfter("(", "").removeSuffix(")")
                    if (source.isNotBlank()) wrapped(source, x = LEFT, maxWidth = WIDTH, size = 7.5f, color = Color.rgb(92, 116, 115))
                } else if (line.startsWith("Display name:")) {
                    inSelectedSection = false
                    wrapped("Profile information", x = LEFT, maxWidth = WIDTH, size = 11f, color = Color.rgb(19, 91, 83), bold = true)
                    wrapped(line, x = LEFT + 8f, maxWidth = WIDTH - 8f, size = 8.5f)
                } else if (inSelectedSection) {
                    wrapped(line.removePrefix("- "), x = LEFT + 8f, maxWidth = WIDTH - 8f, size = 8.5f, bullet = line.startsWith("- "))
                } else {
                    if (!genericLedgerStarted) {
                        wrapped("Selected items", x = LEFT, maxWidth = WIDTH, size = 11f, color = Color.rgb(19, 91, 83), bold = true)
                        genericLedgerStarted = true
                    }
                    wrapped(line.removePrefix("- "), x = LEFT + 8f, maxWidth = WIDTH - 8f, size = 8.5f, bullet = line.startsWith("- "))
                }
            }
            wrapped("Content checksum only · not a clinician, clinic, medical-record, or certified-signature verification.", x = LEFT, maxWidth = WIDTH, size = 7f, color = Color.rgb(75, 103, 101))
            footer()
            currentPage?.let { document.finishPage(it) }
            currentPage = null

            val directory = File(context.cacheDir, "transfers").apply { mkdirs() }
            val staleBefore = System.currentTimeMillis() - 24L * 60 * 60 * 1000
            directory.listFiles()?.filter { it.name.endsWith(".carepdf") && it.lastModified() < staleBefore }?.forEach { it.delete() }
            val file = File(directory, "${UUID.randomUUID()}.carepdf")
            FileOutputStream(file).use { output -> document.writeTo(output) }
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({ file.delete() }, 24L * 60 * 60 * 1000)
            return Uri.Builder().scheme("content").authority("${context.packageName}.transfer").appendPath(file.name).build()
        } finally {
            document.close()
        }
    }
}
