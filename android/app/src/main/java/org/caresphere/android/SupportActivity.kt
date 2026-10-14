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
class SupportActivity : Activity() {
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
    private var tts: TextToSpeech? = null
    private var pendingSpeech: String? = null
    private var backupBytes: ByteArray? = null
    private var password: CharArray? = null
    private var busy = false
    private var pairs = false
    private val revealed = mutableListOf<Int>()
    private val matched = mutableSetOf<Int>()
    private val tools: JSONObject get() = data.json.optJSONObject("tools") ?: JSONObject()
    private val dark: Boolean get() = data.json.optString("appearance", "system").let { it == "dark" || it == "system" && resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES }
    private val ink get() = if(dark) Color.rgb(237,244,237) else Color.rgb(28,46,36)
    private val bg get() = if(dark) Color.rgb(20,29,23) else Color.rgb(246,248,244)
    private val soft get() = if(dark) Color.rgb(45,62,49) else Color.rgb(233,240,232)
    private val sections = listOf("Start here", "Visual routines", "Communication", "My photos", "My people", "Comfort", "Appointments", "Recovery & backup", "Interest activities", "Cross-device sharing")
    private val phrases = listOf("I need a break", "It is too loud", "Please explain again", "Yes", "No", "I would like help")
    private val packs = mapOf("Nature" to listOf("What do you notice outside?", "Would you choose a garden, beach or forest?", "Point to something that grows."), "Music" to listOf("What sounds do you enjoy?", "Would you like music or quiet?", "Tell a story about a song, or skip."), "Familiar objects" to listOf("What makes a place comfortable?", "Which object do you like nearby?", "Describe a familiar everyday task."))
    private fun dp(v:Int) = (resources.displayMetrics.density*v).toInt()
    private fun rows(key:String) = (tools.optJSONArray(key) ?: JSONArray()).let { a -> (0 until a.length()).mapNotNull { a.optJSONObject(it) } }
    private fun save(key:String, value:Any) { val copy=tools;copy.put(key,value);data.put("tools",copy) }
    private fun update(key:String, values:List<JSONObject>) { save(key,JSONArray(values)); render() }
    private fun dialog()=AlertDialog.Builder(ContextThemeWrapper(this, if(dark) android.R.style.Theme_Material_Dialog_Alert else android.R.style.Theme_Material_Light_Dialog_Alert))
    private fun text(value:String,size:Float=18f) { page.addView(TextView(this).apply { text=value;textSize=size;setTextColor(ink);setPadding(0,dp(10),0,dp(10));setTextIsSelectable(true) }) }
    private fun button(label:String, action:()->Unit):Button = Button(this).apply { text=label;isAllCaps=false;textSize=18f;minHeight=dp(52);setTextColor(ink);background=GradientDrawable().apply{setColor(soft);cornerRadius=dp(14).toFloat()};page.addView(this,LinearLayout.LayoutParams(-1,-2).apply{topMargin=dp(6);bottomMargin=dp(6)});setOnClickListener{action()} }
    private fun message(value:String) { if(!isFinishing)dialog().setMessage(value).setPositiveButton("OK",null).show() }
    private fun confirm(body:String,action:()->Unit) { dialog().setMessage(body).setNegativeButton("Cancel",null).setPositiveButton("Continue"){_,_->action()}.show() }
    private fun form(title:String, labels:List<Pair<String,String>>, passwordField:Boolean=false, action:(List<String>)->Unit) {
        val box=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(dp(20),0,dp(20),0)}
        val fields=labels.map{(label,value)->EditText(ContextThemeWrapper(this,if(dark)android.R.style.Theme_Material else android.R.style.Theme_Material_Light)).apply{hint=label;contentDescription=label;setText(value);minLines=1;maxLines=6;filters=arrayOf(android.text.InputFilter.LengthFilter(if(passwordField)1024 else 4000));if(passwordField)inputType=android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD;box.addView(this)}}
        val scroll=ScrollView(this);scroll.addView(box)
        val d=dialog().setTitle(title).setView(scroll).setNegativeButton("Cancel",null).setPositiveButton("Continue",null).create()
        d.setOnShowListener{d.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener{try{action(fields.map{it.text.toString()});d.dismiss()}catch(_:IllegalArgumentException){fields.first().error="Check the fields. Enter a title/text and valid details."}}};d.show()
    }
    override fun onCreate(state:Bundle?) {super.onCreate(state);data=CareData(this);section=state?.getString("section")?:"Start here";render()}
    override fun onSaveInstanceState(out:Bundle){super.onSaveInstanceState(out);out.putString("section",section)}
    override fun onStop(){super.onStop();tts?.stop();pendingSpeech=null;paused=true}
    override fun onDestroy(){tts?.shutdown();password?.fill('\u0000');backupBytes?.fill(0);super.onDestroy()}
    private fun say(value:String){
        pendingSpeech=value
        if(tts==null){tts=TextToSpeech(this){status->if(status==TextToSpeech.SUCCESS){val voice=tts?.voices?.firstOrNull{!it.isNetworkConnectionRequired && it.locale.language==java.util.Locale.getDefault().language};if(voice!=null){tts?.voice=voice;pendingSpeech?.let{say(it)}}else message("No matching installed offline voice. The phrase stays visible.")}else message("Speech is unavailable. The phrase stays visible.")};return}
        tts?.speak(value,TextToSpeech.QUEUE_FLUSH,null,UUID.randomUUID().toString());pendingSpeech=null
    }
    private fun render(){
        val scroll=ScrollView(this);page=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(dp(20),dp(16),dp(20),dp(28));setBackgroundColor(bg)};scroll.addView(page);setContentView(scroll)
        scroll.setOnApplyWindowInsetsListener{v,insets->if(android.os.Build.VERSION.SDK_INT>=30){val bars=insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.ime());v.setPadding(bars.left,bars.top,bars.right,bars.bottom)};insets};scroll.requestApplyInsets()
        text("My support tools",28f);button("Back to CareSphere"){finish()};button("Choose a tool · $section"){dialog().setItems(sections.toTypedArray()){_,i->tts?.stop();section=sections[i];phrase="";planId=null;render()}.show()}
        data.error?.let{text(it)}
        when(section){
            "Start here"->{text("Try activities without a profile. Add only the tools you want. Permissions are requested when needed.");button("Choose comfort settings"){section="Comfort";render()};button("Make a visual routine"){section="Visual routines";render()};button("Finish introduction"){save("introduced",true);message("These tools stay available from Today.")}}
            "Visual routines"->plans()
            "Communication"->communication()
            "My photos"->photos()
            "My people"->people()
            "Comfort"->comfort()
            "Appointments"->questions()
            "Recovery & backup"->recovery()
            "Interest activities"->{button("Interest · $pack"){dialog().setItems(packs.keys.toTypedArray()){_,i->pack=packs.keys.elementAt(i);promptIndex=0;render()}.show()};text(packs.getValue(pack)[promptIndex%3],24f);button("Next / skip"){promptIndex++;render()};text("Speak, point, listen or skip. Answers are not recorded. These are leisure prompts, not treatment.")}
            else->text("The web app offers encrypted read-only invitations, 24-hour expiry and revocation when its separate HTTPS sharing service is configured. This native app is not connected and does not synchronize records. Use the deliberate share sheet for now. No automatic caregiver alerts or fake accounts.")
        }
    }
    private fun comfort(){
        listOf("simple" to "Simple Mode — three destinations", "speakSteps" to "Speak steps after I start or advance").forEach{(key,label)->page.addView(CheckBox(this).apply{text=label;textSize=18f;setTextColor(ink);isChecked=tools.optBoolean(key);setOnCheckedChangeListener{_,value->save(key,value)}})}
        button("Photo pairs · ${tools.optInt("choices",3)} choices"){dialog().setItems(arrayOf("2","3","4")){_,i->save("choices",i+2);render()}.show()}
        text("Turn Simple Mode off here to restore Care and Health. Text follows Android font settings. Sound never starts automatically; installed offline voices are used for speech when available.")
        button("Android accessibility settings"){runCatching{startActivity(Intent(android.provider.Settings.ACTION_ACCESSIBILITY_SETTINGS))}.onFailure{message("Open Accessibility in device Settings.")}}
    }
    private fun communication(){
        text("A supplement to your existing communication system. Tap to display, then choose Speak.")
        if(phrase.isNotEmpty()){text(phrase,30f);button("Speak this phrase"){say(phrase)};button("Clear / stop"){tts?.stop();phrase="";render()}}
        (phrases+rows("phrases").map{it.optString("text")}).forEach{value->button(value){tts?.stop();phrase=value;render()}}
        button("Add my own phrase"){form("My phrase",listOf("Phrase" to "")){values->require(values[0].isNotBlank());require(rows("phrases").size<24);update("phrases",rows("phrases")+JSONObject().put("text",values[0].trim().take(240)))}}
        if(rows("phrases").isNotEmpty())button("Remove a custom phrase"){val values=rows("phrases");dialog().setItems(values.map{it.optString("text")}.toTypedArray()){_,i->update("phrases",values.filterIndexed{j,_->j!=i})}.show()}
    }
    private fun plans(){
        val current=rows("plans").firstOrNull{it.optString("id")==planId}
        if(current!=null){val steps=current.getJSONArray("steps");step=step.coerceIn(0,steps.length()-1);text(current.optString("title"),24f);text("Step ${step+1} of ${steps.length()}")
            if(paused){text("Take your time.");button("Continue"){paused=false;render()}}else{
                text(steps.getString(step),26f);rows("photos").firstOrNull{it.optString("id")==current.optString("photo") }?.let{image(it)}
                button("Read this step"){say(steps.getString(step))};button("Take a break"){tts?.stop();paused=true;render()}
                listOf("Done / next","Skip").forEach{label->button(label){tts?.stop();if(step+1<steps.length()){step++;if(tools.optBoolean("speakSteps"))say(steps.getString(step))}else{planId=null;message("Routine ended. No score or completion record saved.")};render()}}
            };button("End routine"){tts?.stop();planId=null;render()};return
        }
        text("Your instructions, one step per line. Do not change prescribed medication instructions here.")
        button("Create visual routine"){form("Visual routine",listOf("Title" to "","Steps, one per line" to "")){values->val steps=values[1].lines().map{it.trim().take(240)}.filter{it.isNotEmpty()}.take(40);require(values[0].isNotBlank()&&steps.isNotEmpty()&&rows("plans").size<30);update("plans",rows("plans")+JSONObject().put("id",UUID.randomUUID()).put("title",values[0].take(120)).put("steps",JSONArray(steps)))}}
        rows("plans").forEach{p->text(p.optString("title"),22f);button("Start ${p.optString("title")}"){planId=p.getString("id");step=0;paused=false;if(tools.optBoolean("speakSteps"))say(p.getJSONArray("steps").getString(0));render()};button("Choose routine photo"){val photos=rows("photos");dialog().setItems((listOf("No photo")+photos.map{it.optString("caption")}).toTypedArray()){_,i->p.put("photo",if(i==0)"" else photos[i-1].optString("id"));update("plans",rows("plans").map{if(it.optString("id")==p.optString("id"))p else it})}.show()};button("Delete routine"){confirm("Delete this visual routine? This cannot be undone."){update("plans",rows("plans").filter{it.optString("id")!=p.optString("id")})}}}
    }
    private fun people(){
        text("Ask permission before saving someone's details. Nothing is sent automatically.")
        button("Add trusted contact"){form("Contact",listOf("Name" to "","Phone (optional)" to "","HTTPS video link (optional)" to "")){v->val phone=v[1].filter{"+0123456789() .-".contains(it)}.take(32);val url=Uri.parse(v[2]);val video=if(url.scheme=="https"&&!url.host.isNullOrBlank()&&url.userInfo==null)v[2]else"";require(v[0].isNotBlank()&&(phone.isNotEmpty()||video.isNotEmpty())&&rows("contacts").size<20);update("contacts",rows("contacts")+JSONObject().put("id",UUID.randomUUID()).put("name",v[0].take(80)).put("phone",phone).put("video",video))}}
        rows("contacts").forEach{c->text(c.optString("name"),24f);val phone=c.optString("phone").filter{"+0123456789".contains(it)};if(phone.isNotEmpty()){button("Call ${c.optString("name")}"){open("tel:$phone",Intent.ACTION_DIAL)};button("Message ${c.optString("name")}"){open("sms:$phone",Intent.ACTION_SENDTO)}};val video=c.optString("video");if(Uri.parse(video).scheme=="https")button("Open video"){open(video)};button("Remove contact"){confirm("Remove this saved contact?"){update("contacts",rows("contacts").filter{it.optString("id")!=c.optString("id")})}}}
    }
    private fun open(value:String,action:String=Intent.ACTION_VIEW){confirm("Open another app? Review the recipient there; the provider's privacy terms apply."){runCatching{startActivity(Intent(action,Uri.parse(value)))}.onFailure{message("No compatible app is installed. Nothing was sent.")}}}
    private fun questions(){
        button("Add appointment question"){form("Question",listOf("What would you like to ask?" to "")){v->require(v[0].isNotBlank()&&rows("questions").size<100);update("questions",rows("questions")+JSONObject().put("id",UUID.randomUUID()).put("text",v[0].take(1000)))}}
        rows("questions").forEach{q->text(q.optString("text"),22f);listOf("important" to "Important","discussed" to "Discussed").forEach{(key,label)->page.addView(CheckBox(this).apply{text=label;textSize=18f;setTextColor(ink);isChecked=q.optBoolean(key);setOnCheckedChangeListener{_,value->q.put(key,value);save("questions",JSONArray(rows("questions").map{if(it.optString("id")==q.optString("id"))q else it}))}})};text("Follow-up: ${q.optString("followup","None entered")}");button("Edit follow-up"){form("Follow-up",listOf("Follow-up" to q.optString("followup"))){v->q.put("followup",v[0].take(2000));update("questions",rows("questions").map{if(it.optString("id")==q.optString("id"))q else it})}};button("Delete question"){confirm("Delete this question and follow-up?"){update("questions",rows("questions").filter{it.optString("id")!=q.optString("id")})}}}
        button("Review & share questions"){val value=rows("questions").sortedByDescending{it.optBoolean("important")}.joinToString("\n\n"){"${if(it.optBoolean("important"))"IMPORTANT: " else ""}${it.optString("text")}\nFollow-up: ${it.optString("followup")}"};confirm("Share these questions? Exported text is not encrypted by CareSphere.\n\n$value"){runCatching{startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT,value),"Choose recipient"))}.onFailure{message("No sharing app available.")}}}
    }
    private fun image(photo:JSONObject){runCatching{val bytes=Base64.getDecoder().decode(photo.optString("jpeg"));if(bytes.size>180000)return;val bitmap=BitmapFactory.decodeByteArray(bytes,0,bytes.size)?:return;page.addView(ImageView(this).apply{setImageBitmap(bitmap);adjustViewBounds=true;maxHeight=dp(300);contentDescription=photo.optString("caption")},LinearLayout.LayoutParams(-1,-2))}}
    private fun photos(){
        text("Up to 10 personal photos, resized and encrypted locally. No recognition or identity quizzes.")
        button("Choose a photo"){if(rows("photos").size>=10){message("Remove a photo before adding another.");return@button};runCatching{startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).setType("image/*").addCategory(Intent.CATEGORY_OPENABLE),610)}.onFailure{message("No photo picker available.")}}
        val photos=rows("photos");if(photos.isEmpty())return
        button(if(pairs)"Conversation view" else "Photo matching"){pairs=!pairs;revealed.clear();matched.clear();render()}
        if(pairs){val chosen=photos.take(tools.optInt("choices",3).coerceIn(2,4));text("Reveal two cards. Clear a mismatch yourself. No timer or score.");(0 until chosen.size*2).forEach{i->if(revealed.contains(i)||matched.contains(i))image(chosen[i%chosen.size]);button("Photo card ${i+1}${if(matched.contains(i))" · matched" else ""}"){if(revealed.size<2&&!revealed.contains(i)&&!matched.contains(i)){revealed.add(i);if(revealed.size==2&&revealed[0]%chosen.size==revealed[1]%chosen.size){matched.addAll(revealed);revealed.clear()};render()}}};button("Clear selection"){revealed.clear();render()};button("Start again"){revealed.clear();matched.clear();render()}}
        else{val photo=photos[photoIndex%photos.size];image(photo);text(photo.optString("caption"));text("What do you notice? Speak, point, listen or skip.");button("Next photo"){photoIndex++;render()};button("Remove displayed photo"){confirm("Remove this photo? Routine references will show text only."){update("photos",photos.filter{it.optString("id")!=photo.optString("id")})}}}
    }
    private fun recovery(){
        text("Recently deleted notes · 30 days",24f)
        val trash=data.list("trash");val alive=(0 until trash.length()).mapNotNull{trash.optJSONObject(it)}.filter{it.optLong("deletedAt")>System.currentTimeMillis()-30L*86400000}
        alive.forEach{n->text(n.optString("body"));button("Restore note"){val notes=data.list("notes");if((0 until notes.length()).none{notes.getJSONObject(it).optString("id")==n.optString("id")}){notes.put(n);data.put("notes",notes)};data.put("trash",JSONArray(alive.filter{it.optString("id")!=n.optString("id")}));render()};button("Erase note permanently"){confirm("Permanently erase this retained note?"){data.put("trash",JSONArray(alive.filter{it.optString("id")!=n.optString("id")}));render()}}}
        text("Encrypted Android backup",24f);text("Includes your care records, photos and retained deleted notes. Use a unique passphrase of at least 12 characters; it cannot be recovered. Android backups are not interchangeable with iPhone or web backups.")
        button("Create encrypted backup"){if(busy)return@button;form("Backup passphrase",listOf("Passphrase" to ""),true){v->require(v[0].length>=12);val pass=v[0].toCharArray();val snapshot=data.json.toString().toByteArray(Charsets.UTF_8);busy=true;Thread{val result=runCatching{BackupCipher.seal(snapshot,pass)};pass.fill('\u0000');runOnUiThread{busy=false;if(!isFinishing){result.onSuccess{backupBytes=it;runCatching{startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).setType("application/octet-stream").putExtra(Intent.EXTRA_TITLE,"CareSphere-Android.carebackup").addCategory(Intent.CATEGORY_OPENABLE),611)}.onFailure{message("No file picker available.")}}.onFailure{message("Backup could not be created.")}}}}.start()}}
        button("Choose backup to preview"){if(busy)return@button;form("Unlock Android backup",listOf("Passphrase" to ""),true){v->require(v[0].length>=12);password=v[0].toCharArray();runCatching{startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE),612)}.onFailure{password?.fill('\u0000');password=null;message("No file picker available.")}}}
    }
    @Deprecated("Platform activity results")
    override fun onActivityResult(requestCode:Int,resultCode:Int,intent:Intent?){
        super.onActivityResult(requestCode,resultCode,intent)
        val uri=intent?.data
        if(resultCode!=RESULT_OK||uri==null){password?.fill('\u0000');password=null;backupBytes?.fill(0);backupBytes=null;return}
        try{when(requestCode){
            610->{val bytes=contentResolver.openInputStream(uri)!!.use{it.readBytesBounded(10_000_000)};val bounds=BitmapFactory.Options().apply{inJustDecodeBounds=true};BitmapFactory.decodeByteArray(bytes,0,bytes.size,bounds);require(bounds.outWidth>0&&bounds.outHeight>0);val options=BitmapFactory.Options().apply{inSampleSize=maxOf(1,maxOf(bounds.outWidth,bounds.outHeight)/512)};val bitmap=BitmapFactory.decodeByteArray(bytes,0,bytes.size,options)?:throw IllegalArgumentException();val out=java.io.ByteArrayOutputStream();bitmap.compress(Bitmap.CompressFormat.JPEG,65,out);bitmap.recycle();require(out.size()<180000);form("Photo description",listOf("Description" to "My photo")){v->require(rows("photos").size<10&&v[0].isNotBlank());update("photos",rows("photos")+JSONObject().put("id",UUID.randomUUID()).put("caption",v[0].take(120)).put("jpeg",Base64.getEncoder().encodeToString(out.toByteArray())))}}
            611->{val bytes=backupBytes?:return;contentResolver.openOutputStream(uri,"w")!!.use{it.write(bytes)};bytes.fill(0);backupBytes=null;message("Encrypted backup saved. Keep its passphrase separately.")}
            612->{val pass=password?:return;password=null;val bytes=contentResolver.openInputStream(uri)!!.use{it.readBytesBounded(6_100_000)};busy=true;Thread{val result=runCatching{String(BackupCipher.open(bytes,pass),Charsets.UTF_8).also{CareData.validateSnapshot(it)}};pass.fill('\u0000');runOnUiThread{busy=false;if(!isFinishing)result.onSuccess{raw->val parsed=JSONObject(raw);confirm("Replace local records with ${parsed.optJSONArray("notes")?.length()?:0} notes and ${parsed.optJSONArray("routines")?.length()?:0} routines? Create a current backup first if needed."){runCatching{data.restoreSnapshot(raw);render();message("Backup restored.")}.onFailure{message("Restore could not finish. Check storage and try again.")}}}.onFailure{message("Could not unlock this Android backup. Check the file and passphrase. Nothing changed.")}}}.start()}
        }}catch(_:Exception){password?.fill('\u0000');password=null;backupBytes?.fill(0);backupBytes=null;message("The file could not be processed. Nothing was imported.")}
    }
    private fun java.io.InputStream.readBytesBounded(limit:Int):ByteArray{val out=java.io.ByteArrayOutputStream();val buffer=ByteArray(8192);while(true){val n=read(buffer);if(n<0)break;require(out.size()+n<=limit);out.write(buffer,0,n)};return out.toByteArray()}
}
