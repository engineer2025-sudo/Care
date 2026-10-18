package org.caresphere.android
import org.junit.Assert.*
import org.junit.Test
class SnoozeRulesTest {
    @Test fun futureSnoozeHasBoundedSameDayWindow(){assertTrue(SnoozeRules.current(1600000,"day",1000000,"day"));assertFalse(SnoozeRules.current(1600001,"day",1000000,"day"));assertFalse(SnoozeRules.current(1000000,"day",1000000,"day"));assertFalse(SnoozeRules.current(1600000,"old",1000000,"day"))}
    @Test fun earlyStaleAndPreviousDayCallbacksAreRejected(){assertTrue(SnoozeRules.deliver(1000000,"day",1000000,"day"));assertFalse(SnoozeRules.deliver(1000001,"day",1000000,"day"));assertFalse(SnoozeRules.deliver(1,"day",10000000,"day"));assertFalse(SnoozeRules.deliver(1000000,"old",1000000,"day"))}
}
