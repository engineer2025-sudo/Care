package org.caresphere.android

import android.app.AlertDialog
import android.app.KeyguardManager
import android.hardware.biometrics.BiometricManager
import android.hardware.biometrics.BiometricPrompt
import android.os.Build
import android.os.Bundle
import android.os.CancellationSignal
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.*
import android.graphics.Color
import androidx.activity.ComponentActivity

/** All screens share the gate, including notification entry points. Not a Keystore access-control key. */
open class ProtectedActivity:ComponentActivity(){
    private var content:View?=null
    private var frame:FrameLayout?=null
    private var shield:View?=null
    private var resumed=false
    private var authentication:CancellationSignal?=null
    private var attempt:Long?=null
    private var gateMessage="Your private care information is hidden until you unlock."
    private val dialogs=mutableListOf<AlertDialog>()
    private val pendingResults=mutableListOf<()->Unit>()
    private fun label(s:String)=AppLanguage.text(this,s)
    override fun onCreate(state:Bundle?){super.onCreate(state);if(AppLock.enabled(this))window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)}
    override fun setContentView(view:View?){setContentView(view,ViewGroup.LayoutParams(-1,-1))}
    override fun setContentView(view:View?,params:ViewGroup.LayoutParams?){
        content=view
        val root=FrameLayout(this);if(view!=null)root.addView(view,FrameLayout.LayoutParams(params?.width?:-1,params?.height?:-1));frame=root;shield=null
        super.setContentView(root);refreshPrivacy()
    }
    override fun setContentView(layoutResID:Int){setContentView(layoutInflater.inflate(layoutResID,null))}
    override fun onStart(){super.onStart();AppLock.start()}
    override fun onResume(){super.onResume();resumed=true;refreshPrivacy()}
    override fun onPause(){
        resumed=false
        if(AppLock.enabled(this)){
            window.decorView.findFocus()?.let{focus->getSystemService(android.view.inputmethod.InputMethodManager::class.java).hideSoftInputFromWindow(focus.windowToken,0);focus.clearFocus()}
            dialogs.toList().forEach{it.dismiss()};dialogs.clear()
        }
        refreshPrivacy();super.onPause()
    }
    override fun onStop(){cancelAuthentication();AppLock.stop(isChangingConfigurations);refreshPrivacy();super.onStop()}
    override fun onDestroy(){cancelAuthentication();pendingResults.clear();dialogs.clear();super.onDestroy()}
    private fun cancelAuthentication(){if(attempt!=null)AppLock.session.invalidate();attempt=null;authentication?.cancel();authentication=null}
    protected fun holdUntilUnlocked(action:()->Unit):Boolean {
        if(!AppLock.locked(this))return false
        // Results remain local to this live activity and are never persisted.
        if(pendingResults.size<4)pendingResults.add(action)
        return true
    }
    protected open fun onPrivacyUnlocked(){}
    protected fun AlertDialog.Builder.showProtected():AlertDialog=create().also{it.showProtected()}
    protected fun AlertDialog.showProtected(){
        if(AppLock.enabled(this@ProtectedActivity)&&(!resumed||AppLock.locked(this@ProtectedActivity))){
            if(pendingResults.size<4)pendingResults.add{if(!isFinishing&&!isDestroyed)showProtected()};return
        }
        remember(this);show()
        if(AppLock.enabled(this@ProtectedActivity))window?.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
    }
    private fun remember(dialog:AlertDialog){
        if(AppLock.enabled(this))dialog.window?.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        dialogs.add(dialog);dialog.setOnDismissListener{dialogs.remove(dialog)}
    }
    protected fun configureAppLock(enable:Boolean,onChanged:()->Unit){authenticate(enable,onChanged)}
    private fun refreshPrivacy(){
        val root=frame?:return
        val hidden=AppLock.enabled(this)&&(!resumed||AppLock.locked(this))
        if(AppLock.enabled(this))window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        else window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
        content?.visibility=if(hidden)View.INVISIBLE else View.VISIBLE
        content?.importantForAccessibility=if(hidden)View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS else View.IMPORTANT_FOR_ACCESSIBILITY_AUTO
        shield?.let{root.removeView(it)};shield=null
        if(!hidden)return
        val panel=LinearLayout(this).apply{
            orientation=LinearLayout.VERTICAL;gravity=android.view.Gravity.CENTER;setPadding(32,48,32,48)
            setBackgroundColor(Color.rgb(20,29,23));isClickable=true;isFocusable=true
        }
        fun text(value:String,size:Float){panel.addView(TextView(this).apply{text=label(value);textSize=size;setTextColor(Color.WHITE);setPadding(16,16,16,16);gravity=android.view.Gravity.CENTER})}
        text("CareSphere is locked",26f);text(gateMessage,18f)
        panel.addView(Button(this).apply{text=label("Unlock CareSphere");isAllCaps=false;isEnabled=resumed&&authentication==null;setOnClickListener{authenticate(null){}}},LinearLayout.LayoutParams(-1,-2))
        panel.addView(Button(this).apply{text=label("Leave app");isAllCaps=false;setOnClickListener{moveTaskToBack(true)}},LinearLayout.LayoutParams(-1,-2))
        val scroll=ScrollView(this).apply{isFillViewport=true;addView(panel)};shield=scroll;root.addView(scroll,FrameLayout.LayoutParams(-1,-1))
    }
    private fun authenticate(setting:Boolean?,onChanged:()->Unit){
        if(authentication!=null||!resumed)return
        if(Build.VERSION.SDK_INT<30){gateMessage="App lock requires Android 11 or newer. Use your device screen lock on older Android versions.";refreshPrivacy();return}
        authenticateSupported(setting,onChanged)
    }
    @androidx.annotation.RequiresApi(30)
    private fun authenticateSupported(setting:Boolean?,onChanged:()->Unit){
        val allowed=BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL
        if(!getSystemService(KeyguardManager::class.java).isDeviceSecure || getSystemService(BiometricManager::class.java).canAuthenticate(allowed)!=BiometricManager.BIOMETRIC_SUCCESS){
            gateMessage="Device authentication is unavailable. Your data remains locked. Check device security settings and try again."
            if(!AppLock.locked(this))AlertDialog.Builder(this).setMessage(label(gateMessage)).setPositiveButton(label("OK"),null).showProtected()
            refreshPrivacy();return
        }
        val operation=AppLock.session.begin();attempt=operation
        val signal=CancellationSignal();authentication=signal;refreshPrivacy()
        val prompt=BiometricPrompt.Builder(this).setTitle(label("Unlock CareSphere"))
            .setDescription(label("Use your device screen lock or a strong biometric. CareSphere never receives your PIN or biometric data."))
            .setAllowedAuthenticators(allowed).build()
        try { prompt.authenticate(signal,mainExecutor,object:BiometricPrompt.AuthenticationCallback(){
            override fun onAuthenticationSucceeded(result:BiometricPrompt.AuthenticationResult){
                if(attempt!=operation)return
                authentication=null;attempt=null
                if(!AppLock.session.complete(operation,true,resumed&&!isFinishing&&!isDestroyed)){
                    gateMessage="Authentication did not finish in the foreground. Try again.";refreshPrivacy();return
                }
                if(setting!=null&&!AppLock.setEnabled(this@ProtectedActivity,setting)){
                    AppLock.session.lock();gateMessage="The app-lock preference could not be saved. Try again.";refreshPrivacy();return
                }
                gateMessage="Your private care information is hidden until you unlock."
                refreshPrivacy();onPrivacyUnlocked();onChanged()
                val results=pendingResults.toList();pendingResults.clear();results.forEach{it()}
            }
            override fun onAuthenticationError(errorCode:Int,errString:CharSequence){
                if(attempt!=operation)return
                AppLock.session.invalidate();attempt=null;authentication=null
                gateMessage="Authentication was cancelled or unavailable. Tap Unlock to try again.";refreshPrivacy()
            }
            override fun onAuthenticationFailed(){/* OS prompt allows another try. Never grant access here. */}
        }) }catch(_:Exception){cancelAuthentication();gateMessage="Authentication was cancelled or unavailable. Tap Unlock to try again.";refreshPrivacy()}
    }
}
