# BlockTiks — Expo Go Version

This is a React Native + Expo SDK rewrite of the original Flutter `BlockTiks-Mobile-Application`. It lives in a separate folder so the Flutter codebase remains untouched.

## Why a separate folder/repo?

The original app is a Flutter project. Building an Expo Go version requires a full React Native rewrite. Keeping it in a sibling folder (`BlockTiks-Expo-Go`) lets both codebases coexist without mixing Dart and TypeScript files.

## What's included

- **Expo SDK 57** with file-based routing via **Expo Router**
- Dark theme matching the original app’s pink/black palette
- Shared UI component library (`Text`, `Button`, `Input`, `Card`, `Screen`, etc.)
- Auth stack: Get Started, Sign In, Sign Up, OTP, Forgot/Reset Password
- Main app shell with bottom tabs: Home, Search, Tickets, Profile
- Core screens wired up: Event Detail, Create Event, Wallet, Settings, Notifications, QR Scanner, Creator Dashboard
- Placeholder screens for remaining Flutter modules
- Axios-based API client mirroring the original `BaseClient`
- SecureStore-backed auth store (Zustand)
- Expo Go-compatible packages for camera, image picker, notifications, etc.

## Running in Expo Go

```bash
cd BlockTiks-Expo-Go
npx expo start
```

Then scan the QR code with the **Expo Go** app on iOS or Android.

## Project scripts

```bash
npx expo start        # Start the dev server for Expo Go
npx expo start --web  # Run in browser
npx tsc --noEmit      # Type check
npx expo export --platform web   # Verify the bundle builds
```

## Flutter → Expo mapping notes

| Flutter package | Expo / React Native replacement |
|---|---|
| `get` (state/routing) | Expo Router + Zustand |
| `dio` | `axios` |
| `amazon_cognito_identity_dart_2` | `@aws-amplify/auth` / `amazon-cognito-identity-js` |
| `shared_preferences` | `expo-secure-store` |
| `qr_code_scanner` | `expo-camera` barcode scanning |
| `flutter_local_notifications` | `expo-notifications` |
| `image_picker` / `images_picker` | `expo-image-picker` |
| `permission_handler` | Per-module Expo permission APIs |
| `cached_network_image` | `expo-image` |
| `flutter_svg` | `react-native-svg` |
| `fl_chart` | `react-native-chart-kit` |
| `flutter_credit_card` | Custom form (or Stripe SDK in dev build) |
| `google_fonts` | `@expo-google-fonts/inter` + `@expo-google-fonts/manrope` |

## Known limitations in Expo Go

- **Image cropping UI**: `expo-image-picker` supports `allowsEditing` and aspect ratios but does not provide the same dedicated cropper UI as `images_picker`. A custom cropper or a development build can restore the exact native behavior.
- **Payments**: The original app had Stripe/Apple Pay/Google Pay UI commented out and not wired. Real in-app payment capture requires a Stripe SDK and an Expo **development build**, not Expo Go.
- **Push notifications via FCM**: Expo Go supports local notifications and Expo Push. Firebase Cloud Messaging requires a development build.
- **Firebase native SDKs** (Auth, Firestore, Crashlytics): require a development build.

## Next steps to complete

1. Wire the real auth endpoints in `app/(auth)/sign-in.tsx` and `app/(auth)/sign-up.tsx`.
2. Replace mock event data in `app/(app)/(tabs)/index.tsx` with API calls.
3. Fill out placeholder screens for modules like Analytics, Manage Teams, Venue Layout, etc.
4. Add real payment flow via Stripe in a development build if needed.
5. Configure EAS Build / EAS Update for store distribution.
