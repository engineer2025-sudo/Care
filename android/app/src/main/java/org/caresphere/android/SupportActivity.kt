package org.caresphere.android

import android.app.*
import android.os.Bundle
import android.content.*
import android.content.res.Configuration
import android.graphics.*
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.speech.tts.TextToSpeech
import android.view.*
import android.widget.*
import org.json.*
import java.util.UUID
import java.util.Base64

/** Personal tools are native controls backed by the same encrypted CareData store. */
class SupportActivity : ProtectedActivity() {
    private fun tx(value:String)=AppLanguage.text(this,value)
    private lateinit var data: CareData
    private lateinit var page: LinearLayout
    private var section = "Start here"
    private var planId: String? = null
    private var step = 0
    private var paused = false
    private var photoIndex = 0
    private var promptIndex = 0
    private var pack = "Nature"
    private var phrase = ""
    private val summarySelection=mutableSetOf<String>()
    private var tts: TextToSpeech? = null
    private var speechReady = false
    private var pendingSpeech: String? = null
    private var backupBytes: ByteArray? = null
    private var password: CharArray? = null
    private var busy = false
    private var transferFile: java.io.File? = null
    private var receivedTransfer: JSONObject? = null
    private var receivedSalt: ByteArray? = null
    private var receivedSha256: String? = null
    private var receivedSource: String? = null
    private var pendingReceipt: JSONObject? = null
    private var verifyReceipt: JSONObject? = null
    private var verifyFile: ByteArray? = null
    private lateinit var nearbyDiscovery: NearbyDiscovery
    private var nearbyHost: LocalTransferHost? = null
    private var nearbyReceiver: LocalTransferReceiver? = null
    private var nearbyGeneration = UUID.randomUUID()
    private var nearbyBusy = false
    private var nearbyOffer: Pair<String,String>? = null
    private var nearbyStatus = ""
    private var foreground = false
    private var pairs = false
    private val revealed = mutableListOf<Int>()
    private val matched = mutableSetOf<Int>()
    private val tools: JSONObject get() = data.json.optJSONObject("tools") ?: JSONObject()
    private val dark: Boolean get() = data.json.optString("appearance", "system").let { it == "dark" || it == "system" && resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES }
    private val ink get() = if(dark) Color.rgb(237,244,237) else Color.rgb(28,46,36)
    private val bg get() = if(dark) Color.rgb(20,29,23) else Color.rgb(246,248,244)
    private val soft get() = if(dark) Color.rgb(45,62,49) else Color.rgb(233,240,232)
    private val sections = listOf("Start here", "Visual routines", "Communication", "My photos", "My people", "Comfort", "Appointments", "Visit summary", "Recovery & backup", "Interest activities", "Device sharing")
    private val phrases = listOf("I need a break", "It is too loud", "Please explain again", "Yes", "No", "I would like help")
    private val packs = mapOf("Nature" to listOf("What do you notice outside?", "Would you choose a garden, beach or forest?", "Point to something that grows."), "Music" to listOf("What sounds do you enjoy?", "Would you like music or quiet?", "Tell a story about a song, or skip."), "Familiar objects" to listOf("What makes a place comfortable?", "Which object do you like nearby?", "Describe a familiar everyday task."))
    private fun dp(v:Int) = (resources.displayMetrics.density*v).toInt()
    private fun rows(key:String) = (tools.optJSONArray(key) ?: JSONArray()).let { a -> (0 until a.length()).mapNotNull { a.optJSONObject(it) } }
    private fun save(key:String, value:Any) { val copy=tools;copy.put(key,value);data.put("tools",copy) }
    private fun update(key:String, values:List<JSONObject>) { save(key,JSONArray(values)); render() }
    private fun dialog()=AlertDialog.Builder(ContextThemeWrapper(this, if(dark) android.R.style.Theme_Material_Dialog_Alert else android.R.style.Theme_Material_Light_Dialog_Alert))
    private fun text(value:String,size:Float=18f) { page.addView(TextView(this).apply { text=value;textSize=size;setTextColor(ink);setPadding(0,dp(10),0,dp(10));setTextIsSelectable(true) }) }
    /** Explanatory/guidance copy: hidden entirely in Bare minimum mode. */
    private fun copy(value:String,size:Float=18f) { if(!DisplayMode.enabled(this)) text(value,size) }
    private fun button(label:String, action:()->Unit):Button = Button(this).apply { text=label;isAllCaps=false;textSize=18f;minHeight=dp(52);setTextColor(ink);background=GradientDrawable().apply{setColor(soft);cornerRadius=dp(14).toFloat()};page.addView(this,LinearLayout.LayoutParams(-1,-2).apply{topMargin=dp(6);bottomMargin=dp(6)});setOnClickListener{action()} }
    private fun message(value:String) { if(!isFinishing && !isDestroyed)dialog().setMessage(value).setPositiveButton(tx("OK"),null).showProtected() }
    private fun confirm(body:String,action:()->Unit) { dialog().setMessage(body).setNegativeButton(tx("Cancel"),null).setPositiveButton(tx("Continue")){_,_->action()}.showProtected() }
    private fun form(title:String, labels:List<Pair<String,String>>, passwordField:Boolean=false, action:(List<String>)->Unit) {
        val box=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(dp(20),0,dp(20),0)}
        val fields=labels.map{(label,value)->EditText(ContextThemeWrapper(this,if(dark)android.R.style.Theme_Material else android.R.style.Theme_Material_Light)).apply{hint=tx(label);contentDescription=tx(label);setText(value);minLines=1;maxLines=6;filters=arrayOf(android.text.InputFilter.LengthFilter(if(passwordField)1024 else 4000));if(passwordField)inputType=android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD;
            if(label=="8-digit connection code"){inputType=android.text.InputType.TYPE_CLASS_NUMBER;filters=arrayOf(android.text.InputFilter.LengthFilter(8));setSingleLine(true)}
            if(label=="Device address"){inputType=android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_URI;filters=arrayOf(android.text.InputFilter.LengthFilter(21));setSingleLine(true)}
            box.addView(this)}}
        val scroll=ScrollView(this);scroll.addView(box)
        val d=dialog().setTitle(title).setView(scroll).setNegativeButton(tx("Cancel"),null).setPositiveButton(tx("Continue"),null).create()
        d.setOnShowListener{d.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener{try{action(fields.map{it.text.toString()});d.dismiss()}catch(_:IllegalArgumentException){fields.first().error="Check the fields. Enter a title/text and valid details."}}};d.showProtected()
    }
    override fun onCreate(state:Bundle?) {super.onCreate(state);nearbyDiscovery=NearbyDiscovery(this){if(foreground&&!isFinishing&&!isDestroyed&&section=="Device sharing")render()};data=CareData(this);section=state?.getString("section")?:"Start here";render()}
    override fun onSaveInstanceState(out:Bundle){super.onSaveInstanceState(out);out.putString("section",section)}
    override fun onResume(){super.onResume();foreground=!AppLock.locked(this);data=CareData(this);if(section=="Device sharing")render()}
    override fun onPrivacyUnlocked(){foreground=true;data=CareData(this);render()}
    override fun onStop(){foreground=false;stopNearby();super.onStop();tts?.stop();pendingSpeech=null;paused=true}
    override fun onDestroy(){stopNearby();tts?.shutdown();password?.fill('\u0000');backupBytes?.fill(0);super.onDestroy()}
    private fun configureSpeechVoice(): Boolean {
        val engine = tts ?: return false
        return runCatching {
            val voice = engine.voices.orEmpty().firstOrNull {
                !it.isNetworkConnectionRequired &&
                it.features?.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED) != true &&
                AppLanguage.voiceMatches(it.locale.toLanguageTag(), AppLanguage.current(this))
            }
            voice != null && engine.setVoice(voice) == TextToSpeech.SUCCESS
        }.getOrDefault(false)
    }
    private fun say(value:String){
        pendingSpeech=value
        if(tts==null){
            tts=TextToSpeech(this){status->
                speechReady=status==TextToSpeech.SUCCESS
                if(!foreground || isFinishing || isDestroyed){pendingSpeech=null}
                else if(speechReady){pendingSpeech?.let{say(it)}}
                else {pendingSpeech=null;message(tx("No installed voice for this language. The words remain visible."))}
            }
            return
        }
        if(!speechReady)return // Initialization keeps only the most recently requested text.
        // Recheck on every request: a resumed activity may have a different UI language.
        if(!configureSpeechVoice()){
            pendingSpeech=null
            message(tx("No installed voice for this language. The words remain visible."))
            return
        }
        val result=tts?.speak(value,TextToSpeech.QUEUE_FLUSH,null,UUID.randomUUID().toString())
        pendingSpeech=null
        if(result!=TextToSpeech.SUCCESS)message(tx("No installed voice for this language. The words remain visible."))
    }
    private fun render(){
        val scroll=ScrollView(this);page=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(dp(20),dp(16),dp(20),dp(28));setBackgroundColor(bg)};scroll.addView(page);setContentView(scroll)
        scroll.setOnApplyWindowInsetsListener{v,insets->if(android.os.Build.VERSION.SDK_INT>=30){val bars=insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.ime());v.setPadding(bars.left,bars.top,bars.right,bars.bottom)};insets};scroll.requestApplyInsets()
        text(tx("My support tools"),28f);button(tx("Back to CareSphere")){finish()};button(AppLanguage.format(this,"Choose a tool · {0}",tx(section))){dialog().setItems(sections.map{tx(it)}.toTypedArray()){_,i->stopNearby();tts?.stop();section=sections[i];phrase="";planId=null;render()}.showProtected()}
        data.error?.let{text(it)}
        when(section){
            "Start here"->{copy(tx("Try activities without a profile. Add only the tools you want. Permissions are requested when needed."));button(tx("Choose comfort settings")){section="Comfort";render()};button(tx("Make a visual routine")){section="Visual routines";render()};button(tx("Finish introduction")){save("introduced",true);message(tx("These tools stay available from Today."))}}
            "Visual routines"->plans()
            "Communication"->communication()
            "My photos"->photos()
            "My people"->people()
            "Comfort"->comfort()
            "Appointments"->questions()
            "Visit summary"->visitSummary()
            "Recovery & backup"->recovery()
            "Interest activities"->{button(AppLanguage.format(this,"Interest · {0}",tx(pack))){dialog().setItems(packs.keys.map{tx(it)}.toTypedArray()){_,i->pack=packs.keys.elementAt(i);promptIndex=0;render()}.showProtected()};text(tx(packs.getValue(pack)[promptIndex%3]),24f);button(tx("Next / skip")){promptIndex++;render()};copy(tx("Speak, point, listen or skip. Answers are not recorded. These are leisure prompts, not treatment."))}
            else->deviceSharing()
        }
    }
    private fun comfort(){
        listOf("simple" to "Simple Mode — three destinations", "speakSteps" to "Speak steps after I start or advance").forEach{(key,label)->page.addView(CheckBox(this).apply{text=tx(label);textSize=18f;setTextColor(ink);isChecked=tools.optBoolean(key);setOnCheckedChangeListener{_,value->save(key,value)}})}
        button(AppLanguage.format(this,"Photo pairs · {0} choices",tools.optInt("choices",3))){dialog().setItems(arrayOf("2","3","4")){_,i->save("choices",i+2);render()}.showProtected()}
        copy(tx("Turn Simple Mode off here to restore Care and Health. Text follows Android font settings. Sound never starts automatically; installed offline voices are used for speech when available."))
        button(tx("Android accessibility settings")){runCatching{startActivity(Intent(android.provider.Settings.ACTION_ACCESSIBILITY_SETTINGS))}.onFailure{message(tx("Open Accessibility in device Settings."))}}
    }
    private fun communication(){
        copy(tx("A supplement to your existing communication system. Tap to display, then choose Speak."))
        if(phrase.isNotEmpty()){text(phrase,30f);button(tx("Speak this phrase")){say(phrase)};button(tx("Clear / stop")){tts?.stop();phrase="";render()}}
        (phrases.map{tx(it)}+rows("phrases").map{it.optString("text")}).forEach{value->button(value){tts?.stop();phrase=value;render()}}
        button(tx("Add my own phrase")){form(tx("My phrase"),listOf("Phrase" to "")){values->require(values[0].isNotBlank());require(rows("phrases").size<24);update("phrases",rows("phrases")+JSONObject().put("text",values[0].trim().take(240)))}}
        if(rows("phrases").isNotEmpty())button(tx("Remove a custom phrase")){val values=rows("phrases");dialog().setItems(values.map{it.optString("text")}.toTypedArray()){_,i->update("phrases",values.filterIndexed{j,_->j!=i})}.showProtected()}
    }
    private fun plans(){
        val current=rows("plans").firstOrNull{it.optString("id")==planId}
        if(current!=null){val steps=current.getJSONArray("steps");step=step.coerceIn(0,steps.length()-1);text(current.optString("title"),24f);text(AppLanguage.format(this,"Step {0} of {1}",step+1,steps.length()))
            if(paused){text(tx("Take your time."));button(tx("Continue")){paused=false;render()}}else{
                text(steps.getString(step),26f);rows("photos").firstOrNull{it.optString("id")==current.optString("photo") }?.let{image(it)}
                button(tx("Read this step")){say(steps.getString(step))};button(tx("Take a break")){tts?.stop();paused=true;render()}
                listOf("Done / next","Skip").forEach{label->button(tx(label)){tts?.stop();if(step+1<steps.length()){step++;if(tools.optBoolean("speakSteps"))say(steps.getString(step))}else{planId=null;message(tx("Routine ended. No score or completion record saved."))};render()}}
            };button(tx("End routine")){tts?.stop();planId=null;render()};return
        }
        copy(tx("Your instructions, one step per line. Do not change prescribed medication instructions here."))
        button(tx("Create visual routine")){form(tx("Visual routine"),listOf("Title" to "","Steps, one per line" to "")){values->val steps=values[1].lines().map{it.trim().take(240)}.filter{it.isNotEmpty()}.take(40);require(values[0].isNotBlank()&&steps.isNotEmpty()&&rows("plans").size<30);update("plans",rows("plans")+JSONObject().put("id",UUID.randomUUID()).put("title",values[0].take(120)).put("steps",JSONArray(steps)))}}
        rows("plans").forEach{p->text(p.optString("title"),22f);button(AppLanguage.format(this,"Start {0}",p.optString("title"))){planId=p.getString("id");step=0;paused=false;if(tools.optBoolean("speakSteps"))say(p.getJSONArray("steps").getString(0));render()};button(tx("Choose routine photo")){val photos=rows("photos");dialog().setItems((listOf(tx("No photo"))+photos.map{it.optString("caption")}).toTypedArray()){_,i->p.put("photo",if(i==0)"" else photos[i-1].optString("id"));update("plans",rows("plans").map{if(it.optString("id")==p.optString("id"))p else it})}.showProtected()};button(tx("Delete routine")){confirm(tx("Delete this visual routine? This cannot be undone.")){update("plans",rows("plans").filter{it.optString("id")!=p.optString("id")})}}}
    }
    private fun people(){
        text(tx("Ask permission before saving someone's details. Nothing is sent automatically."))
        button(tx("Add trusted contact")){form(tx("Contact"),listOf("Name" to "","Phone (optional)" to "","HTTPS video link (optional)" to "")){v->val phone=v[1].filter{"+0123456789() .-".contains(it)}.take(32);val url=Uri.parse(v[2]);val video=if(url.scheme=="https"&&!url.host.isNullOrBlank()&&url.userInfo==null)v[2]else"";require(v[0].isNotBlank()&&(phone.isNotEmpty()||video.isNotEmpty())&&rows("contacts").size<20);update("contacts",rows("contacts")+JSONObject().put("id",UUID.randomUUID()).put("name",v[0].take(80)).put("phone",phone).put("video",video))}}
        rows("contacts").forEach{c->text(c.optString("name"),24f);val phone=c.optString("phone").filter{"+0123456789".contains(it)};if(phone.isNotEmpty()){button("Call ${c.optString("name")}"){open("tel:$phone",Intent.ACTION_DIAL)};button("Message ${c.optString("name")}"){open("sms:$phone",Intent.ACTION_SENDTO)}};val video=c.optString("video");if(Uri.parse(video).scheme=="https")button(tx("Open video")){open(video)};button(tx("Remove contact")){confirm(tx("Remove this saved contact?")){update("contacts",rows("contacts").filter{it.optString("id")!=c.optString("id")})}}}
    }
    private fun open(value:String,action:String=Intent.ACTION_VIEW){confirm(tx("Open another app? Review the recipient there; the provider's privacy terms apply.")){runCatching{startActivity(Intent(action,Uri.parse(value)))}.onFailure{message(tx("No compatible app is installed. Nothing was sent."))}}}
    private fun questions(){
        button(tx("Add appointment question")){form(tx("Question"),listOf("What would you like to ask?" to "")){v->require(v[0].isNotBlank()&&rows("questions").size<100);update("questions",rows("questions")+JSONObject().put("id",UUID.randomUUID()).put("text",v[0].take(1000)))}}
        rows("questions").forEach{q->text(q.optString("text"),22f);listOf("important" to "Important","discussed" to "Discussed").forEach{(key,label)->page.addView(CheckBox(this).apply{text=tx(label);textSize=18f;setTextColor(ink);isChecked=q.optBoolean(key);setOnCheckedChangeListener{_,value->q.put(key,value);save("questions",JSONArray(rows("questions").map{if(it.optString("id")==q.optString("id"))q else it}))}})};text("Follow-up: ${q.optString("followup","None entered")}");button(tx("Edit follow-up")){form(tx("Follow-up"),listOf("Follow-up" to q.optString("followup"))){v->q.put("followup",v[0].take(2000));update("questions",rows("questions").map{if(it.optString("id")==q.optString("id"))q else it})}};button(tx("Delete question")){confirm(tx("Delete this question and follow-up?")){update("questions",rows("questions").filter{it.optString("id")!=q.optString("id")})}}}
        button(tx("Review & share questions")){val value=rows("questions").sortedByDescending{it.optBoolean("important")}.joinToString("\n\n"){"${if(it.optBoolean("important"))"IMPORTANT: " else ""}${it.optString("text")}\nFollow-up: ${it.optString("followup")}"};confirm("Share these questions? Exported text is not encrypted by CareSphere.\n\n$value"){runCatching{startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT,value),"Choose recipient"))}.onFailure{message(tx("No sharing app available."))}}}
    }
    private fun visitSummary(){
        text(tx("Structured draft · no AI"),24f)
        copy(tx("Choose your notes and questions. This offline template copies only your selected words; it does not diagnose, simplify wording, or invent advice. Review and edit before saving a new note."))
        val notes=data.list("notes")
        val records=(0 until notes.length()).map{val n=notes.getJSONObject(it);("note:"+n.optString("id")) to n.optString("body")}+
            rows("questions").map{q->("question:"+q.optString("id")) to (q.optString("text")+if(q.optString("followup").isBlank())"" else "\n"+tx("Follow-up")+": "+q.optString("followup"))}
        records.forEach{(id,body)->page.addView(CheckBox(this).apply{text=body;textSize=18f;setTextColor(ink);isChecked=summarySelection.contains(id);setOnCheckedChangeListener{_,checked->if(checked)summarySelection.add(id)else summarySelection.remove(id)}})}
        button(tx("Review selected draft")){
            val chosen=records.filter{summarySelection.contains(it.first)}
            if(chosen.isEmpty()){message(tx("Choose at least one note or question."));return@button}
            val draft=tx("User-selected visit notes · not medical advice")+"\n\n"+chosen.joinToString("\n\n"){it.second}
            if(draft.length>4000){message(tx("The selected text is too long. Choose fewer records; nothing was shortened or saved."));return@button}
            form(tx("Review selected draft"),listOf("Your note" to draft)){v->
                require(v[0].isNotBlank()&&data.list("notes").length()<100)
                data.put("notes",data.list("notes").put(JSONObject().put("id",UUID.randomUUID().toString()).put("body",v[0]).put("at",java.time.Instant.now().toString())))
                if(data.error==null){summarySelection.clear();message(tx("Saved as a new note. Original records were not changed."))}else message(data.error!!)
                render()
            }
        }.isEnabled=data.canWrite
    }
    private fun image(photo:JSONObject){runCatching{val bytes=Base64.getDecoder().decode(photo.optString("jpeg"));if(bytes.size>180000)return;val bounds=BitmapFactory.Options().apply{inJustDecodeBounds=true};BitmapFactory.decodeByteArray(bytes,0,bytes.size,bounds);if(bounds.outWidth !in 1..2048 || bounds.outHeight !in 1..2048)return;val options=BitmapFactory.Options().apply{inSampleSize=maxOf(1,maxOf(bounds.outWidth,bounds.outHeight)/512)};val bitmap=BitmapFactory.decodeByteArray(bytes,0,bytes.size,options)?:return;page.addView(ImageView(this).apply{setImageBitmap(bitmap);adjustViewBounds=true;maxHeight=dp(300);contentDescription=photo.optString("caption")},LinearLayout.LayoutParams(-1,-2))}}
    private fun photos(){
        copy(tx("Up to 10 personal photos, resized and encrypted locally. No recognition or identity quizzes."))
        button(tx("Choose a photo")){if(rows("photos").size>=10){message(tx("Remove a photo before adding another."));return@button};runCatching{startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).setType("image/*").addCategory(Intent.CATEGORY_OPENABLE),610)}.onFailure{message(tx("No photo picker available."))}}
        val photos=rows("photos");if(photos.isEmpty())return
        button(if(pairs)"Conversation view" else "Photo matching"){pairs=!pairs;revealed.clear();matched.clear();render()}
        if(pairs){val chosen=photos.take(tools.optInt("choices",3).coerceIn(2,4));text(tx("Reveal two cards. Clear a mismatch yourself. No timer or score."));(0 until chosen.size*2).forEach{i->if(revealed.contains(i)||matched.contains(i))image(chosen[i%chosen.size]);button("Photo card ${i+1}${if(matched.contains(i))" · matched" else ""}"){if(revealed.size<2&&!revealed.contains(i)&&!matched.contains(i)){revealed.add(i);if(revealed.size==2&&revealed[0]%chosen.size==revealed[1]%chosen.size){matched.addAll(revealed);revealed.clear()};render()}}};button(tx("Clear selection")){revealed.clear();render()};button(tx("Start again")){revealed.clear();matched.clear();render()}}
        else{val photo=photos[photoIndex%photos.size];image(photo);text(photo.optString("caption"));text(tx("What do you notice? Speak, point, listen or skip."));button(tx("Next photo")){photoIndex++;render()};button(tx("Remove displayed photo")){confirm(tx("Remove this photo? Routine references will show text only.")){update("photos",photos.filter{it.optString("id")!=photo.optString("id")})}}}
    }
    private fun transferableRecords(): List<JSONObject> {
        val notes=data.list("notes");val routines=data.list("routines")
        return (0 until notes.length()).map { val n=notes.getJSONObject(it);JSONObject().put("id","n:"+n.optString("id")).put("type","note").put("text",n.optString("body")) } +
            (0 until routines.length()).map { val r=routines.getJSONObject(it);JSONObject().put("id","r:"+r.optString("id")).put("type","routine").put("text",r.optString("title")) }
    }
    private fun checkTransfer(payload: JSONObject): List<JSONObject> {
        require(payload.getInt("version")==1)
        val id=payload.getString("id");require(id.length==36 && UUID.fromString(id).toString().equals(id,true))
        val array=payload.getJSONArray("records");require(array.length() in 1..100)
        val records=(0 until array.length()).map { array.getJSONObject(it) }
        val ids=mutableSetOf<String>()
        records.forEach { r->require(r.opt("id") is String && r.opt("text") is String)
            val type=r.getString("type");val text=r.getString("text");val rid=r.getString("id")
            require(type in listOf("note","routine") && rid.isNotEmpty() && rid.length<=120 && ids.add(rid) && text.isNotBlank() && text.length <= if(type=="note")4000 else 240)
        };return records
    }
    private fun deviceSharing(){
        text(tx("Device-to-device · no backend"),24f)
        copy(tx("Select notes or routines, protect a file with a passphrase, then choose Quick Share or another app in the Android share sheet. On the receiving device open CareSphere → My support tools → Device sharing and choose the received file."))
        copy(tx("Use direct local Wi-Fi / hotspot transfer below for iPhone or Android, or use the system share sheet. This is not Bluetooth pairing or live sync. An app you choose may use its own cloud. You cannot remotely revoke copies. Tell the recipient the passphrase separately. Medicines, measurements, photos and backup keys are excluded."))
        button(tx("Select records to send")){
            if(busy)return@button
            stopNearby();render()
            val records=transferableRecords();if(records.isEmpty()){message(tx("Add your own note or routine first. No sample records are supplied."));return@button}
            val checked=BooleanArray(records.size)
            dialog().setTitle(tx("Choose exactly what to share")).setMultiChoiceItems(records.map{"${it.getString("type")}: ${it.getString("text")}"}.toTypedArray(),checked){_,i,value->checked[i]=value}
                .setNegativeButton(tx("Cancel"),null).setPositiveButton(tx("Review selection")){_,_->
                    val chosen=records.filterIndexed{i,_->checked[i]};if(chosen.isEmpty()){message(tx("No records selected."));return@setPositiveButton}
                    confirm("Prepare copies of ${chosen.size} selected records? The recipient can keep or forward them."){
                        form(tx("Transfer passphrase · 12+ characters"),listOf("Passphrase" to ""),true){v->
                            val pass=v[0];require(pass.length>=12);val payload=JSONObject().put("version",1).put("id",UUID.randomUUID().toString()).put("records",JSONArray(chosen));checkTransfer(payload);busy=true
                            Thread {val result=runCatching {
                                val sealed=TransferCrypto.seal(payload.toString().toByteArray(Charsets.UTF_8),pass)
                                JSONObject().put("format","CareSphere Transfer").put("version",1).put("iterations",310000).put("salt",Base64.getEncoder().encodeToString(sealed.salt)).put("iv",Base64.getEncoder().encodeToString(sealed.iv)).put("ciphertext",Base64.getEncoder().encodeToString(sealed.ciphertext)).toString()
                            };runOnUiThread {busy=false;if(!isFinishing&&!isDestroyed)result.onSuccess {raw->runCatching{
                                val dir=java.io.File(cacheDir,"transfers").apply{mkdirs()};dir.listFiles()?.filter{System.currentTimeMillis()-it.lastModified()>86400000}?.forEach{it.delete()}
                                stopNearby();transferFile?.delete();transferFile=java.io.File(dir,UUID.randomUUID().toString()+".caretransfer").apply{writeText(raw)};render();message(tx("Encrypted transfer prepared. Choose Send encrypted file. Nothing leaves automatically."))
                            }.onFailure{message(tx("Could not save the protected transfer. Check device storage."))}}.onFailure{message(tx("Cannot prepare this transfer. Choose up to 100 notes/routines; notes up to 4,000 characters, routine titles up to 240."))} }
                            }.start()
                        }
                    }
                }.showProtected()
        }
        transferFile?.takeIf{it.exists()}?.let { file->
            button(tx("Send encrypted file · Quick Share / apps")){
                val uri=Uri.Builder().scheme("content").authority(packageName+".transfer").appendPath(file.name).build()
                val send=Intent(Intent.ACTION_SEND).setType("application/json").putExtra(Intent.EXTRA_STREAM,uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                send.clipData=ClipData.newRawUri("CareSphere encrypted transfer",uri)
                runCatching{startActivity(Intent.createChooser(send,"Choose nearby sharing or another app"))}.onFailure{message(tx("No file-sharing app is available. Nothing was sent."))}
            }
            button(tx("Clear prepared file")){stopNearby();file.delete();transferFile=null;render()}
        }
        nearbyControls()
        button(tx("Receive: choose a transfer file")){
            stopNearby()
            if(busy)return@button
            form(tx("Unlock a CareSphere transfer"),listOf("Passphrase" to ""),true){v->require(v[0].length>=12);password?.fill('\u0000');password=v[0].toCharArray();receivedTransfer=null
                runCatching{startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE),613)}.onFailure{password?.fill('\u0000');password=null;message(tx("No file picker available."))}
            }
        }
        receivedTransfer?.let { payload->
            text(tx("Preview received copies"),24f);copy(tx("Not verified clinical information. Only the records you select will be added. Existing records are never replaced."))
            val records=checkTransfer(payload);val history=data.list("receivedItems");val imported=(0 until history.length()).map{history.optString(it)}.toSet();val selected=mutableSetOf<String>()
            records.forEach{r->val marker=payload.getString("id")+":"+r.getString("id");page.addView(CheckBox(this).apply{text="${r.getString("type")}: ${r.getString("text")}${if(imported.contains(marker))" · Already imported" else ""}";textSize=18f;setTextColor(ink);isEnabled=!imported.contains(marker);setOnCheckedChangeListener{_,value->if(value)selected.add(r.getString("id"))else selected.remove(r.getString("id"))}})}
            button(tx("Import selected copies")){
                val chosen=records.filter{selected.contains(it.getString("id"))&&!imported.contains(payload.getString("id")+":"+it.getString("id"))}
                if(chosen.isEmpty()){message(tx("Choose records that have not already been imported."));return@button}
                runCatching {
                    val snapshot=JSONObject(data.json.toString());val notes=snapshot.optJSONArray("notes")?:JSONArray();val routines=snapshot.optJSONArray("routines")?:JSONArray()
                    require(notes.length()+chosen.count{it.getString("type")=="note"}<=100 && routines.length()+chosen.count{it.getString("type")=="routine"}<=24)
                    val received=imported.toMutableList()
                    chosen.forEach {r->if(r.getString("type")=="note")notes.put(JSONObject().put("id",UUID.randomUUID()).put("body",r.getString("text")).put("at",java.time.Instant.now().toString()).put("imported",true))else routines.put(JSONObject().put("id",UUID.randomUUID()).put("title",r.getString("text")));received.add(payload.getString("id")+":"+r.getString("id"))}
                    snapshot.put("notes",notes).put("routines",routines).put("receivedItems",JSONArray(received.takeLast(2000)));data.restoreSnapshot(snapshot.toString(),forRecovery=false)
                    val made=runCatching{val sha=receivedSha256!!;val salt=receivedSalt!!;val pass=String(password!!);ImportReceipt.create(payload.getString("id"),sha,chosen.map{it.getString("id")},receivedSource?:"file",salt,pass)}.getOrNull()
                    password?.fill('\u0000');password=null;receivedSalt=null;receivedSha256=null;receivedSource=null;receivedTransfer=null;pendingReceipt=made;render()
                    message(if(made!=null)tx("Imported selected copies. An import receipt is ready below.")else tx("Imported selected copies. Existing records were not replaced."))
                }.onFailure{message(tx("Import could not finish. Check available storage and record capacity (100 notes, 24 routines). Nothing was replaced."))}
            }
            button(tx("Cancel import")){receivedTransfer=null;password?.fill('\u0000');password=null;receivedSalt=null;receivedSha256=null;receivedSource=null;render()}
        }
        pendingReceipt?.let{ receipt->
            text(tx("Import receipt"),24f)
            copy(tx("Records what was imported here, authenticated with the transfer passphrase. Anyone who knows that passphrase can verify it. This is not identity verification, not a delivery guarantee, and not a medical record. Send it back to the person who shared the records if they should know."))
            text(receipt.toString(2),12f)
            button(tx("Save receipt file")){runCatching{startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).setType("application/json").putExtra(Intent.EXTRA_TITLE,"CareSphere-import-receipt.json").addCategory(Intent.CATEGORY_OPENABLE),616)}.onFailure{message(tx("No file picker available."))}}
            button(tx("Share receipt")){runCatching{
                val dir=java.io.File(cacheDir,"transfers").apply{mkdirs()};val file=java.io.File(dir,"CareSphere-import-receipt.json").apply{writeText(receipt.toString(2))}
                val uri=Uri.Builder().scheme("content").authority(packageName+".transfer").appendPath(file.name).build()
                val send=Intent(Intent.ACTION_SEND).setType("application/json").putExtra(Intent.EXTRA_STREAM,uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                send.clipData=ClipData.newRawUri("CareSphere import receipt",uri)
                startActivity(Intent.createChooser(send,"Choose who receives the receipt"))
            }.onFailure{message(tx("No file-sharing app is available. Nothing was sent."))}}
            button(tx("Done")){pendingReceipt=null;render()}
        }
        button(tx("Verify an import receipt")){runCatching{startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE),615)}.onFailure{message(tx("No file picker available."))}}
    }
    private fun stopNearby() {
        nearbyGeneration=UUID.randomUUID();if(::nearbyDiscovery.isInitialized)nearbyDiscovery.stop();nearbyHost?.close();nearbyHost=null;nearbyReceiver?.close();nearbyReceiver=null
        nearbyBusy=false;nearbyOffer=null;nearbyStatus=""
    }
    private fun unlockTransfer(raw:String, pass:String):JSONObject {
        require(raw.toByteArray(Charsets.UTF_8).size<=LocalTransferWire.LIMIT)
        val envelope=JSONObject(raw)
        require(envelope.getString("format")=="CareSphere Transfer"&&envelope.getInt("version")==1&&envelope.getInt("iterations")==310000)
        val salt=Base64.getDecoder().decode(envelope.getString("salt"))
        val encrypted=TransferCrypto.Envelope(salt,Base64.getDecoder().decode(envelope.getString("iv")),Base64.getDecoder().decode(envelope.getString("ciphertext")))
        receivedSalt=salt;receivedSha256=ImportReceipt.fileSha256(raw.toByteArray(Charsets.UTF_8))
        return JSONObject(String(TransferCrypto.open(encrypted,pass),Charsets.UTF_8)).also{checkTransfer(it)}
    }
    private fun nearbyControls() {
        text(tx("Connect nearby · iPhone or Android"),24f)
        copy(tx("Join the same Wi-Fi or join the other phone's hotspot. Internet is not needed. Keep both apps open. Search for the label shown on the sending phone, or enter its address manually. You still need its 8-digit code and encryption passphrase."))
        if(nearbyStatus.isNotEmpty())text(tx(nearbyStatus))
        transferFile?.takeIf{it.exists()}?.let { file ->
            button(tx("Offer to a nearby device")) {
                if(nearbyBusy||busy)return@button
                val addresses=runCatching{LocalTransferWire.addresses()}.getOrDefault(emptyList())
                if(addresses.isEmpty()){message(tx("Join a private Wi-Fi or hotspot, then try again."));return@button}
                if(addresses.size==1)offerNearby(file,addresses[0])
                else dialog().setTitle(tx("Choose the sending network address")).setItems(addresses.toTypedArray()){_,i->offerNearby(file,addresses[i])}.showProtected()
            }.isEnabled=!nearbyBusy&&nearbyOffer==null
        }
        nearbyOffer?.let { info ->
            page.addView(ImageView(this).apply{setImageBitmap(ConnectionQR.image(info.first,info.second));adjustViewBounds=true;maxHeight=dp(280);contentDescription=tx("Connection QR code. The address and code are also written below.")},LinearLayout.LayoutParams(-1,-2))
            copy(tx("QR contains only connection details. Keep this offer open. It does not contain your records or passphrase."))
            text("Device address: ${info.first}");text("Connection code: ${info.second}",24f)
            (page.getChildAt(page.childCount-1) as? TextView)?.contentDescription="Connection code. ${info.second.toCharArray().joinToString(", ")}"
            copy(tx("This offers only the prepared encrypted copy, not confirmation of delivery. It stops after five minutes or when you leave/background this screen. Tell the recipient the code and encryption passphrase privately; they are different."))
        }
        if(nearbyDiscovery.advertisementStatus.isNotEmpty())text(tx(nearbyDiscovery.advertisementStatus))
        button(tx("Find nearby devices")){stopNearby();nearbyDiscovery.start()}.isEnabled=!nearbyBusy&&!busy&&nearbyOffer==null
        if(nearbyDiscovery.scanning)button(tx("Stop searching")){nearbyDiscovery.stopSearch();render()}
        if(nearbyDiscovery.status.isNotEmpty())text(tx(nearbyDiscovery.status))
        nearbyDiscovery.peers.forEach { peer -> button("Choose ${peer.name} · ${peer.address}"){connectNearby(peer.address)} }
        button(tx("Read connection QR from a photo")){runCatching{startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).setType("image/*").addCategory(Intent.CATEGORY_OPENABLE),614)}.onFailure{message(tx("No photo picker available."))}}.isEnabled=!nearbyBusy&&!busy&&nearbyOffer==null
        button(tx("Connect to a nearby device")){connectNearby()}.isEnabled=!nearbyBusy&&!busy
        if(nearbyBusy||nearbyOffer!=null)button(tx("Stop nearby connection")){stopNearby();nearbyStatus="Local connection stopped. Received copies cannot be recalled.";render()}
        copy(tx("If a guest network blocks other devices, try a private hotspot or use the encrypted-file option. A connection failure never imports records."))
    }
    private fun connectNearby(address:String="",code:String="") {
        if(nearbyBusy||busy)return
        nearbyDiscovery.stopSearch();render()
            form(tx("Sender connection details"),listOf("Device address" to address,"8-digit connection code" to code)){fields->
                LocalTransferWire.endpoint(fields[0],fields[1])
                form(tx("Unlock nearby copy"),listOf("Passphrase" to ""),true){secrets->
                    require(secrets[0].length>=12);stopNearby();receivedTransfer=null;receivedSalt=null;receivedSha256=null;receivedSource=null
                    val pass=secrets[0].toCharArray();val generation=nearbyGeneration
                    val receiver=LocalTransferReceiver();nearbyReceiver=receiver;nearbyBusy=true;nearbyStatus="Connecting locally…";render()
                    Thread {
                        val received=runCatching{receiver.receive(fields[0],fields[1])}
                        received.onSuccess{runOnUiThread{if(nearbyGeneration==generation&&foreground){nearbyStatus="Encrypted copy received. Unlocking locally…";render()}}}
                        val result=received.mapCatching { unlockTransfer(String(it,Charsets.UTF_8),String(pass)) }
                        runOnUiThread { if(nearbyGeneration==generation&&foreground&&!isFinishing&&!isDestroyed) {
                            nearbyBusy=false;nearbyReceiver=null
                            result.onSuccess{receivedTransfer=it;receivedSource="nearby";password?.fill('\u0000');password=pass;nearbyStatus="Received and unlocked locally. Review and select copies below. Nothing has been imported."}
                                .onFailure{pass.fill('\u0000');nearbyStatus=if(received.isFailure)"Could not connect. Check the address and code, same Wi-Fi/hotspot, and that the sender's offer is still open. Nothing was imported." else "Received bytes could not be unlocked. Check the passphrase with the sender. Nothing was imported."}
                            render()
                        } else pass.fill('\u0000') }
                    }.start()
                }
            }
    }
    private fun offerNearby(file:java.io.File,address:String) {
        stopNearby();val generation=nearbyGeneration;val host=LocalTransferHost();nearbyHost=host;nearbyBusy=true;nearbyStatus="Starting local offer…";render()
        Thread {
            val result=runCatching{require(file.length()<=LocalTransferWire.LIMIT);host.start(file.readBytes(),address) {
                runOnUiThread { if(nearbyGeneration==generation&&foreground&&!isFinishing&&!isDestroyed) {
                    nearbyDiscovery.stopAdvertisement();nearbyOffer=null;nearbyBusy=false;nearbyStatus="Local offer ended. Start a new offer to try again.";render()
                } }
            }}
            runOnUiThread { if(nearbyGeneration==generation&&foreground&&!isFinishing&&!isDestroyed) {
                nearbyBusy=false;result.onSuccess{nearbyOffer=it;nearbyStatus="Local offer ready.";nearbyDiscovery.advertise(it.first)}.onFailure{host.close();nearbyStatus="Could not offer locally. Check Wi-Fi or hotspot and try again."};render()
            } else host.close() }
        }.start()
    }
    private fun recovery(){
        text(tx("Recently deleted notes · 30 days"),24f)
        val trash=data.list("trash");val alive=(0 until trash.length()).mapNotNull{trash.optJSONObject(it)}.filter{it.optLong("deletedAt")>System.currentTimeMillis()-30L*86400000}
        alive.forEach{n->text(n.optString("body"));button(tx("Restore note")){val notes=data.list("notes");if((0 until notes.length()).none{notes.getJSONObject(it).optString("id")==n.optString("id")}){notes.put(n);data.put("notes",notes)};data.put("trash",JSONArray(alive.filter{it.optString("id")!=n.optString("id")}));render()};button(tx("Erase note permanently")){confirm(tx("Permanently erase this retained note?")){data.put("trash",JSONArray(alive.filter{it.optString("id")!=n.optString("id")}));render()}}}
        text(tx("Encrypted Android backup"),24f);copy(tx("Includes your care records, photos and retained deleted notes. Use a unique passphrase of at least 12 characters; it cannot be recovered. Android backups are not interchangeable with iPhone or web backups."))
        button(tx("Create encrypted backup")){if(busy)return@button;form(tx("Backup passphrase"),listOf("Passphrase" to ""),true){v->require(v[0].length>=12);val pass=v[0].toCharArray();val snapshot=data.json.toString().toByteArray(Charsets.UTF_8);busy=true;Thread{val result=runCatching{BackupCipher.seal(snapshot,pass)};pass.fill('\u0000');runOnUiThread{busy=false;if(!isFinishing && !isDestroyed){result.onSuccess{backupBytes=it;runCatching{startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).setType("application/octet-stream").putExtra(Intent.EXTRA_TITLE,"CareSphere-Android.carebackup").addCategory(Intent.CATEGORY_OPENABLE),611)}.onFailure{message(tx("No file picker available."))}}.onFailure{message(tx("Backup could not be created."))}}}}.start()}}
        button(tx("Choose backup to preview")){if(busy)return@button;form(tx("Unlock Android backup"),listOf("Passphrase" to ""),true){v->require(v[0].length>=12);password=v[0].toCharArray();runCatching{startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE),612)}.onFailure{password?.fill('\u0000');password=null;message(tx("No file picker available."))}}}
    }
    @Deprecated("Platform activity results")
    override fun onActivityResult(requestCode:Int,resultCode:Int,intent:Intent?){
        if(holdUntilUnlocked{onActivityResult(requestCode,resultCode,intent)})return
        super.onActivityResult(requestCode,resultCode,intent)
        val uri=intent?.data
        if(resultCode!=RESULT_OK||uri==null){password?.fill('\u0000');password=null;backupBytes?.fill(0);backupBytes=null;return}
        try{when(requestCode){
            614->{val bytes=contentResolver.openInputStream(uri)!!.use{it.readBytesBounded(10_000_000)};val details=ConnectionQR.read(bytes);connectNearby(details.first,details.second)}
            610->{val bytes=contentResolver.openInputStream(uri)!!.use{it.readBytesBounded(10_000_000)};val bounds=BitmapFactory.Options().apply{inJustDecodeBounds=true};BitmapFactory.decodeByteArray(bytes,0,bytes.size,bounds);require(bounds.outWidth>0&&bounds.outHeight>0);val options=BitmapFactory.Options().apply{inSampleSize=maxOf(1,maxOf(bounds.outWidth,bounds.outHeight)/512)};val bitmap=BitmapFactory.decodeByteArray(bytes,0,bytes.size,options)?:throw IllegalArgumentException();val out=java.io.ByteArrayOutputStream();bitmap.compress(Bitmap.CompressFormat.JPEG,65,out);bitmap.recycle();require(out.size()<180000);form(tx("Photo description"),listOf("Description" to "My photo")){v->require(rows("photos").size<10&&v[0].isNotBlank());update("photos",rows("photos")+JSONObject().put("id",UUID.randomUUID()).put("caption",v[0].take(120)).put("jpeg",Base64.getEncoder().encodeToString(out.toByteArray())))}}
            613->{val pass=password?:return;val bytes=contentResolver.openInputStream(uri)!!.use{it.readBytesBounded(1_000_000)};val raw=String(bytes,Charsets.UTF_8);busy=true
                Thread{val result=runCatching{val envelope=JSONObject(raw);require(envelope.getString("format")=="CareSphere Transfer"&&envelope.getInt("version")==1&&envelope.getInt("iterations")==310000)
                    val salt=Base64.getDecoder().decode(envelope.getString("salt"))
                    val e=TransferCrypto.Envelope(salt,Base64.getDecoder().decode(envelope.getString("iv")),Base64.getDecoder().decode(envelope.getString("ciphertext")))
                    val payload=JSONObject(String(TransferCrypto.open(e,String(pass)),Charsets.UTF_8)).also{checkTransfer(it)}
                    Triple(payload,salt,ImportReceipt.fileSha256(bytes))
                };runOnUiThread{busy=false;if(!isFinishing&&!isDestroyed)result.onSuccess{(payload,salt,sha)->password=pass;receivedSalt=salt;receivedSha256=sha;receivedSource="file";receivedTransfer=payload;section="Device sharing";render();message(tx("Unlocked locally. Nothing is saved until you select records and import."))}.onFailure{pass.fill('\u0000');message(tx("Cannot unlock this CareSphere transfer. Check the passphrase and file. Nothing was imported."))}}}.start()
            }
            611->{val bytes=backupBytes?:return;contentResolver.openOutputStream(uri,"w")!!.use{it.write(bytes)};bytes.fill(0);backupBytes=null;message(tx("Encrypted backup saved. Keep its passphrase separately."))}
            615->{val raw=contentResolver.openInputStream(uri)!!.use{String(it.readBytesBounded(1_000_000),Charsets.UTF_8)}
                verifyReceipt=JSONObject(raw);verifyFile=null
                dialog().setTitle(tx("Verify an import receipt")).setItems(arrayOf(tx("Verify with passphrase"),tx("Also choose the transfer file"))){_,which->
                    if(which==1)runCatching{startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE),618)}.onFailure{message(tx("No file picker available."))}
                    else askReceiptPassphrase()
                }.showProtected()
            }
            616->{val receipt=pendingReceipt?:return;contentResolver.openOutputStream(uri,"w")!!.use{it.write(receipt.toString(2).toByteArray(Charsets.UTF_8))};message(tx("Receipt file saved. Send it to the person who shared the records."))}
            618->{verifyFile=contentResolver.openInputStream(uri)!!.use{it.readBytesBounded(1_000_000)};askReceiptPassphrase()}
            612->{val pass=password?:return;password=null;val bytes=contentResolver.openInputStream(uri)!!.use{it.readBytesBounded(6_100_000)};busy=true;Thread{val result=runCatching{String(BackupCipher.open(bytes,pass),Charsets.UTF_8).also{CareData.validateSnapshot(it)}};pass.fill('\u0000');runOnUiThread{busy=false;if(!isFinishing && !isDestroyed)result.onSuccess{raw->val parsed=JSONObject(raw);confirm("Replace local records with ${parsed.optJSONArray("notes")?.length()?:0} notes and ${parsed.optJSONArray("routines")?.length()?:0} routines? Create a current backup first if needed."){runCatching{data.restoreSnapshot(raw);render();message(tx("Backup restored."))}.onFailure{message(tx("Restore could not finish. Check storage and try again."))}}}.onFailure{message(tx("Could not unlock this Android backup. Check the file and passphrase. Nothing changed."))}}}.start()}
        }}catch(_:Exception){password?.fill('\u0000');password=null;backupBytes?.fill(0);backupBytes=null;message(tx("The file could not be processed. Nothing was imported."))}
    }
    private fun java.io.InputStream.readBytesBounded(limit:Int):ByteArray{val out=java.io.ByteArrayOutputStream();val buffer=ByteArray(8192);while(true){val n=read(buffer);if(n<0)break;require(out.size()+n<=limit);out.write(buffer,0,n)};return out.toByteArray()}
    private fun askReceiptPassphrase(){
        val receipt=verifyReceipt?:return
        form(tx("Transfer passphrase"),listOf("Passphrase" to ""),true){v->
            require(v[0].length>=12);val pass=v[0];val file=verifyFile
            runCatching{if(file!=null)ImportReceipt.verifyAgainstTransfer(receipt,pass,file)else ImportReceipt.verify(receipt,pass)}
                .onSuccess{d->val count=d.getJSONArray("imported").length()
                    val extra=if(d.has("fileMatches"))tx(" Transfer file match: ")+(if(d.getBoolean("fileMatches"))"yes" else "no")+tx(". All imported record IDs present in that file: ")+(if(d.getBoolean("importedPresent"))"yes" else "no")+"." else tx(" File binding not checked without the transfer file.")
                    message(tx("Verified. Import of $count record(s) at ")+d.getString("imported_at")+tx(" (source: ")+d.getString("source")+")."+extra)}
                .onFailure{message(tx("Receipt not verified. Wrong passphrase or a changed receipt. Nothing about this import is confirmed."))}
            verifyReceipt=null;verifyFile=null
        }
    }
}
