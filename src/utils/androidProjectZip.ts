import JSZip from 'jszip';

export async function downloadAndroidProjectZip() {
  const zip = new JSZip();

  // Root files
  zip.file(
    'build.gradle.kts',
    `// Top-level build file
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.ksp) apply false
}`
  );

  zip.file(
    'settings.gradle.kts',
    `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "DocHub"
include(":app")`
  );

  zip.file(
    'gradle.properties',
    `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true`
  );

  zip.file(
    'local.properties.example',
    `## Location of the Android SDK.
## For Windows:
## sdk.dir=C\\:\\\\Users\\\\YOUR_USERNAME\\\\AppData\\\\Local\\\\Android\\\\Sdk
##
## For macOS:
## sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
##
## For Linux:
## sdk.dir=/home/YOUR_USERNAME/Android/Sdk`
  );

  zip.file(
    'BUILD_APK_GUIDE.md',
    `# How to Build DocHub Debug APK

This project is a native Android application built with Kotlin 2.0 and Jetpack Compose.

## Method 1: Using gradlew.bat on Windows (Command Line)
1. Ensure JDK 17+ is installed on your computer.
   - Run in CMD / PowerShell: \`java -version\`
2. Open Command Prompt or PowerShell in this project folder:
   \`\`\`cmd
   gradlew.bat assembleDebug
   \`\`\`
3. Once completed, your generated APK file will be ready at:
   \`app\\build\\outputs\\apk\\debug\\app-debug.apk\`

## Method 2: Using Android Studio (Recommended / 1-Click)
1. Open Android Studio.
2. Select **Open** and choose this project directory.
3. Wait for Gradle Sync to complete.
4. In the top menu, click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
5. In the bottom right corner notification, click **locate** to reveal \`app-debug.apk\`.

## Method 3: Cloud Build via GitHub Actions
We have included \`.github/workflows/build-apk.yml\`.
Push this project to a GitHub repository, and GitHub Actions will automatically compile the APK in the cloud and let you download it under the **Actions > Artifacts** tab!
`
  );

  // GitHub Actions workflow for automatic cloud APK compilation
  const ghDir = zip.folder('.github')?.folder('workflows');
  ghDir?.file(
    'build-apk.yml',
    `name: Build Android APK (DocHub)

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: gradle
      - name: Setup Android SDK
        run: |
          echo "\${ANDROID_HOME}/cmdline-tools/latest/bin" >> $GITHUB_PATH
          echo "\${ANDROID_HOME}/platform-tools" >> $GITHUB_PATH
          yes | "\${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager" --licenses > /dev/null 2>&1 || true
          "\${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager" "platform-tools" "platforms;android-35" "build-tools;35.0.0"
      - run: chmod +x ./gradlew
      - run: ./gradlew assembleDebug
      - name: Verify APK file exists
        run: |
          if [ ! -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
            echo "Error: app/build/outputs/apk/debug/app-debug.apk does not exist!" >&2
            exit 1
          fi
          echo "Found APK at app/build/outputs/apk/debug/app-debug.apk"
          ls -lh app/build/outputs/apk/debug/app-debug.apk
      - uses: actions/upload-artifact@v4
        with:
          name: dochub-debug-apk
          path: app/build/outputs/apk/debug/app-debug.apk
          if-no-files-found: error`
  );

  // Fetch or populate gradlew and gradlew.bat
  try {
    const gradlewBatRes = await fetch('/android-template/gradlew.bat');
    if (gradlewBatRes.ok) {
      const batText = await gradlewBatRes.text();
      zip.file('gradlew.bat', batText);
    }
  } catch {
    // fallback
  }

  try {
    const gradlewRes = await fetch('/android-template/gradlew');
    if (gradlewRes.ok) {
      const shText = await gradlewRes.text();
      zip.file('gradlew', shText, { unixPermissions: '755' });
    }
  } catch {
    // fallback
  }

  // Gradle version catalog & wrapper
  const gradleDir = zip.folder('gradle');
  gradleDir?.file(
    'libs.versions.toml',
    `[versions]
agp = "8.5.2"
kotlin = "2.0.20"
coreKtx = "1.13.1"
lifecycleRuntimeKtx = "2.8.6"
activityCompose = "1.9.2"
composeBom = "2024.09.02"
navigationCompose = "2.8.1"
room = "2.6.1"
ksp = "2.0.20-1.0.25"
coroutines = "1.8.1"
coilCompose = "2.7.0"
materialIconsExtended = "1.7.2"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
androidx-lifecycle-runtime-ktx = { group = "androidx.lifecycle", name = "lifecycle-runtime-ktx", version.ref = "lifecycleRuntimeKtx" }
androidx-lifecycle-viewmodel-compose = { group = "androidx.lifecycle", name = "lifecycle-viewmodel-compose", version.ref = "lifecycleRuntimeKtx" }
androidx-activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activityCompose" }
androidx-compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
androidx-ui = { group = "androidx.compose.ui", name = "ui" }
androidx-ui-graphics = { group = "androidx.compose.ui", name = "ui-graphics" }
androidx-ui-tooling = { group = "androidx.compose.ui", name = "ui-tooling" }
androidx-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
androidx-material3 = { group = "androidx.compose.material3", name = "material3" }
androidx-material-icons-extended = { group = "androidx.compose.material", name = "material-icons-extended", version.ref = "materialIconsExtended" }
androidx-navigation-compose = { group = "androidx.navigation", name = "navigation-compose", version.ref = "navigationCompose" }
androidx-room-runtime = { group = "androidx.room", name = "room-runtime", version.ref = "room" }
androidx-room-ktx = { group = "androidx.room", name = "room-ktx", version.ref = "room" }
androidx-room-compiler = { group = "androidx.room", name = "room-compiler", version.ref = "room" }
kotlinx-coroutines-android = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-android", version.ref = "coroutines" }
coil-compose = { group = "io.coil-kt", name = "coil-compose", version.ref = "coilCompose" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
ksp = { id = "com.google.devtools.ksp", version.ref = "ksp" }`
  );

  const wrapperDir = gradleDir?.folder('wrapper');
  wrapperDir?.file(
    'gradle-wrapper.properties',
    `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.9-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists`
  );

  try {
    const jarRes = await fetch('/android-template/gradle/wrapper/gradle-wrapper.jar');
    if (jarRes.ok) {
      const jarBuffer = await jarRes.arrayBuffer();
      wrapperDir?.file('gradle-wrapper.jar', jarBuffer);
    }
  } catch {
    // fallback
  }

  // App module
  const appDir = zip.folder('app');
  appDir?.file(
    'build.gradle.kts',
    `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.dochub.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.dochub.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)
    implementation(libs.androidx.navigation.compose)

    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)

    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.coil.compose)
}`
  );

  appDir?.file(
    'proguard-rules.pro',
    `-keepattributes *Annotation*
-keepclassmembers class * {
    @androidx.room.Dao *;
    @androidx.room.Entity *;
}`
  );

  // AndroidManifest & Resources
  const mainDir = appDir?.folder('src')?.folder('main');
  mainDir?.file(
    'AndroidManifest.xml',
    `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:name=".DocHubApplication"
        android:allowBackup="true"
        android:icon="@android:drawable/ic_menu_agenda"
        android:label="@string/app_name"
        android:roundIcon="@android:drawable/ic_menu_agenda"
        android:supportsRtl="true"
        android:theme="@style/Theme.DocHub">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.DocHub">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>
</manifest>`
  );

  const resValues = mainDir?.folder('res')?.folder('values');
  resValues?.file(
    'strings.xml',
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">DocHub</string>
    <string name="app_tagline">Store once. Find fast. Get the format you need.</string>
</resources>`
  );

  resValues?.file(
    'themes.xml',
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.DocHub" parent="android:Theme.Material.Light.NoActionBar" />
</resources>`
  );

  const resXml = mainDir?.folder('res')?.folder('xml');
  resXml?.file(
    'file_paths.xml',
    `<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <files-path name="dochub_files" path="." />
    <cache-path name="dochub_cache" path="." />
</paths>`
  );

  // Kotlin Sources
  const kotlinPkg = mainDir?.folder('java')?.folder('com')?.folder('dochub')?.folder('app');

  const securityPkg = kotlinPkg?.folder('security');
  securityPkg?.file(
    'CryptoManager.kt',
    `package com.dochub.app.security

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.io.File
import java.io.InputStream
import java.io.OutputStream
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.CipherInputStream
import javax.crypto.CipherOutputStream
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class CryptoManager {
    companion object {
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val KEY_ALIAS = "DocHubMasterKey"
        private const val ALGORITHM = KeyProperties.KEY_ALGORITHM_AES
        private const val BLOCK_MODE = KeyProperties.BLOCK_MODE_GCM
        private const val PADDING = KeyProperties.ENCRYPTION_PADDING_NONE
        private const val TRANSFORMATION = "\$ALGORITHM/\$BLOCK_MODE/\$PADDING"
        private const val TAG_LENGTH_BITS = 128
        private const val IV_LENGTH_BYTES = 12
        val MAGIC_HEADER = "DOCHUB_ENC_V1".toByteArray(Charsets.UTF_8)
    }

    private val keyStore: KeyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }

    private fun getOrCreateKey(): SecretKey {
        val existingKey = keyStore.getEntry(KEY_ALIAS, null) as? KeyStore.SecretKeyEntry
        return existingKey?.secretKey ?: generateKey()
    }

    private fun generateKey(): SecretKey {
        val keyGen = KeyGenerator.getInstance(ALGORITHM, ANDROID_KEYSTORE)
        val spec = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(BLOCK_MODE)
            .setEncryptionPaddings(PADDING)
            .setKeySize(256)
            .setUserAuthenticationRequired(false)
            .build()
        keyGen.init(spec)
        return keyGen.generateKey()
    }

    fun isFileEncrypted(file: File): Boolean {
        if (!file.exists() || file.length() < MAGIC_HEADER.size) return false
        val buffer = ByteArray(MAGIC_HEADER.size)
        file.inputStream().use { it.read(buffer) }
        return buffer.contentEquals(MAGIC_HEADER)
    }

    fun encryptStream(outputStream: OutputStream): OutputStream {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
        val iv = cipher.iv
        outputStream.write(MAGIC_HEADER)
        outputStream.write(iv)
        outputStream.flush()
        return CipherOutputStream(outputStream, cipher)
    }

    fun decryptStream(inputStream: InputStream): InputStream {
        val header = ByteArray(MAGIC_HEADER.size)
        val bytesRead = inputStream.read(header)
        if (bytesRead != MAGIC_HEADER.size || !header.contentEquals(MAGIC_HEADER)) {
            throw IllegalArgumentException("Invalid file header")
        }
        val iv = ByteArray(IV_LENGTH_BYTES)
        val ivBytesRead = inputStream.read(iv)
        if (ivBytesRead != IV_LENGTH_BYTES) {
            throw IllegalArgumentException("Malformed initialization vector")
        }
        val cipher = Cipher.getInstance(TRANSFORMATION)
        val spec = GCMParameterSpec(TAG_LENGTH_BITS, iv)
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), spec)
        return CipherInputStream(inputStream, cipher)
    }
}`
  );

  securityPkg?.file(
    'AppLockManager.kt',
    `package com.dochub.app.security

import android.content.Context
import android.content.SharedPreferences
import java.security.MessageDigest

class AppLockManager(context: Context) {
    companion object {
        private const val PREFS_NAME = "dochub_security_prefs"
        private const val KEY_LOCK_MODE = "lock_mode"
        private const val KEY_PIN_HASH = "pin_hash"
        const val MODE_OFF = "OFF"
        const val MODE_PIN = "PIN"
        const val MODE_BIOMETRIC = "BIOMETRIC"
    }

    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    var isUnlocked: Boolean = false

    fun getLockMode(): String = prefs.getString(KEY_LOCK_MODE, MODE_OFF) ?: MODE_OFF
    fun isLockEnabled(): Boolean = getLockMode() != MODE_OFF

    fun setLockModeOff() {
        prefs.edit().putString(KEY_LOCK_MODE, MODE_OFF).remove(KEY_PIN_HASH).apply()
        isUnlocked = true
    }

    fun setPin(pin: String) {
        val hash = hashPin(pin)
        prefs.edit().putString(KEY_LOCK_MODE, MODE_PIN).putString(KEY_PIN_HASH, hash).apply()
        isUnlocked = true
    }

    fun verifyPin(pin: String): Boolean {
        val storedHash = prefs.getString(KEY_PIN_HASH, null) ?: return false
        val ok = storedHash == hashPin(pin)
        if (ok) isUnlocked = true
        return ok
    }

    fun setBiometricMode() {
        prefs.edit().putString(KEY_LOCK_MODE, MODE_BIOMETRIC).apply()
        isUnlocked = true
    }

    private fun hashPin(pin: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val bytes = digest.digest(pin.toByteArray(Charsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }
}`
  );

  kotlinPkg?.file(
    'DocHubApplication.kt',
    `package com.dochub.app

import android.app.Application
import com.dochub.app.data.local.DocHubDatabase
import com.dochub.app.data.repository.DocumentRepository
import com.dochub.app.data.repository.HistoryRepository
import com.dochub.app.data.repository.PresetRepository
import com.dochub.app.data.storage.FileManager
import com.dochub.app.engine.ImageProcessor
import com.dochub.app.engine.PdfProcessor
import com.dochub.app.engine.SmartPreparer
import com.dochub.app.security.AppLockManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob

class DocHubApplication : Application() {
    val applicationScope = CoroutineScope(SupervisorJob())
    val database by lazy { DocHubDatabase.getDatabase(this, applicationScope) }
    val fileManager by lazy { FileManager(this) }
    val appLockManager by lazy { AppLockManager(this) }
    val documentRepository by lazy { DocumentRepository(database.documentDao()) }
    val historyRepository by lazy { HistoryRepository(database.conversionHistoryDao()) }
    val presetRepository by lazy { PresetRepository(database.presetDao()) }
    val imageProcessor by lazy { ImageProcessor(fileManager) }
    val pdfProcessor by lazy { PdfProcessor(fileManager) }
    val smartPreparer by lazy {
        SmartPreparer(imageProcessor, pdfProcessor, historyRepository, fileManager)
    }
}`
  );

  kotlinPkg?.file(
    'MainActivity.kt',
    `package com.dochub.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.dochub.app.ui.navigation.Screen
import com.dochub.app.ui.navigation.bottomNavItems
import com.dochub.app.ui.screens.*
import com.dochub.app.ui.theme.DocHubTheme
import com.dochub.app.ui.viewmodel.DocHubViewModel

class MainActivity : ComponentActivity() {
    private val viewModel: DocHubViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            DocHubTheme {
                val isUnlocked by viewModel.isUnlocked.collectAsState()
                if (!isUnlocked) {
                    LockScreen(viewModel = viewModel)
                } else {
                    var currentScreen by remember { mutableStateOf<Screen>(Screen.Home) }
                    Scaffold(
                        modifier = Modifier.fillMaxSize(),
                        bottomBar = {
                            NavigationBar {
                                bottomNavItems.forEach { screen ->
                                    NavigationBarItem(
                                        selected = currentScreen == screen,
                                        onClick = { currentScreen = screen },
                                        icon = { Icon(screen.icon, contentDescription = screen.title) },
                                        label = { Text(screen.title) }
                                    )
                                }
                            }
                        }
                    ) { innerPadding ->
                        Surface(modifier = Modifier.fillMaxSize().padding(innerPadding)) {
                            when (currentScreen) {
                                Screen.Home -> HomeScreen(viewModel, onNavigateToDocuments = { currentScreen = Screen.Documents }, onNavigateToPrepare = { currentScreen = Screen.Prepare })
                                Screen.Documents -> DocumentsScreen(viewModel, onPrepareDocument = { doc -> viewModel.selectedDocument.value = doc; currentScreen = Screen.Prepare })
                                Screen.Prepare -> PrepareScreen(viewModel)
                                Screen.History -> HistoryScreen(viewModel)
                                Screen.Settings -> SettingsScreen(viewModel)
                            }
                        }
                    }
                }
            }
        }
    }
}`
  );

  // Generate ZIP and trigger browser download
  const content = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = 'DocHub-Android-Studio-Project.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
