package org.caresphere.android

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CheckInFlowTest {
    @Test fun startsOnAnInBreathAndAlternates() {
        var state = CheckInFlow.start()
        assertEquals("Breathe in", CheckInFlow.PHASES[state.phaseIndex].first)
        assertEquals(4, state.secondsLeft)
        repeat(4) { state = CheckInFlow.tick(state) }
        assertEquals("Breathe out", CheckInFlow.PHASES[state.phaseIndex].first)
        assertEquals(0, state.cycles)
    }

    @Test fun countsCyclesAndStopsAfterThree() {
        var state = CheckInFlow.start()
        repeat(10) { state = CheckInFlow.tick(state) }
        assertEquals(1, state.cycles)
        assertTrue(state.running)
        repeat(20) { state = CheckInFlow.tick(state) }
        assertEquals(CheckInFlow.TARGET_CYCLES, state.cycles)
        assertFalse(state.running)
        assertEquals(state, CheckInFlow.tick(state))
    }

    @Test fun pausedStateHoldsTheTimer() {
        val paused = CheckInFlow.start().copy(running = false)
        assertEquals(paused, CheckInFlow.tick(paused))
    }

    @Test fun supportMessageNamesTheRoomAndClaimsNoDelivery() {
        val message = CheckInFlow.supportMessage("CareSphere-Support-abc123")
        assertEquals("I could use some support. Please join me here: https://meet.jit.si/CareSphere-Support-abc123", message)
        assertTrue(CheckInFlow.room(java.util.UUID.fromString("11111111-2222-4333-8444-555555555555")).startsWith("CareSphere-Support-"))
    }
}
