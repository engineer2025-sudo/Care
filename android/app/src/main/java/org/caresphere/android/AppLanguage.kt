package org.caresphere.android

import android.content.Context
import org.json.JSONObject
import java.util.Locale

/** Static interface text only. Personal records are deliberately not translated. */
object AppLanguage {
    const val KEY = "CareSphere.interfaceLanguage"
    val options = listOf("auto" to "Use device language","en" to "English","es" to "Español","zh-Hans" to "中文（简体）","fil" to "Filipino / Tagalog","vi" to "Tiếng Việt")
    fun resolve(tags: List<String>):String {
        for(tag in tags) when(val base=tag.lowercase(Locale.ROOT).replace('_','-').substringBefore('-')) {
            "zh" -> return "zh-Hans"
            "tl","fil" -> return "fil"
            "en","es","vi" -> return base
        }
        return "en"
    }
    fun preference(context:Context)=context.getSharedPreferences("interface",Context.MODE_PRIVATE).getString(KEY,"auto")?:"auto"
    fun current(context:Context):String {
        val value=preference(context)
        return if(value!="auto" && options.any{it.first==value})value else resolve((0 until context.resources.configuration.locales.size()).map{context.resources.configuration.locales[it].toLanguageTag()})
    }
    fun set(context:Context,value:String):Boolean { require(options.any{it.first==value});return context.getSharedPreferences("interface",Context.MODE_PRIVATE).edit().putString(KEY,value).commit() }
    private var catalog: JSONObject? = null
    @Synchronized private fun entries(context:Context):JSONObject {
        if(catalog==null)catalog=runCatching { context.assets.open("interface.json").bufferedReader().use{JSONObject(it.readText())} }.getOrDefault(JSONObject())
        return catalog!!
    }
    fun text(context:Context,source:String):String = entries(context).optJSONObject(source)?.optString(current(context),source) ?: source
    fun format(context:Context,source:String,vararg values:Any):String = formatTemplate(text(context,source),values.map{it.toString()})
    fun formatTemplate(template:String, values:List<String>):String = Regex("\\{(\\d+)\\}").replace(template) { match -> match.groupValues[1].toIntOrNull()?.let{values.getOrNull(it)} ?: match.value }
    fun voiceMatches(tag:String,language:String):Boolean {
        val base=tag.lowercase(Locale.ROOT).substringBefore('-')
        return if(language=="fil")base in listOf("fil","tl") else if(language=="zh-Hans")base=="zh" && tag.lowercase(Locale.ROOT).split("-").none{it=="hk"||it=="mo"} else base==language
    }
}
