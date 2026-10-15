package org.caresphere.android
import android.app.*
import android.content.*
import android.os.Bundle
import android.graphics.Color
import android.widget.*

open class ToolActivity:androidx.activity.ComponentActivity(){
    protected lateinit var page:LinearLayout
    protected fun tx(s:String)=AppLanguage.text(this,s)
    protected fun begin(title:String){
        val scroll=ScrollView(this)
        page=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(24,24,24,32);setBackgroundColor(Color.rgb(246,248,244))}
        scroll.addView(page);setContentView(scroll)
        scroll.setOnApplyWindowInsetsListener{v,i->
            if(android.os.Build.VERSION.SDK_INT>=30){val bars=i.getInsets(android.view.WindowInsets.Type.systemBars() or android.view.WindowInsets.Type.ime());v.setPadding(bars.left,bars.top,bars.right,bars.bottom)};i
        };scroll.requestApplyInsets()
        text(title,27f);button(tx("Back")){finish()}
    }
    protected fun text(s:String,size:Float=18f):TextView=TextView(this).apply{text=s;textSize=size;setTextColor(Color.rgb(28,46,36));setPadding(0,12,0,12);setTextIsSelectable(true);page.addView(this)}
    protected fun button(s:String,action:()->Unit):Button=Button(this).apply{text=s;isAllCaps=false;minHeight=(52*resources.displayMetrics.density).toInt();page.addView(this,LinearLayout.LayoutParams(-1,-2));setOnClickListener{action()}}
    protected fun message(s:String){if(!isFinishing&&!isDestroyed)AlertDialog.Builder(this).setMessage(s).setPositiveButton(tx("OK"),null).show()}
}
