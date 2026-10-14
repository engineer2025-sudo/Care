package org.caresphere.android
import org.junit.Test
import org.junit.Assert.*
class LibraryPreferencesTest {
    @Test fun filtersUnknownFavorites() { assertEquals(listOf("breathing"), LibraryPreferences.normalized(listOf("breathing","fake","breathing"))) }
    @Test fun togglesOff() { assertEquals(emptyList<String>(), LibraryPreferences.toggle("breathing", LibraryPreferences.toggle("breathing", emptyList()))) }
    @Test fun searchMatchesEveryWord() { assertTrue(LibraryPreferences.matches("Call about appointment", " APPOINTMENT call ")); assertFalse(LibraryPreferences.matches("appointment", "call appointment")) }
    @Test fun searchIgnoresAccents() { assertTrue(LibraryPreferences.matches("Café", "cafe")) }
    @Test fun catalogIDsAreStableAndComplete() { assertEquals(11, LibraryPreferences.ids.toSet().size); assertEquals(ActivityRules.titles.size, LibraryPreferences.descriptions.size) }
}
