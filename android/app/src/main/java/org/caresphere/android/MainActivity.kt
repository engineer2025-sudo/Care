package org.caresphere.android

import android.app.*
import android.os.*
import android.content.*
import android.content.res.Configuration
import android.text.Editable
import android.text.TextWatcher
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.view.*
import android.widget.*
import org.json.JSONArray
import org.json.JSONObject
import java.time.*
import java.time.format.DateTimeFormatter

/** Native Android UI; no web wrapper, fake records, or network-backed dashboard. */
class MainActivity : Activity() {
    private lateinit var data: CareData
    private lateinit var monitor: HeartRateMonitor
    private lateinit var page: LinearLayout
    private lateinit var root: LinearLayout
    private var tab = 0
    private var settings = false
    private var activityIndex = -1
    private var activityQuery = ""
    private var noteQuery = ""
    private var favoritesOnly = false
    private var round = 0
    private var feedback = ""
    private var firstPair = -1
    private var secondPair = -1
    private val matched = mutableSetOf<Int>()
    private var memoryHidden = false
    private var memoryPosition = 0
    private var breathing = false
    private var breathSecond = 0
    private var playing = false
    private val sound = CalmAudio()
    private val handler = Handler(Looper.getMainLooper())
    private var breathLabel: TextView? = null
    private var hrLabel: TextView? = null
    private var hrStatus: TextView? = null
    private var hrTimestamp: TextView? = null
    private var deviceList: LinearLayout? = null
    private var hrControl: Button? = null
    private var displayedDevices = ""
    private val dark: Boolean get() = when (if (::data.isInitialized) data.json.optString("appearance", "system") else "system") {
        "dark" -> true; "light" -> false
        else -> resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES
    }
    private val green get() = if (dark) Color.rgb(168,211,178) else Color.rgb(55,111,76)
    private val fill get() = Color.rgb(55,111,76)
    private val ink get() = if (dark) Color.rgb(237,244,237) else Color.rgb(28,46,36)
    private val muted get() = if (dark) Color.rgb(189,205,190) else Color.rgb(80,98,87)
    private val bg get() = if (dark) Color.rgb(20,29,23) else Color.rgb(246,248,244)
    private val surface get() = if (dark) Color.rgb(31,43,34) else Color.WHITE
    private val soft get() = if (dark) Color.rgb(45,62,49) else Color.rgb(233,240,232)
    private fun dialogBuilder() = AlertDialog.Builder(ContextThemeWrapper(this,
        if (dark) android.R.style.Theme_Material_Dialog_Alert else android.R.style.Theme_Material_Light_Dialog_Alert))
    private val pairWords = listOf("Flower", "Star", "Leaf", "Star", "Flower", "Leaf")
    private val memory = listOf("Circle", "Star", "Leaf")
    private fun dp(n: Int) = (n * resources.displayMetrics.density).toInt()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        data = CareData(this)
        monitor = HeartRateMonitor(this) { updateHealth() }
        savedInstanceState?.let {
            activityQuery = it.getString("activityQuery", ""); noteQuery = it.getString("noteQuery", ""); favoritesOnly = it.getBoolean("favoritesOnly")
            tab = it.getInt("tab"); settings = it.getBoolean("settings")
            activityIndex = it.getInt("activity", -1); round = it.getInt("round")
            feedback = it.getString("feedback", ""); memoryHidden = it.getBoolean("memoryHidden")
            memoryPosition = it.getInt("memoryPosition"); matched.addAll(it.getIntArray("matched")?.toList() ?: emptyList())
            firstPair = it.getInt("first", -1); secondPair = it.getInt("second", -1)
        }
        render()
    }
    override fun onSaveInstanceState(out: Bundle) {
        super.onSaveInstanceState(out)
        out.putString("activityQuery", activityQuery); out.putString("noteQuery", noteQuery); out.putBoolean("favoritesOnly", favoritesOnly)
        out.putInt("tab", tab); out.putBoolean("settings", settings); out.putInt("activity", activityIndex); out.putInt("round", round)
        out.putString("feedback", feedback); out.putBoolean("memoryHidden", memoryHidden); out.putInt("memoryPosition", memoryPosition)
        out.putIntArray("matched", matched.toIntArray()); out.putInt("first", firstPair); out.putInt("second", secondPair)
    }
    override fun onResume() { super.onResume(); if (::data.isInitialized) { data = CareData(this); data.refreshDay(); render() } }
    override fun onStop() {
        stopComfort()
        if (::monitor.isInitialized) monitor.disconnect("Monitoring stopped when CareSphere left the foreground. Reconnect when you're ready.")
        super.onStop()
    }
    override fun onDestroy() { if (::monitor.isInitialized) monitor.close(); handler.removeCallbacksAndMessages(null); super.onDestroy() }
    @Deprecated("Uses the platform back dispatcher for compatibility")
    override fun onBackPressed() {
        if (settings || activityIndex >= 0) { settings = false; activityIndex = -1; stopComfort(); render() }
        else if (tab != 0) { tab = 0; render() } else super.onBackPressed()
    }
    private fun stopComfort() { breathing = false; playing = false; sound.stop(); handler.removeCallbacks(breathTick) }
    private fun shape(color: Int, radius: Int = 20) = GradientDrawable().apply { setColor(color); cornerRadius = dp(radius).toFloat() }
    private fun column(parent: LinearLayout = page) = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        parent.addView(this, LinearLayout.LayoutParams(-1, -2))
    }
    private fun text(value: String, size: Float = 17f, parent: LinearLayout = page, bold: Boolean = false): TextView = TextView(this).apply {
        text = value; textSize = size; setTextColor(if (bold) ink else muted)
        if (bold) setTypeface(typeface, Typeface.BOLD)
        setPadding(0, dp(5), 0, dp(7)); setTextIsSelectable(true)
        parent.addView(this, LinearLayout.LayoutParams(-1, -2))
    }
    private fun button(label: String, parent: LinearLayout = page, primary: Boolean = false, action: () -> Unit): Button = Button(this).apply {
        text = label; textSize = 17f; isAllCaps = false; minHeight = dp(52)
        setPadding(dp(12), dp(10), dp(12), dp(10)); setTextColor(if(primary) Color.WHITE else green)
        background = shape(if (primary) fill else soft, 14)
        parent.addView(this, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(6); bottomMargin = dp(6) })
        setOnClickListener { action() }
    }
    private fun card(title: String, body: (LinearLayout) -> Unit) {
        val c = column(); c.background = shape(surface); c.setPadding(dp(18), dp(14), dp(18), dp(16))
        (c.layoutParams as LinearLayout.LayoutParams).apply { topMargin = dp(10); bottomMargin = dp(6) }
        text(title, 21f, c, true).apply { if (Build.VERSION.SDK_INT >= 28) isAccessibilityHeading = true }
        body(c)
    }
    private fun render() {
        @Suppress("DEPRECATION")
        window.statusBarColor = bg
        @Suppress("DEPRECATION")
        window.navigationBarColor = bg
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = if(dark) 0 else View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
        hrLabel = null; hrStatus = null; hrTimestamp = null; deviceList = null; hrControl = null; breathLabel = null; displayedDevices = ""
        root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setBackgroundColor(bg) }
        root.setOnApplyWindowInsetsListener { v, insets ->
            if (Build.VERSION.SDK_INT >= 30) {
                val bars = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.ime())
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            } else {
                @Suppress("DEPRECATION")
                v.setPadding(insets.systemWindowInsetLeft, insets.systemWindowInsetTop, insets.systemWindowInsetRight, insets.systemWindowInsetBottom)
            }
            insets
        }
        setContentView(root)
        val scroll = ScrollView(this).apply { isFillViewport = true }
        root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
        page = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(20), dp(18), dp(20), dp(24)) }
        scroll.addView(page)
        text("CARE / SPHERE", 13f, bold = true)
        data.error?.let { text(it, 16f).setTextColor(Color.rgb(130,55,20)); button("Retry secure save") { data.save(); render() } }
        when {
            settings -> settingsPage()
            activityIndex >= 0 -> activityPage()
            tab == 0 -> today()
            tab == 1 -> activities()
            tab == 2 -> care()
            else -> health()
        }
        val largeText = resources.configuration.fontScale > 1.3f
        val nav = LinearLayout(this).apply {
            orientation = if(largeText) LinearLayout.VERTICAL else LinearLayout.HORIZONTAL
            setPadding(dp(8), dp(6), dp(8), dp(6))
        }
        root.addView(nav, LinearLayout.LayoutParams(-1, -2))
        var navRow = nav
        (if(data.json.optJSONObject("tools")?.optBoolean("simple") == true) listOf("My Day", "Activities", "My People") else listOf("Today", "Activities", "Care", "Health")).forEachIndexed { i, label ->
            val b = Button(this).apply {
                text = label; textSize = 15f; isAllCaps = false; minHeight = dp(56)
                setTextColor(if (i == tab && !settings && activityIndex < 0) Color.WHITE else green)
                background = shape(if (i == tab && !settings && activityIndex < 0) fill else bg, 14)
                isSelected = i == tab && !settings && activityIndex < 0
                setOnClickListener { if(i == 2 && data.json.optJSONObject("tools")?.optBoolean("simple") == true) { startActivity(Intent(this@MainActivity, SupportActivity::class.java)); return@setOnClickListener }; stopComfort(); tab = i; settings = false; activityIndex = -1; render() }
            }
            if(largeText && i % 2 == 0) {
                navRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
                nav.addView(navRow, LinearLayout.LayoutParams(-1, -2))
            }
            navRow.addView(b, LinearLayout.LayoutParams(0, -2, 1f).apply { marginEnd = dp(3) })
        }
        root.requestApplyInsets()
    }
    private fun today() {
        val name = data.json.optString("name")
        text(if (name.isBlank()) "Your day, at your pace." else "Hello, $name.", 30f, bold = true).apply { if (Build.VERSION.SDK_INT >= 28) isAccessibilityHeading = true }
        text(LocalDate.now().format(DateTimeFormatter.ofPattern("EEEE, MMMM d")), 16f)
        button("My support tools") { startActivity(Intent(this, SupportActivity::class.java)) }
        button("Settings & privacy") { settings = true; render() }
        card("A small moment for you") { c ->
            text("Choose an activity, check in with yourself, or simply take a break. Everything here is optional.", parent = c)
            button("Explore activities", c, true) { tab = 1; render() }
        }
        card("My routine today") { c ->
            val routines = data.list("routines")
            if (routines.length() == 0) text("No routines yet. Add something that matters to you.", parent = c)
            val done = data.list("done")
            for (i in 0 until routines.length()) {
                val item = routines.getJSONObject(i)
                val check = CheckBox(this).apply {
                    text = item.getString("title"); textSize = 18f; minHeight = dp(52); setTextColor(ink)
                    isChecked = (0 until done.length()).any { done.optString(it) == item.getString("id") }
                    isEnabled = data.canWrite
                    setOnCheckedChangeListener { _, checked ->
                        val updated = JSONArray()
                        for (j in 0 until done.length()) if (done.optString(j) != item.getString("id")) updated.put(done.optString(j))
                        if (checked) updated.put(item.getString("id"))
                        data.put("done", updated); render()
                    }
                }; c.addView(check)
            }
            button("Add a routine", c) {
                if (routines.length() >= 24) { message("You can keep up to 24 routines. Remove one in Settings first."); return@button }
                input("Add your routine", "A short reminder", 80) { title ->
                    routines.put(JSONObject().put("id", java.util.UUID.randomUUID().toString()).put("title", title))
                    data.put("routines", routines); render()
                }
            }.isEnabled = data.canWrite
        }
        card("How are you feeling?") { c ->
            val current = data.json.optString("mood")
            text(if(current.isBlank()) "No check-in today. Choose a word if you want to." else "Today's self-report: $current", parent = c)
            listOf("Low", "Okay", "Good", "Prefer not to say").forEach { mood ->
                button(mood, c) { data.put("mood", mood); render() }.isEnabled = data.canWrite
            }
            text("A personal check-in, not a health assessment.", 14f, c)
        }
    }
    private fun searchField(label: String, value: String, changed: (String) -> Unit) {
        text(label, 15f, bold = true)
        val field = EditText(this).apply {
            hint = label; contentDescription = label; setText(value); textSize = 18f
            isSingleLine = true; setTextColor(ink); setHintTextColor(muted)
            setPadding(dp(14), dp(10), dp(14), dp(10)); minHeight = dp(52); background = shape(soft, 14)
            filters = arrayOf(android.text.InputFilter.LengthFilter(160))
        }
        page.addView(field, LinearLayout.LayoutParams(-1, -2))
        field.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) { changed(s.toString()) }
            override fun afterTextChanged(s: Editable?) {}
        })
    }
    private fun openActivity(i: Int) {
        activityIndex = i; round = 0; feedback = ""; firstPair = -1; secondPair = -1; matched.clear(); memoryPosition = 0; memoryHidden = false
        (getSystemService(INPUT_METHOD_SERVICE) as android.view.inputmethod.InputMethodManager).hideSoftInputFromWindow(root.windowToken, 0)
        render()
    }
    private fun activities() {
        text("Make room for a pause.", 30f, bold = true)
        text("Find something you enjoy. Save a favorite for next time. No scores, streaks, or pressure to finish.")
        lateinit var results: LinearLayout
        searchField("Find an activity", activityQuery) { activityQuery = it; activityResults(results) }
        val only = CheckBox(this).apply {
            text = "Favorites only"; textSize = 18f; minHeight = dp(52); setTextColor(ink); isChecked = favoritesOnly
            setOnCheckedChangeListener { _, checked -> favoritesOnly = checked; activityResults(results) }
        }; page.addView(only)
        results = column(); activityResults(results)
        card("Why these activities?") { c ->
            text("Predictable steps, personal choice, and reduced sensory pressure draw on accessibility and wellbeing guidance. These individual games are not clinically validated dementia or autism treatments, cognitive stimulation therapy, or diagnostic tests.", parent = c)
            button("Read NICE dementia guidance", c) { openURL("https://www.nice.org.uk/guidance/ng97/chapter/recommendations") }
            button("Read NICE autistic-adult guidance", c) { openURL("https://www.nice.org.uk/guidance/cg142/chapter/recommendations") }
        }
    }
    private fun activityResults(parent: LinearLayout) {
        parent.removeAllViews()
        val favorites = data.favorites()
        val visible = ActivityRules.titles.indices.filter {
            (!favoritesOnly || LibraryPreferences.ids[it] in favorites) && LibraryPreferences.matches(ActivityRules.titles[it] + " " + LibraryPreferences.descriptions[it], activityQuery)
        }
        text("${visible.size} ${if(visible.size == 1) "activity" else "activities"} · available offline", 15f, parent)
        if(visible.isEmpty()) {
            text("No matching activities. Try a different word, or show everything.", parent = parent)
            button("Show all activities", parent) { activityQuery = ""; favoritesOnly = false; render() }
        }
        for (i in visible) {
            val c = column(parent); c.background = shape(surface); c.setPadding(dp(16), dp(12), dp(16), dp(14))
            (c.layoutParams as LinearLayout.LayoutParams).bottomMargin = dp(12)
            button(ActivityRules.titles[i], c, true) { openActivity(i) }
            text(LibraryPreferences.descriptions[i], 16f, c)
            val saved = LibraryPreferences.ids[i] in favorites
            button(if(saved) "Remove from favorites" else "Save to favorites", c) {
                data.toggleFavorite(LibraryPreferences.ids[i]); activityResults(parent)
                parent.announceForAccessibility(if(saved) "Removed from favorites" else "Saved to favorites")
            }.apply { contentDescription = "${if(saved) "Remove" else "Save"} ${ActivityRules.titles[i]} ${if(saved) "from" else "to"} favorites"; isEnabled = data.canWrite }
        }
    }
    private fun activityPage() {
        button("Back to activities") { activityIndex = -1; stopComfort(); render() }
        text(ActivityRules.titles[activityIndex], 29f, bold = true)
        text("Take your time. You can skip, ask for a hint, or stop.", 16f)
        when(activityIndex) {
            in 0..3 -> {
                val r = ActivityRules.round(activityIndex, round)
                card(r.prompt) { c ->
                    r.options.forEachIndexed { i, option -> button(option, c) {
                        feedback = if(i == r.answer) "That fits. Continue when you're ready." else "Let's look together. You can try another choice or use a hint."
                        render()
                    } }
                    button("Show a hint", c) { feedback = r.hint; render() }
                }
            }
            4 -> card("A conversation, not a test") { c ->
                val prompts = listOf("What music do you enjoy?", "Would you like to describe a place where you feel comfortable?", "Is there a food, texture, or scent you enjoy?", "What would make today more comfortable?")
                text(prompts[round % prompts.size], 24f, c, true)
                text("Speak, point, write elsewhere, listen, or skip. There is no right answer and nothing is recorded.", parent = c)
            }
            5 -> pairs()
            6 -> card("Name a feeling, if you want") { c ->
                text("People express feelings differently. These words are choices, not a judgment about someone's face or behavior.", parent = c)
                listOf("Comfortable", "Excited", "Tired", "Overwhelmed", "Not sure", "Something else").forEach { feeling ->
                    button(feeling, c) { feedback = "$feeling. Would a quiet moment, a change of activity, or company feel helpful? This choice is not saved."; render() }
                }
            }
            7 -> card("Tell the story your way") { c ->
                val scenes = listOf("☀  A sunny window", "🌱  A small plant", "☕  A cup on the table")
                text(scenes[round % scenes.size], 25f, c, true)
                text("Imagine this scene. What might happen next? You can describe, point, or simply look. This is a fictional prompt, not a memory test.", parent = c)
            }
            8 -> card("Remember a short pattern") { c ->
                if (!memoryHidden) {
                    text(memory.joinToString(" → "), 25f, c, true)
                    text("Look for as long as you like. You can reveal the pattern again at any time.", parent = c)
                    button("I'm ready to try", c, true) { memoryHidden = true; memoryPosition = 0; feedback = ""; render() }
                } else if (memoryPosition < memory.size) {
                    text("Choose item ${memoryPosition + 1} of ${memory.size}", parent = c)
                    memory.forEach { word -> button(word, c) {
                        if (word == memory[memoryPosition]) { memoryPosition++; feedback = if(memoryPosition == memory.size) "Pattern complete. Take a break or try again." else "Continue when you're ready." }
                        else feedback = "Try another choice, or reveal the pattern."
                        render()
                    } }
                    button("Reveal the pattern", c) { memoryHidden = false; render() }
                } else text("You reached the end of this pattern.", parent = c)
            }
            9 -> card("A gentle tone") { c ->
                text("Optional synthesized sound. Start with a comfortable device volume. It stops when you leave the app. Silence is always a good choice.", parent = c)
                button(if(playing) "Stop sound" else "Play gentle tone", c, true) {
                    if (playing) { sound.stop(); playing = false } else { playing = sound.play(); if(!playing) feedback = "Audio couldn't start. Check your sound output and try again." }
                    render()
                }
            }
            10 -> card("Breathe comfortably") { c ->
                text("Optional pace: in for 4 seconds, out for 6. No breath hold. Follow your own comfortable rhythm instead if you prefer. Stop if uncomfortable or dizzy.", parent = c)
                breathLabel = text(if(breathing) phase() else "Ready when you are", 30f, c, true)
                button(if(breathing) "Pause breathing guide" else "Start breathing guide", c, true) {
                    breathing = !breathing
                    handler.removeCallbacks(breathTick)
                    if(breathing) { breathSecond = 0; handler.postDelayed(breathTick, 1000) }
                    render()
                }
            }
        }
        if (feedback.isNotBlank()) text(feedback, 19f, bold = true).apply { accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE }
        if (activityIndex < 9) button("Next / start again") {
            round++; feedback = ""; firstPair = -1; secondPair = -1; matched.clear(); memoryHidden = false; memoryPosition = 0; render()
        }
        button("Take a break") { activityIndex = -1; stopComfort(); render() }
    }
    private fun pairs() = card("Find two matching cards") { c ->
        text("Cards stay visible until you choose to turn them over. No timer.", parent = c)
        pairWords.forEachIndexed { i, word ->
            val revealed = i == firstPair || i == secondPair || i in matched
            button(if (revealed) "Card ${i+1}: $word${if(i in matched) " · matched" else ""}" else "Reveal card ${i+1}", c) {
                if (i in matched || i == firstPair || secondPair != -1) return@button
                if (firstPair == -1) firstPair = i else {
                    secondPair = i
                    if (pairWords[firstPair] == word) {
                        matched.add(firstPair); matched.add(i); firstPair = -1; secondPair = -1
                        feedback = if (matched.size == pairWords.size) "All pairs found. Finish whenever you're ready." else "A matching pair."
                    } else feedback = "These are different. Take a look, then turn them over when ready."
                }
                render()
            }
        }
        if (secondPair >= 0) button("Turn these two cards over", c) { firstPair = -1; secondPair = -1; feedback = ""; render() }
        button("Hint: show the pairs", c) { feedback = "Flower: 1 and 5. Star: 2 and 4. Leaf: 3 and 6."; render() }
    }
    private fun phase() = if (breathSecond % 10 < 4) "Breathe in gently" else "Breathe out gently"
    private val breathTick = object : Runnable {
        override fun run() {
            if(!breathing) return
            breathSecond++
            val next = phase()
            if (breathLabel?.text != next) { breathLabel?.text = next; breathLabel?.announceForAccessibility(next) }
            handler.postDelayed(this, 1000)
        }
    }
    private fun care() {
        text("Keep what matters.", 30f, bold = true)
        text("Private notes on this device. Search, edit, or choose exactly what to share. No family sync or clinician portal is connected.")
        button("Write a care note", primary = true) {
            if (data.list("notes").length() >= 100) { message("You have 100 notes. Remove a note before adding another."); return@button }
            input("New care note", "What would you like to remember?", 4000) { note ->
                val notes = data.list("notes")
                notes.put(JSONObject().put("id", java.util.UUID.randomUUID().toString()).put("body", note).put("at", Instant.now().toString()))
                data.put("notes", notes); noteQuery = ""; render()
            }
        }.isEnabled = data.canWrite
        lateinit var results: LinearLayout
        searchField("Search care notes", noteQuery) { noteQuery = it; noteResults(results) }
        results = column(); noteResults(results)
        card("Connect with someone you trust") { c ->
            text("Create a room link, share it yourself, and open the real video provider. Nobody is invited automatically. The provider may require sign-in and handles its own privacy and permissions.", parent = c)
            button("Create a video invitation", c) {
                val url = "https://meet.jit.si/CareSphere-${java.util.UUID.randomUUID()}"
                dialogBuilder().setTitle("Your room invitation").setMessage(url)
                    .setPositiveButton("Open provider") { _, _ -> openURL(url) }
                    .setNeutralButton("Share link") { _, _ -> share(url) }.setNegativeButton("Cancel", null).show()
            }
        }
    }
    private fun noteResults(parent: LinearLayout) {
        parent.removeAllViews()
        val notes = data.list("notes")
        val visible = (notes.length()-1 downTo 0).filter { LibraryPreferences.matches(notes.getJSONObject(it).optString("body"), noteQuery) }
        if(notes.length() == 0) { text("No notes yet", 22f, parent, true); text("Only notes you write will appear here.", parent = parent) }
        else if(visible.isEmpty()) { text("No notes match your search.", parent = parent); button("Clear search", parent) { noteQuery = ""; render() } }
        else text("${visible.size} ${if(visible.size == 1) "note" else "notes"}", 15f, parent)
        for(i in visible) {
            val note = notes.getJSONObject(i)
            val c = column(parent); c.background = shape(surface); c.setPadding(dp(16), dp(14), dp(16), dp(14))
            (c.layoutParams as LinearLayout.LayoutParams).topMargin = dp(12)
            text(note.getString("body"), 18f, c)
            val date = runCatching { Instant.parse(note.getString("at")).atZone(ZoneId.systemDefault()).format(DateTimeFormatter.ofPattern("MMM d, yyyy · h:mm a")) }.getOrDefault("Date not recorded")
            text("Created $date${if(note.has("editedAt")) " · edited" else ""}", 14f, c)
            button("Edit note", c) { input("Edit care note", "Your note", 4000, initial = note.getString("body")) { body ->
                note.put("body", body).put("editedAt", Instant.now().toString()); data.put("notes", notes); render()
            } }.isEnabled = data.canWrite
            button("Review & share this note", c) { confirm("Share this note?", "Review the recipient before sending.\n\n${note.getString("body")}") { share(note.getString("body")) } }
            button("Delete note", c) { confirm("Delete this note?", "Move this note to Recently deleted in My support tools for 30 days? Previously shared copies cannot be removed.") { val trash = data.list("trash"); trash.put(JSONObject(note.toString()).put("deletedAt", System.currentTimeMillis())); while(trash.length() > 100) trash.remove(0); data.put("trash", trash); notes.remove(i); data.put("notes", notes); render() } }.isEnabled = data.canWrite
        }
    }
    private fun health() {
        text("Real readings only.", 30f, bold = true)
        text("Connect a monitor that broadcasts the standard Bluetooth Heart Rate service. A phone camera is not used to estimate your pulse.")
        card("Heart rate") { c ->
            hrLabel = text(monitor.bpm?.let { "$it bpm" } ?: "— bpm", 40f, c, true)
            hrStatus = text(monitor.status, parent = c)
            hrTimestamp = text("", 14f, c)
            hrControl = button("Pair a heart-rate monitor", c, true) {
                if (monitor.busy || monitor.connected) monitor.disconnect()
                else if (!monitor.permitted()) requestPermissions(monitor.permissions, 18)
                else monitor.scan()
            }
            deviceList = column(c)
            button("Bluetooth settings", c) {
                runCatching { startActivity(Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS)) }
                    .onFailure { message("Open Bluetooth in your device Settings.") }
            }
            button("App permissions", c) {
                runCatching { startActivity(Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName"))) }
                    .onFailure { message("Open CareSphere's permissions in Android Settings.") }
            }
            text("Readings expire after 15 seconds without an update. Monitoring stops when the app leaves the foreground. This is not a medical device or an emergency monitor.", 15f, c)
        }
        card("Other health data") { c ->
            text("Blood pressure, blood oxygen, Health Connect, and smartwatch-account syncing are not connected in this Android release. No values are generated or substituted.", parent = c)
            text("For symptoms or health concerns, contact a qualified clinician. In an emergency, use your phone to contact local emergency services.", parent = c)
        }
        updateHealth()
    }
    private fun updateHealth() {
        if (!::monitor.isInitialized) return
        hrLabel?.text = monitor.bpm?.let { "$it bpm" } ?: "— bpm"
        hrStatus?.text = monitor.status
        hrTimestamp?.text = monitor.measuredAt?.let { "Received ${Instant.ofEpochMilli(it).atZone(ZoneId.systemDefault()).format(DateTimeFormatter.ofPattern("h:mm:ss a"))} · Bluetooth monitor" } ?: "No current measurement"
        hrControl?.text = if(monitor.busy) "Cancel pairing" else if(monitor.connected) "Disconnect monitor" else "Pair a heart-rate monitor"
        val signature = monitor.devices.keys.joinToString() + monitor.busy + monitor.connected
        if (displayedDevices != signature) {
            displayedDevices = signature
            deviceList?.let { c ->
                c.removeAllViews()
                if (!monitor.connected && (!monitor.busy || monitor.scanning)) monitor.devices.values.forEach { device ->
                    val name = try { device.name ?: "Heart-rate monitor" } catch (_: SecurityException) { "Heart-rate monitor" }
                    button("$name · ${device.address.takeLast(5)}", c) { monitor.connect(device) }
                }
            }
        }
    }
    override fun onRequestPermissionsResult(code: Int, permissions: Array<out String>, results: IntArray) {
        super.onRequestPermissionsResult(code, permissions, results)
        if(code == 18) {
            if (results.isNotEmpty() && monitor.permitted()) monitor.scan()
            else message("Permission was not granted. No reading is shown. You can allow Nearby devices (or Location on older Android) in Android Settings when ready.")
        }
    }
    private fun settingsPage() {
        button("Back to Today") { settings = false; tab = 0; render() }
        text("Your app. Your choices.", 29f, bold = true)
        card("Profile") { c ->
            text("Display name: ${data.json.optString("name").ifBlank { "Not entered" }}", parent = c)
            button("Set display name", c) { input("Your name", "Optional display name", 60) { data.put("name", it); render() } }.isEnabled = data.canWrite
            button("Clear display name", c) { data.put("name", ""); render() }.isEnabled = data.canWrite
        }
        card("Routine management") { c ->
            val routines = data.list("routines")
            if(routines.length() == 0) text("Add routines from Today.", parent = c)
            for(i in 0 until routines.length()) {
                button("Remove ${routines.getJSONObject(i).getString("title")}", c) { confirm("Remove routine?", "Your other routines will remain.") { routines.remove(i); data.put("routines", routines); render() } }.isEnabled = data.canWrite
            }
        }
        card("Appearance") { c ->
            text("Choose what feels comfortable. System follows your device's light or dark setting.", parent = c)
            val current = data.json.optString("appearance", "system")
            listOf("system", "light", "dark").forEach { mode ->
                button("${mode.replaceFirstChar { it.uppercase() }}${if(current == mode) " · selected" else ""}", c) { data.put("appearance", mode); render() }
                    .apply { isSelected = current == mode; isEnabled = data.canWrite }
            }
        }
        card("Accessibility") { c ->
            text("Text follows Android's font-size setting. Buttons have text labels and generous touch targets. Activities don't auto-advance; no flashing, points, or timed tests. TalkBack uses the native controls.", parent = c)
            button("Open Android accessibility settings", c) { runCatching { startActivity(Intent(android.provider.Settings.ACTION_ACCESSIBILITY_SETTINGS)) }.onFailure { message("Open Accessibility in Android Settings.") } }
        }
        card("Privacy & local data") { c ->
            text("Care notes, routines, name, and today's mood are encrypted with AES-GCM using a key in Android Keystore. System backup is disabled. No analytics, ad SDKs, account, or background health monitoring. Shared exports are no longer protected by CareSphere.", parent = c)
            button("Review & export my data", c) { confirm("Export private data?", "The export includes your name, routines, mood, and notes. Share only with a recipient you trust.\n\n${data.json.toString(2)}") { share(data.json.toString(2)) } }.isEnabled = data.canWrite
            button("Erase all local data", c) { confirm("Erase everything?", "This permanently removes your saved care information and encryption key from this app. Copies you previously shared cannot be removed.") { monitor.disconnect(); data.erase(); settings = false; tab = 0; render() } }
        }
        card("About this Android release") { c ->
            text("CareSphere 1.1 · Native Android\nEleven optional activities, local routines and notes, daily mood self-report, real Bluetooth heart rate, and deliberate sharing. No generated health measurements.", parent = c)
            text("Apple Intelligence is an Apple-only capability and is not available in this Android app. No AI answers are fabricated or substituted. This is a first Android release, not full iOS feature parity.", parent = c)
        }
    }
    private fun input(title: String, hint: String, limit: Int, initial: String = "", save: (String) -> Unit) {
        val input = EditText(ContextThemeWrapper(this, if(dark) android.R.style.Theme_Material else android.R.style.Theme_Material_Light)).apply { this.hint = hint; setText(initial); setSelection(text.length); minLines = 2; maxLines = 7; filters = arrayOf(android.text.InputFilter.LengthFilter(limit)); setPadding(dp(22), dp(14), dp(22), dp(14)) }
        val dialog = dialogBuilder().setTitle(title).setView(input).setPositiveButton("Save", null).setNegativeButton("Cancel", null).create()
        dialog.setOnShowListener { dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
            val value = input.text.toString().trim()
            if(value.isBlank()) input.error = "Enter some text, or cancel." else { save(value); dialog.dismiss() }
        } }; dialog.show()
    }
    private fun confirm(title: String, body: String, action: () -> Unit) {
        dialogBuilder().setTitle(title).setMessage(body).setPositiveButton("Continue") { _, _ -> action() }.setNegativeButton("Cancel", null).show()
    }
    private fun message(value: String) { dialogBuilder().setMessage(value).setPositiveButton("OK", null).show() }
    private fun share(value: String) {
        runCatching { startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, value), "Choose who receives this")) }
            .onFailure { message("No compatible sharing app is available. Nothing was sent.") }
    }
    private fun openURL(url: String) {
        runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }.onFailure { message("No browser is available. Open this link on a device with a browser: $url") }
    }
}
