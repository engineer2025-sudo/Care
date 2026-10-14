package org.caresphere.android

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.KeyStore
import java.time.LocalDate
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** No starter people, medication, notes, moods, or measurements. */
class CareData(private val context: Context) {
    var json = JSONObject()
        private set
    var error: String? = null
        private set
    private var writable = true
    private val file get() = AtomicFile(File(context.filesDir, "care.enc"))
    private val alias = "caresphere.local.v1"

    init {
        if (file.baseFile.exists() || File(file.baseFile.path + ".bak").exists()) {
            try {
                val bytes = file.readFully()
                require(bytes.size > 28)
                val cipher = Cipher.getInstance("AES/GCM/NoPadding")
                cipher.init(Cipher.DECRYPT_MODE, key(false), GCMParameterSpec(128, bytes.copyOfRange(0, 12)))
                json = JSONObject(String(cipher.doFinal(bytes.copyOfRange(12, bytes.size)), Charsets.UTF_8))
            } catch (_: Exception) {
                writable = false
                error = "Saved data could not be unlocked. It has not been overwritten. You can retry after restarting or explicitly erase it in Settings."
            }
        }
        refreshDay()
    }
    private fun key(create: Boolean): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getKey(alias, null) as? SecretKey)?.let { return it }
        check(create) { "Encryption key missing" }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setKeySize(256).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
        }.generateKey()
    }
    fun favorites(): List<String> {
        val array = list("favorites")
        return LibraryPreferences.normalized((0 until array.length()).map { array.optString(it) })
    }
    fun toggleFavorite(id: String) { put("favorites", JSONArray(LibraryPreferences.toggle(id, favorites()))) }
    fun list(name: String): JSONArray = json.optJSONArray(name) ?: JSONArray()
    fun put(name: String, value: Any) { json.put(name, value); save() }
    fun refreshDay() {
        val today = LocalDate.now().toString()
        if (json.optString("day") != today && writable) {
            json.put("day", today).put("done", JSONArray()).remove("mood")
            save()
        }
    }
    fun save() {
        if (!writable) return
        try {
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, key(true))
            val bytes = cipher.iv + cipher.doFinal(json.toString().toByteArray(Charsets.UTF_8))
            val output = file.startWrite()
            try { output.write(bytes); file.finishWrite(output) }
            catch (e: Exception) { file.failWrite(output); throw e }
            error = null
        } catch (_: Exception) { error = "Changes could not be saved securely. Keep the app open and free device storage before retrying." }
    }
    companion object {
        fun validateSnapshot(raw: String) {
            require(raw.toByteArray(Charsets.UTF_8).size <= 6_000_000)
            val value = JSONObject(raw)
            for ((name, limit) in listOf("notes" to 100, "routines" to 24, "trash" to 100)) {
                val array = value.optJSONArray(name) ?: JSONArray()
                require(array.length() <= limit)
                for (i in 0 until array.length()) {
                    val item = array.getJSONObject(i)
                    require(item.getString("id").length <= 120)
                    if (name == "routines") require(item.getString("title").length <= 240)
                    else { require(item.getString("body").length <= 4000); require(item.getString("at").length <= 100) }
                }
            }
            val tools = value.optJSONObject("tools") ?: JSONObject()
            for ((name, limit) in listOf("photos" to 10, "plans" to 30, "contacts" to 20, "questions" to 100, "phrases" to 24)) {
                val array = tools.optJSONArray(name) ?: JSONArray(); require(array.length() <= limit)
                for (i in 0 until array.length()) { val item = array.getJSONObject(i)
                    if(name == "photos") require(item.getString("jpeg").length <= 240000)
                    if(name == "plans") { val steps = item.getJSONArray("steps"); require(steps.length() in 1..40); for(j in 0 until steps.length()) require(steps.getString(j).length <= 240) }
                }
            }
        }
    }
    fun restoreSnapshot(raw: String) {
        check(writable); validateSnapshot(raw)
        val previous = json
        json = JSONObject(raw); save()
        if(error != null) { json = previous; throw IllegalStateException("Secure save failed") }
        refreshDay()
    }
    fun erase() {
        try {
            file.delete()
            check(!file.baseFile.exists())
            KeyStore.getInstance("AndroidKeyStore").apply { load(null); deleteEntry(alias) }
            json = JSONObject(); writable = true; error = null
            refreshDay()
        } catch (_: Exception) { error = "Not all local data could be erased. Try again in Settings." }
    }
    val canWrite get() = writable
}
