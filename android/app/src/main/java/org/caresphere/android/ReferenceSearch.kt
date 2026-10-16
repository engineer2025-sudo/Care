package org.caresphere.android

/** Offline built-in safety notes, same corpus as iPhone's MedicalLibraryService.careBasics. */
object ReferenceSearch {
    data class Entry(val title: String, val excerpt: String, val publisher: String, val url: String)

    val CARE_BASICS = listOf(
        Entry("Keep a reliable medication list",
            "Keep an up-to-date list of medicines, supplements, strengths, and the clinician who prescribed them. Check the current package label and confirm questions with a pharmacist or prescriber. CareSphere records a schedule you enter; it cannot verify a prescription, check interactions, or decide whether a dose should be changed.",
            "CareSphere safety note · MedlinePlus", "https://medlineplus.gov/medicinesafety.html"),
        Entry("Make the home easier to move through",
            "Reduce common trip hazards, keep walkways and frequently used items clear, and make lighting easy to reach. A clinician can help review personal balance, vision, and medication concerns. These general ideas do not replace an individual fall-risk assessment.",
            "CareSphere safety note · CDC", "https://www.cdc.gov/falls/prevention/index.html"),
        Entry("Make support sensory-aware and respectful",
            "Ask the person what communication and sensory supports work for them. Offer advance notice of changes, a quieter option, and genuine choices when possible. Avoid assuming one strategy works for every autistic person; follow the person's preferences and care team's guidance.",
            "CareSphere safety note · NIMH", "https://www.nimh.nih.gov/health/topics/autism-spectrum-disorders-asd"),
        Entry("Record health readings with context",
            "When documenting a measurement, include the date, time, device or source, and any context the care team requested. A single reading or wearable signal is not a diagnosis. Ask a clinician how a specific value should be interpreted for the individual.",
            "CareSphere safety note · MedlinePlus", "https://medlineplus.gov/ency/article/007490.htm"),
        Entry("Urgent symptoms need human help",
            "This offline assistant cannot assess emergencies. For immediate danger or severe, rapidly worsening symptoms, contact local emergency services now. In the United States, call 911. Do not wait for an AI response.",
            "CareSphere safety note", "https://www.usa.gov/911"))

    fun search(query: String, corpus: List<Entry> = CARE_BASICS, limit: Int = 5): List<Entry> {
        val terms = query.lowercase().split(Regex("\\s+")).map { it.trim() }.filter { it.length >= 2 }
        if (terms.isEmpty()) return emptyList()
        return corpus.map { entry ->
            val haystack = "${entry.title} ${entry.excerpt} ${entry.publisher}".lowercase()
            entry to terms.count { haystack.contains(it) }
        }.filter { it.second > 0 }
            .sortedByDescending { it.second }
            .take(limit)
            .map { it.first }
    }
}
