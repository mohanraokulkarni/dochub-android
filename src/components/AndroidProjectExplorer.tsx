import { useState } from 'react';
import {
  Download,
  Terminal,
  CheckCircle2,
  Copy,
  Check,
  Cpu,
  Layers,
  FileCode2,
  FolderGit2,
  HelpCircle,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { downloadAndroidProjectZip } from '../utils/androidProjectZip';

export function AndroidProjectExplorer() {
  const [downloading, setDownloading] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [buildTab, setBuildTab] = useState<'windows' | 'androidstudio' | 'github' | 'mac'>('windows');
  const [selectedFile, setSelectedFile] = useState<string>('gradlew.bat');

  const filesList = [
    { name: 'gradlew.bat', path: 'gradlew.bat (Windows batch)' },
    { name: 'build-apk.yml', path: '.github/workflows/build-apk.yml' },
    { name: 'MainActivity.kt', path: 'app/src/main/java/com/dochub/app/MainActivity.kt' },
    { name: 'ImageProcessor.kt', path: 'app/src/main/java/com/dochub/app/engine/ImageProcessor.kt' },
    { name: 'PdfProcessor.kt', path: 'app/src/main/java/com/dochub/app/engine/PdfProcessor.kt' },
    { name: 'SmartPreparer.kt', path: 'app/src/main/java/com/dochub/app/engine/SmartPreparer.kt' },
    { name: 'FileManager.kt', path: 'app/src/main/java/com/dochub/app/data/storage/FileManager.kt' },
    { name: 'AndroidManifest.xml', path: 'app/src/main/AndroidManifest.xml' },
    { name: 'build.gradle.kts (App)', path: 'app/build.gradle.kts' },
  ];

  const codeSnippets: Record<string, string> = {
    'gradlew.bat': `@if "%DEBUG%"=="" @echo off
@rem ##########################################################################
@rem  Gradle startup script for Windows
@rem ##########################################################################
set DIRNAME=%~dp0
if "%DIRNAME%"=="" set DIRNAME=.
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%
...
set CLASSPATH=%APP_HOME%\\gradle\\wrapper\\gradle-wrapper.jar
"%JAVA_EXE%" %DEFAULT_JVM_OPTS% %JAVA_OPTS% %GRADLE_OPTS% -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*
`,
    'build-apk.yml': `name: Build Android APK (DocHub)
on:
  push:
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
      - uses: android-actions/setup-android@v3
      - run: chmod +x gradlew
      - run: ./gradlew assembleDebug
      - uses: actions/upload-artifact@v4
        with:
          name: dochub-debug-apk
          path: app/build/outputs/apk/debug/app-debug.apk`,
    'MainActivity.kt': `package com.dochub.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.material3.*
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
                // NavigationBar with Jetpack Compose Material 3
                // Home, Documents, Prepare, History, Settings
            }
        }
    }
}`,
    'ImageProcessor.kt': `package com.dochub.app.engine

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import java.io.File
import java.io.FileOutputStream

class ImageProcessor(private val fileManager: FileManager) {
    // 9-Step Target-Size Smart Progressive Compression
    suspend fun compressToTargetSize(
        sourceFile: File,
        targetFormat: String,
        targetWidth: Int?,
        targetHeight: Int?,
        maxFileSizeBytes: Long
    ): ImageProcessResult {
        // 1. Convert to target format (JPEG, PNG, WEBP)
        // 2. Exact dimension / aspect-ratio scale
        // 3. Progressive quality reduction (95 -> 15)
        // 4. Progressive dimension scaling if needed
        // 5. Verification on disk (bytes <= maxFileSizeBytes)
    }
}`,
    'PdfProcessor.kt': `package com.dochub.app.engine

import android.graphics.pdf.PdfDocument
import android.graphics.pdf.PdfRenderer

class PdfProcessor(private val fileManager: FileManager) {
    // Native Image -> PDF using android.graphics.pdf.PdfDocument
    suspend fun imagesToPdf(imageFiles: List<File>, pageStandard: PageStandard): PdfProcessResult

    // Native PDF -> Images extraction using android.graphics.pdf.PdfRenderer
    suspend fun pdfToImages(pdfFile: File, targetPages: List<Int>?): PdfProcessResult
}`,
    'SmartPreparer.kt': `package com.dochub.app.engine

// Orchestrates the "GET REQUIRED FORMAT" workflow
class SmartPreparer(
    private val imageProcessor: ImageProcessor,
    private val pdfProcessor: PdfProcessor,
    private val historyRepository: HistoryRepository,
    private val fileManager: FileManager
) {
    suspend fun prepareDocumentWithPreset(sourceFile: File, preset: PresetEntity): PreparationResult
}`,
    'FileManager.kt': `package com.dochub.app.data.storage

// Handles SAF content:// URIs with ContentResolver
// Safe copy to app-private storage: files/DocHub/documents
// Collision-prevention, zero broad storage permissions
class FileManager(private val context: Context) {
    fun importFromUri(contentResolver: ContentResolver, uri: Uri): ImportedFileInfo
}`,
    'AndroidManifest.xml': `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:name=".DocHubApplication"
        android:label="@string/app_name"
        android:theme="@style/Theme.DocHub">
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`,
    'build.gradle.kts (App)': `plugins {
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
    }
}`,
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(text);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadAndroidProjectZip();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-white shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-400 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" /> Native Android Studio & Gradle Ready
            </span>
          </div>
          <h3 className="text-xl font-bold mt-1 text-slate-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            DocHub APK Build Center
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Complete Gradle wrapper (<code>gradlew.bat</code> & <code>gradlew</code>), Version Catalog & Kotlin Jetpack Compose
          </p>
        </div>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs sm:text-sm px-5 py-2.5 rounded-xl transition shadow-lg shadow-blue-600/30 disabled:opacity-60 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          {downloading ? 'Packing Project ZIP...' : 'Download Android Studio Project (.ZIP)'}
        </button>
      </div>

      {/* Build Method Selector */}
      <div className="mt-5">
        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
          Choose How to Build Your APK:
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => setBuildTab('windows')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              buildTab === 'windows'
                ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Laptop className="w-4 h-4 text-blue-300" /> Windows (gradlew.bat)
          </button>
          <button
            onClick={() => setBuildTab('androidstudio')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              buildTab === 'androidstudio'
                ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-300" /> Android Studio (1-Click)
          </button>
          <button
            onClick={() => setBuildTab('github')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              buildTab === 'github'
                ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FolderGit2 className="w-4 h-4 text-purple-300" /> GitHub Actions (Cloud)
          </button>
          <button
            onClick={() => setBuildTab('mac')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              buildTab === 'mac'
                ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Terminal className="w-4 h-4 text-amber-300" /> Mac / Linux (./gradlew)
          </button>
        </div>
      </div>

      {/* Method Details */}
      <div className="mt-4 bg-slate-950/80 rounded-xl p-4 border border-slate-800">
        {buildTab === 'windows' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" /> Windows Command Line Build with gradlew.bat
              </span>
              <button
                onClick={() => copyToClipboard('gradlew.bat assembleDebug')}
                className="text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 transition"
              >
                {copiedCmd === 'gradlew.bat assembleDebug' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Command
                  </>
                )}
              </button>
            </div>

            <div className="bg-black/60 p-3 rounded-lg border border-slate-800 font-mono text-xs text-blue-300 select-all">
              gradlew.bat assembleDebug
            </div>

            <div className="text-xs text-slate-300 space-y-1.5 pt-1">
              <div className="font-semibold text-slate-200">Steps on your Windows PC:</div>
              <ol className="list-decimal list-inside space-y-1 text-slate-400">
                <li>Click <strong>Download Android Studio Project (.ZIP)</strong> above and extract the folder.</li>
                <li>Open <strong>Command Prompt (cmd)</strong> or <strong>PowerShell</strong> inside that extracted folder.</li>
                <li>Run <code>gradlew.bat assembleDebug</code>.</li>
                <li>Your APK will immediately be generated at:</li>
              </ol>
              <div className="bg-slate-900 px-3 py-1.5 rounded-lg font-mono text-emerald-300 text-[11px] border border-slate-800 select-all">
                app\build\outputs\apk\debug\app-debug.apk
              </div>
            </div>

            <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg p-2.5 text-[11px] text-amber-200/90 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Prerequisite:</strong> Requires Java 17+ installed (or bundled with Android Studio). If you see <em>"JAVA_HOME is not set"</em>, set your <code>JAVA_HOME</code> to your JDK 17 folder (e.g. <code>C:\Program Files\Android\Android Studio\jbr</code>).
              </div>
            </div>
          </div>
        )}

        {buildTab === 'androidstudio' && (
          <div className="space-y-3">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Android Studio 1-Click GUI Build (Easiest)
            </div>
            <div className="text-xs text-slate-300 space-y-2">
              <p className="text-slate-300">
                Android Studio handles SDK tools, licenses, Gradle daemon, and emulator execution automatically:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
                <li>Download and extract the <strong>DocHub-Android-Studio-Project.zip</strong>.</li>
                <li>Launch <strong>Android Studio</strong> and select <strong>Open</strong>.</li>
                <li>Select the unzipped <code>DocHub</code> folder and wait for the Gradle Sync to complete.</li>
                <li>In the top menu, go to:
                  <span className="block mt-1 font-mono text-blue-300 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)
                  </span>
                </li>
                <li>When the notification popup appears in the bottom-right, click <strong>"locate"</strong> to get <code>app-debug.apk</code>!</li>
              </ol>
            </div>
          </div>
        )}

        {buildTab === 'github' && (
          <div className="space-y-3">
            <div className="text-xs font-bold text-purple-400 uppercase tracking-wide flex items-center gap-1.5">
              <FolderGit2 className="w-3.5 h-3.5" /> Cloud Build with GitHub Actions (No local install needed)
            </div>
            <div className="text-xs text-slate-300 space-y-2">
              <p className="text-slate-300">
                We have already created <code>.github/workflows/build-apk.yml</code> inside the project:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
                <li>Create a GitHub repository and push this project codebase.</li>
                <li>GitHub Actions automatically launches an Ubuntu runner equipped with Android SDK 35 and JDK 17.</li>
                <li>The action executes <code>./gradlew assembleDebug</code> in the cloud.</li>
                <li>Download the compiled <strong>dochub-debug-apk</strong> directly from the GitHub <strong>Actions &gt; Artifacts</strong> section!</li>
              </ol>
            </div>
          </div>
        )}

        {buildTab === 'mac' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" /> macOS / Linux Terminal Build
              </span>
              <button
                onClick={() => copyToClipboard('./gradlew assembleDebug')}
                className="text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 transition"
              >
                {copiedCmd === './gradlew assembleDebug' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Command
                  </>
                )}
              </button>
            </div>

            <div className="bg-black/60 p-3 rounded-lg border border-slate-800 font-mono text-xs text-amber-300 select-all">
              ./gradlew assembleDebug
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <p>Make sure wrapper has execution permissions:</p>
              <code className="text-[11px] text-slate-300 bg-slate-900 px-2 py-0.5 rounded">chmod +x gradlew</code>
              <p className="mt-2">Output location:</p>
              <code className="text-[11px] text-emerald-300 bg-slate-900 px-2 py-0.5 rounded">app/build/outputs/apk/debug/app-debug.apk</code>
            </div>
          </div>
        )}
      </div>

      {/* Code Inspector */}
      <div className="mt-5 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <FileCode2 className="w-4 h-4 text-blue-400" /> Native Source & Build Files:
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {filesList.find((f) => f.name === selectedFile)?.path}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {filesList.map((f) => (
            <button
              key={f.name}
              onClick={() => setSelectedFile(f.name)}
              className={`text-xs px-2.5 py-1 rounded-lg transition font-mono cursor-pointer ${
                selectedFile === f.name
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>

        <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 font-mono text-xs overflow-x-auto max-h-56">
          <pre className="text-slate-300 whitespace-pre leading-relaxed">
            {codeSnippets[selectedFile] || '// File ready in project'}
          </pre>
        </div>
      </div>
    </div>
  );
}
