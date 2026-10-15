plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "org.caresphere.android"
    compileSdk = 36
    defaultConfig {
        applicationId = "org.caresphere.android"
        testInstrumentationRunner = "org.caresphere.android.NearbySmokeInstrumentation"
        minSdk = 26
        targetSdk = 35
        versionCode = 8
        versionName = "1.6.0"
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    // Credentials are supplied by the owner, never bundled in the repository/APK.
    val signingNames=listOf("CARE_KEYSTORE", "CARE_STORE_PASSWORD", "CARE_KEY_ALIAS", "CARE_KEY_PASSWORD")
    val supplied=signingNames.count { !System.getenv(it).isNullOrBlank() }
    require(supplied==0 || supplied==signingNames.size) { "Supply all four CARE signing environment variables, or none." }
    if(supplied==signingNames.size) signingConfigs.create("owner") {
        storeFile=file(System.getenv("CARE_KEYSTORE"))
        storePassword=System.getenv("CARE_STORE_PASSWORD")
        keyAlias=System.getenv("CARE_KEY_ALIAS")
        keyPassword=System.getenv("CARE_KEY_PASSWORD")
    }
    buildTypes { getByName("release") {
        isMinifyEnabled = false
        isDebuggable = false
        if(supplied==signingNames.size)signingConfig=signingConfigs.getByName("owner")
    } }
    lint { abortOnError = true }
}
dependencies {
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.health.connect:connect-client:1.1.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    implementation("com.google.zxing:core:3.5.3")
    testImplementation("junit:junit:4.13.2")
}
