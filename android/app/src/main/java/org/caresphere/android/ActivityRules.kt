package org.caresphere.android

object ActivityRules {
    /** Bluetooth SIG 0x2A37: reject incomplete packets and invalid contact status. */
    fun heartRate(packet: ByteArray): Int? {
        if (packet.size < 2) return null
        val flags = packet[0].toInt() and 255
        if (flags and 4 != 0 && flags and 2 == 0) return null
        val value = if (flags and 1 == 1) {
            if (packet.size < 3) return null
            (packet[1].toInt() and 255) or ((packet[2].toInt() and 255) shl 8)
        } else packet[1].toInt() and 255
        return value.takeIf { it in 21..249 }
    }
    data class Round(val prompt: String, val options: List<String>, val answer: Int, val hint: String)
    val sorting = listOf(
        Round("Which one is a fruit?", listOf("Apple", "Chair", "Shoe"), 0, "An apple grows on a tree."),
        Round("Which one do you wear?", listOf("Cup", "Hat", "Pear"), 1, "A hat goes on your head."),
        Round("Which one is used for a drink?", listOf("Sock", "Leaf", "Cup"), 2, "You can fill a cup with water."))
    val patterns = listOf(
        Round("Circle · Star · Circle · …", listOf("Square", "Star", "Leaf"), 1, "Circle and star take turns."),
        Round("Leaf · Leaf · Flower · Leaf · Leaf · …", listOf("Flower", "Star", "Circle"), 0, "Two leaves, then a flower."),
        Round("One · Two · One · …", listOf("Three", "One", "Two"), 2, "One and two take turns."))
    val matching = listOf(
        Round("Find the same: Flower", listOf("Leaf", "Flower", "Star"), 1, "Look for the word Flower."),
        Round("Find the same: Circle", listOf("Circle", "Square", "Star"), 0, "Look for the word Circle."),
        Round("Find the same: Star", listOf("Flower", "Circle", "Star"), 2, "Look for the word Star."))
    val sequences = listOf(
        Round("To wash your hands, what comes after wetting them?", listOf("Dry hands", "Add soap", "Put on gloves"), 1, "Soap helps clean your hands."),
        Round("Before going outside in the rain, what could you take?", listOf("An umbrella", "A pillow", "A plate"), 0, "An umbrella keeps rain off."))
    val titles = listOf("Sort together", "Complete the pattern", "Find the same", "Everyday order", "Conversation cards", "Picture pairs", "Feelings explorer", "Picture story", "Remember a pattern", "Soundscapes", "Paced breathing")
    fun round(activity: Int, index: Int): Round {
        val rounds = when(activity) { 0 -> sorting; 1 -> patterns; 2 -> matching; else -> sequences }
        return rounds[Math.floorMod(index, rounds.size)]
    }
}
