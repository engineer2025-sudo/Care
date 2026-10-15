package org.caresphere.android
import org.junit.Assert.*
import org.junit.Test
class VitalRulesTest {
    @Test fun rejectsWrongUnitsOrStructure(){assertFalse(VitalRules.valid("oxygen",101,null));assertFalse(VitalRules.valid("bp",80,120));assertFalse(VitalRules.valid("bp",120,null));assertFalse(VitalRules.valid("unknown",90,null))}
    @Test fun doesNotClaimNormalRanges(){assertTrue(VitalRules.valid("oxygen",75,null));assertTrue(VitalRules.valid("bp",190,120));assertTrue(VitalRules.valid("bp",120,80))}
}
