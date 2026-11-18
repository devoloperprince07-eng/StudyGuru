# StudyGuru Native Android

This is a separate Kotlin + Jetpack Compose Android project in the `android-native/` directory. It does not replace or modify the existing website source files.

## Current status

- Initial bilingual Hindi/English Compose dashboard scaffold.
- Coral Orange, Dark and White brand colors.
- Separate Android build workflow using GitHub Actions.
- Backend authentication, Supabase data access, offline downloads, push notifications, role permissions and release signing are not yet implemented.

## Build

The GitHub Actions workflow can build a debug APK from the Actions tab using the Android build workflow. A release AAB requires a verified application ID, signing configuration and store assets. Never commit signing keys, passwords, Supabase service-role keys or OAuth client secrets.
