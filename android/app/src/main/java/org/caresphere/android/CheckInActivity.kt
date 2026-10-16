package org.caresphere.android

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.TextView

/** Pause, then a check-in with reviewed sharing. Nothing is sent or invited automatically. */
class CheckInActivity : ToolActivity() {
    private var step = CheckInFlow.Step.Pause
    private var breath = CheckInFlow.start()
    private var shareStatus: String? = null
    private var breathLabel: TextView? = null
    private val room = CheckInFlow.room()
    private val handler = Handler(Looper.getMainLooper())
    private val tick = object : Runnable {
        override fun run() {
            breath = CheckInFlow.tick(breath)
            if (breath.cycles >= CheckInFlow.TARGET_CYCLES) step = CheckInFlow.Step.After
            if (step == CheckInFlow.Step.Pause && breath.running) {
                breathLabel?.let { it.text = label(); it.announceForAccessibility(it.text) }
                handler.postDelayed(this, 1000)
            } else {
                render()
            }
        }
    }

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        render()
    }

    override fun onStop() {
        handler.removeCallbacksAndMessages(null)
        breath = breath.copy(running = false)
        super.onStop()
    }

    private fun label() = if (breath.running)
        tx(CheckInFlow.PHASES[breath.phaseIndex].first) + " · " + breath.secondsLeft
    else tx("Paused")

    private fun render() {
        begin(tx("Check-in"))
        when (step) {
            CheckInFlow.Step.Pause -> {
                text(tx("Let's pause together"), 24f)
                copy(tx("A paced pause, not treatment. Stop any time."))
                breathLabel = text(label(), 30f)
                text(AppLanguage.format(this, "{0} of {1} cycles",
                    minOf(breath.cycles, CheckInFlow.TARGET_CYCLES), CheckInFlow.TARGET_CYCLES), 15f)
                button(if (breath.running) tx("Pause") else tx("Start")) {
                    breath = breath.copy(running = !breath.running)
                    render()
                    if (breath.running) handler.postDelayed(tick, 1000)
                }
                button(tx("Skip to check-in")) { step = CheckInFlow.Step.After; render() }
                button(tx("I need help now")) { step = CheckInFlow.Step.Support; render() }
            }
            CheckInFlow.Step.After -> {
                text(tx("How are you now?"), 24f)
                button(tx("Better")) { finish() }
                button(tx("Contact my caregiver")) { step = CheckInFlow.Step.Support; render() }
                button(tx("Still stressed")) { step = CheckInFlow.Step.Support; render() }
                button(tx("I need help")) { step = CheckInFlow.Step.Support; render() }
            }
            CheckInFlow.Step.Support -> {
                text(tx("Would you like someone with you?"), 24f)
                shareStatus?.let { text(it, 16f) }
                button(tx("Share a support message")) {
                    runCatching {
                        startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain")
                            .putExtra(Intent.EXTRA_TEXT, CheckInFlow.supportMessage(room)), tx("Share a support message")))
                        shareStatus = tx("Choose a messaging app and recipient, then review and send the message yourself. CareSphere cannot confirm delivery or a response.")
                    }.onFailure { shareStatus = tx("No sharing app is available on this device.") }
                    render()
                }
                button(tx("Open video support")) {
                    runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://meet.jit.si/$room"))) }
                        .onFailure { message(tx("No browser is available on this device.")) }
                }
                text("https://meet.jit.si/$room", 15f)
                copy(tx("Choose where to share the message. Anyone with the room link can join."))
                button(tx("Close")) { finish() }
            }
        }
    }
}
