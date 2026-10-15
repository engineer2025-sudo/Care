package org.caresphere.android
import android.app.AlertDialog
import android.os.Bundle
import android.os.Build
import android.widget.*
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import java.util.UUID

class MedicationActivity:ToolActivity(){
    private lateinit var data:CareData
    override fun onCreate(state:Bundle?){super.onCreate(state);data=CareData(this);render()}
    override fun onResume(){super.onResume();if(::data.isInitialized){data=CareData(this);MedicationReminders.sync(this);render()}}
    override fun onRequestPermissionsResult(requestCode:Int,permissions:Array<out String>,results:IntArray){super.onRequestPermissionsResult(requestCode,permissions,results);render()}
    private fun render(){
        begin(tx("Medication reminders"))
        text(tx("Enter only a schedule confirmed by your care team or medication label. Reminders stay paused until you confirm every name and time."))
        text(tx("Notifications may be delayed by Android or Samsung battery settings. They are not a medication safety system."))
        data.error?.let{text(it)}
        val meds=data.list("medications")
        for(i in 0 until meds.length()){
            val med=meds.getJSONObject(i)
            text(med.getString("name")+" · "+med.getString("time"),22f)
            if(med.optString("instructions").isNotEmpty())text(med.getString("instructions"))
            button(tx(if(med.optString("takenOn")==LocalDate.now().toString())"Undo taken check-in" else "Mark taken today")){
                med.put("takenOn",if(med.optString("takenOn")==LocalDate.now().toString())"" else LocalDate.now().toString())
                data.put("medications",meds);render()
            }.isEnabled=data.canWrite
            button(tx("Edit")){editMedication(med)}.isEnabled=data.canWrite
            button(tx("Remove")){
                AlertDialog.Builder(this).setMessage(tx("Remove this reminder? This does not change your prescription.")).setNegativeButton(tx("Cancel"),null).setPositiveButton(tx("Remove")){_,_->
                    MedicationReminders.pause(this);data.json.put("medicationConfirmed",false)
                    data.put("medications",JSONArray((0 until meds.length()).filter{it!=i}.map{meds.getJSONObject(it)}));render()
                }.show()
            }.isEnabled=data.canWrite
        }
        button(tx("Add medication")){editMedication(null)}.isEnabled=data.canWrite&&meds.length()<24
        text(tx(if(MedicationReminders.enabled(this)&&data.json.optBoolean("medicationConfirmed")&&MedicationReminders.permitted(this))"Reminders enabled · delivery can be delayed" else "Reminders paused"))
        button(tx("I reviewed the schedule · enable reminders")){
            if(Build.VERSION.SDK_INT>=33&&checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=android.content.pm.PackageManager.PERMISSION_GRANTED){requestPermissions(arrayOf("android.permission.POST_NOTIFICATIONS"),71);return@button}
            if(!MedicationReminders.permitted(this)){message(tx("Allow CareSphere notifications in Android Settings, then review the schedule again."));return@button}
            AlertDialog.Builder(this).setMessage(tx("I checked every name and reminder time against the medication label or care-team instructions.")).setNegativeButton(tx("Cancel"),null).setPositiveButton(tx("Confirm")){_,_->
                data.put("medicationConfirmed",true)
                if(data.error==null){if(!MedicationReminders.enable(this))message(tx("Reminders could not be enabled."))}
                render()
            }.show()
        }.isEnabled=data.canWrite&&meds.length()>0
        button(tx("Pause reminders")){MedicationReminders.pause(this);render()}
        text(tx("A taken check-in is your self-report, not proof that a medicine was taken."))
    }
    private fun editMedication(original:JSONObject?){
        val box=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(24,12,24,12)}
        fun field(label:String,value:String,max:Int)=EditText(this).apply{hint=tx(label);contentDescription=tx(label);setText(value);filters=arrayOf(android.text.InputFilter.LengthFilter(max));box.addView(this)}
        val name=field("Medication name",original?.optString("name")?:"",80)
        val time=field("Time · HH:mm",original?.optString("time")?:"",5).apply{setSingleLine(true);inputType=android.text.InputType.TYPE_CLASS_DATETIME or android.text.InputType.TYPE_DATETIME_VARIATION_TIME}
        val instructions=field("Your confirmed instructions (optional)",original?.optString("instructions")?:"",240)
        val scroll=ScrollView(this);scroll.addView(box)
        val dialog=AlertDialog.Builder(this).setTitle(tx("Medication reminders")).setView(scroll).setNegativeButton(tx("Cancel"),null).setPositiveButton(tx("Save"),null).create()
        dialog.setOnShowListener{dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener{
            if(name.text.isBlank()){name.error=tx("Medication name");return@setOnClickListener}
            if(!MedicationRules.validTime(time.text.toString())){time.error=tx("Use 24-hour time, for example 09:30.");return@setOnClickListener}
            if(!MedicationReminders.pause(this)){message(tx("Changes could not be saved."));return@setOnClickListener}
            val value=JSONObject().put("id",original?.getString("id")?:UUID.randomUUID().toString()).put("name",name.text.toString().trim()).put("time",time.text.toString()).put("instructions",instructions.text.toString()).put("takenOn","")
            val meds=data.list("medications");val rows=(0 until meds.length()).map{meds.getJSONObject(it)}.toMutableList()
            val index=rows.indexOfFirst{it.optString("id")==value.getString("id")};if(index<0)rows.add(value)else rows[index]=value
            data.json.put("medicationConfirmed",false);data.put("medications",JSONArray(rows))
            if(data.error==null){dialog.dismiss();render()}else message(data.error!!)
        }};dialog.show()
    }
}
