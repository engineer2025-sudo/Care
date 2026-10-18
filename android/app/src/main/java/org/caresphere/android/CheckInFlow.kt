package org.caresphere.android

/** Self-paced pause, then a check-in. Not treatment, no assessment, nothing sent automatically. */
object CheckInFlow {
    val PHASES = listOf("Breathe in" to 4, "Breathe out" to 6)
    const val TARGET_CYCLES = 3

    data class Breath(val phaseIndex: Int, val secondsLeft: Int, val cycles: Int, val running: Boolean)
    enum class Step { Pause, After, Support }

    fun start() = Breath(0, PHASES[0].second, 0, true)

    /** One second later. A completed in/out pair counts a cycle; the guide stops after three. */
    fun tick(state: Breath): Breath {
        if (!state.running) return state
        if (state.secondsLeft > 1) return state.copy(secondsLeft = state.secondsLeft - 1)
        val phaseIndex = (state.phaseIndex + 1) % PHASES.size
        val cycles = if (phaseIndex == 0) state.cycles + 1 else state.cycles
        return Breath(phaseIndex, PHASES[phaseIndex].second, cycles, cycles < TARGET_CYCLES)
    }

    fun room(random: java.util.UUID = java.util.UUID.randomUUID()) =
        "CareSphere-Support-" + random.toString().filter { it.isLetterOrDigit() }.take(6).lowercase()

    fun supportMessage(room: String) =
        "I could use some support. Please join me here: https://meet.jit.si/$room"
}
