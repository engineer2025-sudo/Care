package org.caresphere.android

import java.text.Normalizer
import java.util.Locale

object LibraryPreferences {
    val ids = listOf("sortTogether", "completePattern", "findSame", "everydayOrder", "conversation", "picturePairs", "feelings", "pictureStory", "patternRecall", "soundscapes", "breathing", "socialMoments")
    val descriptions = listOf(
        "Find what belongs together. Three choices and a hint.", "Notice what comes next. Repeat at your own pace.",
        "Keep a word in view and find its match.", "Explore everyday steps, one choice at a time.",
        "Share a preference or imagine a story. Nothing is recorded.", "Reveal cards and find a pair. No timer.",
        "Explore feeling words without judging expressions.", "Tell an imagined story in your own words.",
        "Look, hide, and recall. Reveal the guide anytime.", "Optional gentle sound. Silence is welcome.", "A comfortable rhythm, with no breath hold.", "Explore everyday situations. Several responses can fit; no answer is saved.")
    fun normalized(ids: List<String>) = ids.filter { it in this.ids }.distinct().sorted()
    fun toggle(id: String, favorites: List<String>): List<String> = normalized(if(id in favorites) favorites - id else favorites + id)
    private fun folded(text: String) = Normalizer.normalize(text, Normalizer.Form.NFD).replace(Regex("\\p{M}+"), "").lowercase(Locale.ROOT)
    fun matches(text: String, query: String): Boolean {
        val haystack = folded(text)
        return folded(query).trim().split(Regex("\\s+")).all { haystack.contains(it) }
    }
}
