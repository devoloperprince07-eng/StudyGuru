# StudyGuru Native Android

A separate Kotlin + Jetpack Compose Android project in `android-native/`. It is isolated from the existing website source and deployment branch.

## Implemented scaffold

- Hindi/English Compose dashboard using StudyGuru Coral Orange, Dark and White theme.
- Supabase client wiring for Auth, PostgREST and Storage.
- Initial screens/data loading for courses, learning materials, tests, live classes, notes and profile.
- Email/password and Google OAuth entry points with Android deep-link intent handling.
- GitHub Actions debug APK build workflow.

## Not yet production-complete

- End-to-end Google/email login verification and redirect allowlist configuration.
- PDF/video viewing and downloads.
- Create/edit notes, test-taking/results, course detail and admin CRUD.
- Parent/child account linking and role-aware policies.
- Offline storage, push notifications, release signing, AAB and store listing assets.

These are tracked as remaining implementation and verification work. The app must not be described as release-ready until these are completed and tested.

## Build

GitHub Actions builds a debug APK on pushes to this branch. A signed release AAB requires an adult publisher/guardian to manage store registration where required, plus secure signing configuration. Never commit signing keys, passwords, Supabase service-role keys or OAuth client secrets.

## Website safety

Keep native Android work on `android-native`. Do not merge this branch into `main` as part of Android development; the existing Vercel website remains on `main`.
