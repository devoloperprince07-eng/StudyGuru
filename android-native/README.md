# StudyGuru Native Android

Separate Kotlin + Jetpack Compose Android project in `android-native/`. All work remains isolated on the `android-native` branch; the existing website's `main` branch and Vercel deployment are not changed.

## Current implementation

- Hindi/English Compose interface with StudyGuru Coral Orange, Dark and White theme.
- Supabase Auth, PostgREST and Storage client.
- Email/password and Google OAuth entry points with Android deep-link callback handling.
- Published course, material, practice test and live-class data loading.
- Private Storage signed URLs for PDF/video opening in a compatible installed app.
- PDF/video download to the device Downloads folder through Android DownloadManager.
- Student notes: create, list and delete.
- Practice tests: load questions for the selected test, select options and submit through the database scoring RPC.
- Teacher/Admin: create course and test drafts, subject to existing Supabase RLS policies.
- GitHub Actions builds a debug APK and an unsigned release AAB.

## Still required before production

- Verify Google and email login on a real Android device. Native redirect `studyguru://login-callback` must be added to Supabase Auth redirect allowlist.
- Verify PDF/video open and offline download on-device.
- Add note editing, test-question authoring, material upload/publishing, course lesson management and full Admin CRUD.
- Implement parent/student linking only after a reviewed schema and RLS design.
- Configure Firebase Cloud Messaging using the app owner's Firebase project before remote push notifications can work.
- Add robust offline metadata/cache and playback handling; current offline material action downloads files to the public Downloads folder.
- Review the SECURITY DEFINER test submission function and enable leaked-password protection in Supabase Auth.
- Create a signed release AAB using securely managed signing credentials. The workflow's release AAB is unsigned and is not store-ready.
- Complete device QA, accessibility, privacy policy, data safety declaration and store listing review. Store publisher registration/KYC must be handled by the responsible adult account owner where required.

## Build artifacts

GitHub Actions workflow `.github/workflows/studyguru-android-build.yml` uploads:
- `studyguru-debug-apk` — installable debug build.
- `studyguru-release-unsigned-aab` — unsigned bundle for subsequent secure signing; not publishable as-is.

Never commit signing keys, passwords, OAuth client secrets or Supabase service-role keys.
