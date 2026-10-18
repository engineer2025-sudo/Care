package org.caresphere.android
import android.app.*
import android.content.*
import android.os.Bundle
import android.graphics.Color
import android.widget.*

open class ToolActivity:ProtectedActivity(){
    protected lateinit var page:LinearLayout
    protected var dark=false
    protected val ink get()=if(dark)Color.rgb(237,244,237)else Color.rgb(28,46,36)
    protected fun dp(n:Int)=(n*resources.displayMetrics.density).toInt()
    protected fun tx(s:String)=AppLanguage.text(this,s)
    protected fun begin(title:String){
        val preference=CareData(this,false).json.optString("appearance","system")
        dark=preference=="dark" || preference=="system" && resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK == android.content.res.Configuration.UI_MODE_NIGHT_YES
        val scroll=ScrollView(this)
        page=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(dp(24),dp(24),dp(24),dp(32));setBackgroundColor(if(dark)Color.rgb(20,29,23)else Color.rgb(246,248,244))}
        scroll.addView(page);setContentView(scroll)
        scroll.setOnApplyWindowInsetsListener{v,i->
            if(android.os.Build.VERSION.SDK_INT>=30){val bars=i.getInsets(android.view.WindowInsets.Type.systemBars() or android.view.WindowInsets.Type.ime());v.setPadding(bars.left,bars.top,bars.right,bars.bottom)};i
        };scroll.requestApplyInsets()
        text(title,27f);button(tx("Back")){finish()}
    }
    protected fun text(s:String,size:Float=18f):TextView=TextView(this).apply{text=s;textSize=size;setTextColor(ink);setPadding(0,dp(12),0,dp(12));setTextIsSelectable(true);page.addView(this)}
    protected fun button(s:String,action:()->Unit):Button=Button(this).apply{text=s;isAllCaps=false;setTextColor(ink);backgroundTintList=android.content.res.ColorStateList.valueOf(if(dark)Color.rgb(45,62,49)else Color.rgb(233,240,232));minHeight=(52*resources.displayMetrics.density).toInt();page.addView(this,LinearLayout.LayoutParams(-1,-2));setOnClickListener{action()}}
    protected fun message(s:String){if(!isFinishing&&!isDestroyed)AlertDialog.Builder(this).setMessage(s).setPositiveButton(tx("OK"),null).showProtected()}
}
