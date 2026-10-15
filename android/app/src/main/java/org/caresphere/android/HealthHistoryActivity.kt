package org.caresphere.android

import android.os.Bundle
import android.content.Intent
import android.net.Uri
import android.widget.*
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import kotlinx.coroutines.*
import org.json.JSONObject
import org.json.JSONArray
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.UUID

/** Explicit foreground, read-only history. Health Connect values are not persisted or shared. */
class HealthHistoryActivity:ToolActivity(){
    private val work=CoroutineScope(SupervisorJob()+Dispatchers.Main)
    private var activeRead:Job?=null
    private var connectedRows=listOf<String>()
    private var status="No Health Connect data loaded."
    private lateinit var data:CareData
    private val readPermissions=setOf(HealthPermission.getReadPermission(HeartRateRecord::class),HealthPermission.getReadPermission(OxygenSaturationRecord::class),HealthPermission.getReadPermission(BloodPressureRecord::class))
    private val permissions=registerForActivityResult(PermissionController.createRequestPermissionResultContract()){status=if(it.isEmpty())"No read permissions granted. No readings were loaded." else "Permissions updated. Tap Read recent history.";render()}
    override fun onCreate(state:Bundle?){super.onCreate(state);data=CareData(this);render()}
    override fun onStop(){activeRead?.cancel();connectedRows=emptyList();status="No Health Connect data loaded.";super.onStop()}
    override fun onResume(){super.onResume();if(::data.isInitialized)render()}
    override fun onDestroy(){work.cancel();super.onDestroy()}
    private fun stamp(time:Instant)=DateTimeFormatter.ofLocalizedDateTime(java.time.format.FormatStyle.SHORT).withZone(ZoneId.systemDefault()).format(time)
    private fun render(){
        begin(tx("Health history"))
        text(tx("History, not live monitoring. Source and measurement time are shown. Nothing is invented, interpreted, or sent to an AI service."))
        val sdk=HealthConnectClient.getSdkStatus(this)
        if(sdk==HealthConnectClient.SDK_AVAILABLE){
            button(tx("Choose Health Connect read permissions")){permissions.launch(readPermissions)}
            button(tx("Read recent history")){readRecent()}.isEnabled=activeRead?.isActive!=true
            text(tx("Up to 100 records of each allowed type from the last 7 days. Missing permissions, missing records or unsupported devices never produce substitute readings."))
        }else{
            text(tx("Health Connect is unavailable or needs an update. Manual records below remain available."))
            if(sdk==HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED)button(tx("Open Health Connect in Play Store")){runCatching{startActivity(Intent(Intent.ACTION_VIEW,Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata")))}.onFailure{message(tx("Open the Play Store and search for Health Connect."))}}
        }
        text(tx(status));connectedRows.forEach{text(it)}
        text(tx("Your manually entered records"),23f)
        text(tx("These are self-entered values, not verified sensor readings. They do not change your care plan."))
        data.error?.let{text(tx(it))}
        button(tx("Add blood pressure")){addManual(true)}.isEnabled=data.canWrite&&data.list("manualVitals").length()<100
        button(tx("Add blood oxygen")){addManual(false)}.isEnabled=data.canWrite&&data.list("manualVitals").length()<100
        val records=data.list("manualVitals")
        for(i in records.length()-1 downTo 0){val r=records.getJSONObject(i)
            val value=if(r.getString("kind")=="bp")"${r.getInt("first")}/${r.getInt("second")} mmHg" else "${r.getInt("first")}% SpO₂"
            text(value+" · "+tx("Manually entered")+"\n"+stamp(Instant.parse(r.getString("at"))))
            button(tx("Remove")){android.app.AlertDialog.Builder(this).setMessage(tx("Delete this manually entered record?")).setNegativeButton(tx("Cancel"),null).setPositiveButton(tx("Remove")){_,_->records.remove(i);data.put("manualVitals",records);render()}.showProtected()}
        }
    }
    private fun readRecent(){
        activeRead=work.launch{
            connectedRows=emptyList();status="Reading Health Connect…";render()
            try{
                val client=HealthConnectClient.getOrCreate(this@HealthHistoryActivity)
                val granted=client.permissionController.getGrantedPermissions()
                val range=TimeRangeFilter.between(Instant.now().minusSeconds(7*86400),Instant.now())
                val rows=mutableListOf<Pair<Instant,String>>()
                if(HealthPermission.getReadPermission(HeartRateRecord::class) in granted){
                    val response=client.readRecords(ReadRecordsRequest(HeartRateRecord::class,range,ascendingOrder=false,pageSize=100))
                    response.records.forEach{r->r.samples.maxByOrNull{it.time}?.let{s->rows.add(s.time to "${s.beatsPerMinute} bpm · ${stamp(s.time)}\nHealth Connect · ${r.metadata.dataOrigin.packageName}")}}
                }
                if(HealthPermission.getReadPermission(OxygenSaturationRecord::class) in granted){
                    client.readRecords(ReadRecordsRequest(OxygenSaturationRecord::class,range,ascendingOrder=false,pageSize=100)).records.forEach{r->rows.add(r.time to "${r.percentage.value}% SpO₂ · ${stamp(r.time)}\nHealth Connect · ${r.metadata.dataOrigin.packageName}")}
                }
                if(HealthPermission.getReadPermission(BloodPressureRecord::class) in granted){
                    client.readRecords(ReadRecordsRequest(BloodPressureRecord::class,range,ascendingOrder=false,pageSize=100)).records.forEach{r->rows.add(r.time to "${r.systolic.inMillimetersOfMercury}/${r.diastolic.inMillimetersOfMercury} mmHg · ${stamp(r.time)}\nHealth Connect · ${r.metadata.dataOrigin.packageName}")}
                }
                connectedRows=rows.sortedByDescending{it.first}.map{it.second}
                status=if(rows.isEmpty())"No records returned for the permissions and dates requested." else "History loaded. These are not current measurements."
            }catch(e:CancellationException){throw e}catch(_:Exception){status="Could not read Health Connect. Check permissions and try again. No substitute readings were added."}
            finally{activeRead=null;if(!isFinishing&&!isDestroyed)render()}
        }
    }
    private fun addManual(bp:Boolean){
        val box=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(24,12,24,12)}
        fun field(label:String)=EditText(this).apply{hint=tx(label);contentDescription=tx(label);inputType=android.text.InputType.TYPE_CLASS_NUMBER;filters=arrayOf(android.text.InputFilter.LengthFilter(3));box.addView(this)}
        val first=field(if(bp)"Systolic · mmHg" else "Blood oxygen · percent")
        val second=if(bp)field("Diastolic · mmHg")else null
        val dialog=android.app.AlertDialog.Builder(this).setTitle(tx("Record a measurement taken now")).setView(box).setNegativeButton(tx("Cancel"),null).setPositiveButton(tx("Save"),null).create()
        dialog.setOnShowListener{dialog.getButton(android.app.AlertDialog.BUTTON_POSITIVE).setOnClickListener{
            val a=first.text.toString().toIntOrNull();val b=second?.text?.toString()?.toIntOrNull()
            if(a==null || !VitalRules.valid(if(bp)"bp" else "oxygen",a,b)){first.error=tx("Check the units and values. This is not a medical interpretation.");return@setOnClickListener}
            val row=JSONObject().put("id",UUID.randomUUID().toString()).put("kind",if(bp)"bp" else "oxygen").put("first",a).put("at",Instant.now().toString());b?.let{row.put("second",it)}
            data.put("manualVitals",data.list("manualVitals").put(row));dialog.dismiss();render()
        }};dialog.showProtected()
    }
}
class HealthPermissionsActivity:ToolActivity(){
    override fun onCreate(state:Bundle?){super.onCreate(state);begin(tx("Health Connect privacy"));text(tx("CareSphere requests only read access to heart rate, blood pressure and blood oxygen. You choose each permission. Records are displayed on this screen after you tap Read recent history. They are not saved into CareSphere, exported, sent to an AI service, or read in the background. Revoke access in Health Connect settings. Manually entered records are stored separately in CareSphere's encrypted local storage."))}
}
