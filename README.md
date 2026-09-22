# DocHub — Native Android Document Management & Preparation App

> **"Store once. Find fast. Get the format you need."**

DocHub is a 100% offline personal document management and preparation native Android application built with **Kotlin, Jetpack Compose, Material 3, Android Architecture Components, Room (SQLite), and the Android Storage Access Framework (SAF)**.

---

## 📱 Native Android Project Architecture

```
DocHub/
├── build.gradle.kts                # Project-level Gradle build script
├── settings.gradle.kts             # Module declarations
├── gradle.properties               # Memory & AndroidX options
├── gradle/
│   ├── libs.versions.toml          # Version catalog (Compose BOM, Room, Coroutines)
│   └── wrapper/
│       └── gradle-wrapper.properties
└── app/
    ├── build.gradle.kts            # App module configuration (Compose, Room, KSP)
    ├── proguard-rules.pro
    └── src/main/
        ├── AndroidManifest.xml     # FileProvider, launcher activity, zero broad storage perms
        ├── java/com/dochub/app/
        │   ├── DocHubApplication.kt # Local dependency injection container
        │   ├── MainActivity.kt      # Main entry point with Compose BottomNavigation
        │   ├── data/
        │   │   ├── local/
        │   │   │   ├── DocHubDatabase.kt
        │   │   │   ├── entity/      # DocumentEntity, ConversionHistoryEntity, PresetEntity
        │   │   │   └── dao/         # DocumentDao, ConversionHistoryDao, PresetDao
        │   │   ├── repository/      # DocumentRepository, HistoryRepository, PresetRepository
        │   │   └── storage/
        │   │       └── FileManager.kt # SAF content:// resolver, private directory structure
        │   ├── engine/
        │   │   ├── ImageProcessor.kt # Progressive target-size compression, resize, format conversion
        │   │   ├── PdfProcessor.kt   # PdfDocument generation, PdfRenderer extraction
        │   │   └── SmartPreparer.kt  # GET REQUIRED FORMAT automated pipeline & verification
        │   └── ui/
        │       ├── navigation/      # Bottom nav routes: Home, Documents, Prepare, History, Settings
        │       ├── screens/         # Compose screens matching specification
        │       ├── theme/           # Material 3 typography, palette, shapes
        │       └── viewmodel/       # DocHubViewModel
        └── res/
            ├── values/strings.xml
            ├── values/themes.xml
            └── xml/file_paths.xml    # Android FileProvider XML specification
```

---

## 🚀 How to Build the APK

### Method A: Windows Command Line (gradlew.bat)
1. Ensure Java 17+ is installed (`java -version`).
2. Open Command Prompt or PowerShell in this project folder.
3. Run:
   ```cmd
   gradlew.bat assembleDebug
   ```
4. Find your generated APK at:
   `app\build\outputs\apk\debug\app-debug.apk`

### Method B: macOS / Linux Terminal (./gradlew)
1. Ensure execution permissions:
   ```bash
   chmod +x gradlew
   ```
2. Build debug APK:
   ```bash
   ./gradlew assembleDebug
   ```
3. APK output:
   `app/build/outputs/apk/debug/app-debug.apk`

### Method C: Android Studio (1-Click GUI)
1. Open Android Studio (Ladybug, Koala, or Iguana).
2. Click **Open** and select this directory (`DocHub`).
3. Wait for Gradle Sync to finish.
4. Click **Build > Build Bundle(s) / APK(s) > Build APK(s)** in the top menu.
5. Click **locate** on the notification to reveal `app-debug.apk`.

### Method D: GitHub Actions (Automatic Cloud Build)
This project includes `.github/workflows/build-apk.yml`. Push the repository to GitHub, and the workflow will automatically compile the APK in the cloud with zero local setup, and attach `dochub-debug-apk` under the **Actions > Artifacts** tab.

### Install on Android Device / Emulator:
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## 🔒 100% Offline & Privacy Guarantee

- **Zero Cloud Services**: No Firebase, no Supabase, no AWS, no remote APIs.
- **Airplane Mode Ready**: Decodes, processes, converts, and verifies files locally using Android SDK native APIs (`android.graphics.Bitmap`, `android.graphics.pdf.PdfDocument`, `android.graphics.pdf.PdfRenderer`).
- **Private Sandbox**: Documents imported through Android SAF are copied into `context.filesDir/DocHub/documents` with collision-safe unique filenames.
