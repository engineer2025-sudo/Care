package org.caresphere.android

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ReferenceSearchTest {
    @Test fun corpusMatchesSharedCrossPlatformSet() {
        assertEquals(5, ReferenceSearch.CARE_BASICS.size)
        ReferenceSearch.CARE_BASICS.forEach {
            assertTrue(it.title.isNotEmpty())
            assertTrue(it.excerpt.length > 40)
            assertTrue(it.url.startsWith("https://"))
        }
    }

    @Test fun searchMatchesTitleAndExcerptTerms() {
        assertEquals(2, ReferenceSearch.search("medication").size)
        assertEquals("Make the home easier to move through", ReferenceSearch.search("trip hazards").first().title)
        assertEquals("Urgent symptoms need human help", ReferenceSearch.search("emergency").first().title)
        assertEquals("Make support sensory-aware and respectful", ReferenceSearch.search("autistic").first().title)
    }

    @Test fun emptyOrTinyQueriesReturnNothing() {
        assertTrue(ReferenceSearch.search("").isEmpty())
        assertTrue(ReferenceSearch.search("   ").isEmpty())
        assertTrue(ReferenceSearch.search("a").isEmpty())
        assertTrue(ReferenceSearch.search("zzz-no-match").isEmpty())
    }
}
