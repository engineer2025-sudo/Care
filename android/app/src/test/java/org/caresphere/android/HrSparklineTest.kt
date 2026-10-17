package org.caresphere.android

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class HrSparklineTest {
    @Test fun onlyPlausibleRealReadingsAreKept() {
        var samples = emptyList<Int>()
        samples = HrSparkline.append(samples, 72)
        samples = HrSparkline.append(samples, null)
        samples = HrSparkline.append(samples, 5)
        samples = HrSparkline.append(samples, 400)
        samples = HrSparkline.append(samples, 80)
        assertEquals(listOf(72, 80), samples)
    }

    @Test fun keepsTheNewestReadingsUpToTheLimit() {
        var samples = emptyList<Int>()
        for (i in 1..60) samples = HrSparkline.append(samples, 60 + i % 20)
        assertEquals(HrSparkline.LIMIT, samples.size)
        assertEquals(60 + 60 % 20, samples.last())
    }

    @Test fun noLineExistsBelowTwoSamples() {
        assertTrue(HrSparkline.points(emptyList(), 100f, 40f).isEmpty())
        assertTrue(HrSparkline.points(listOf(72), 100f, 40f).isEmpty())
        assertEquals(2, HrSparkline.points(listOf(72, 80), 100f, 40f).size)
    }

    @Test fun pointsStayInsideTheViewAndSpanItsWidth() {
        val pts = HrSparkline.points(listOf(60, 90, 75, 120), 200f, 48f)
        assertEquals(0f, pts.first().first)
        assertEquals(200f, pts.last().first)
        assertTrue(pts.all { it.second in 0f..48f })
        val flat = HrSparkline.points(listOf(70, 70, 70), 90f, 30f)
        assertTrue(flat.all { it.second.isFinite() && it.second in 0f..30f })
    }
}
