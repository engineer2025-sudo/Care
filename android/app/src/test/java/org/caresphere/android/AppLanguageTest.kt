package org.caresphere.android
import org.junit.Assert.*
import org.junit.Test
class AppLanguageTest {
    @Test fun localeAliasesAndUnsupportedFallback() {
        listOf(listOf("es-MX") to "es",listOf("zh-TW") to "zh-Hans",listOf("tl-PH") to "fil",listOf("fil_PH") to "fil",listOf("vi-VN") to "vi",listOf("fr","es-US") to "es",emptyList<String>() to "en").forEach{(tags,want)->assertEquals(want,AppLanguage.resolve(tags))}
        assertEquals(6,AppLanguage.options.size)
    }
    @Test fun personalValuesAreNotReinterpretedAsTemplates() {
        assertEquals("Hola, Save {1} 安.",AppLanguage.formatTemplate("Hola, {0}.",listOf("Save {1} 安")))
        assertEquals("{1} two",AppLanguage.formatTemplate("{0} {1}",listOf("{1}","two")))
        assertEquals("{999999999999999999}",AppLanguage.formatTemplate("{999999999999999999}",emptyList()))
    }
    @Test fun installedVoiceMustMatchLanguage() {
        assertTrue(AppLanguage.voiceMatches("tl-PH","fil"))
        assertTrue(AppLanguage.voiceMatches("zh-CN","zh-Hans"))
        assertFalse(AppLanguage.voiceMatches("zh-HK","zh-Hans"))
        assertFalse(AppLanguage.voiceMatches("en-US","vi"))
    }
}
