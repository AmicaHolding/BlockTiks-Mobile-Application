# BlockTiks — Expo Go Version

A React Native + Expo SDK rewrite of the original Flutter `BlockTiks-Mobile-Application`. It lives in a separate folder so the Flutter codebase remains untouched.

## Identity & Design

BlockTiks is a premium event-ticketing and ticket-resale platform for fans and event creators.

- **For fans:** discover events, buy tickets, store them in a wallet, resell or transfer them.
- **For creators:** publish events, manage ticket tiers, teams, promo codes, guest lists, and view analytics.
- **Visual identity:** dark, high-contrast, nightlife/event aesthetic. Primary purple `#B620E0`, neon green success `#43FF00`, near-black background `#121212`.
- **Typography:** Inter for UI text, Manrope for display/headings.

## Tech Stack

- Expo SDK 57
- Expo Router (file-based routing)
- React 19 / React Native 0.86
- TypeScript
- Zustand + expo-secure-store (auth & session)
- Axios (API client)
- react-native-chart-kit (analytics)
- expo-image-picker, expo-camera, expo-notifications (Expo Go-compatible native features)

## Project Structure

```
app/
  (auth)/           # Auth stack: get started, sign in/up, OTP, forgot/reset password
  (app)/
    user/           # Attendee tabs: For You, Resell, Wallet, Profile
    creator/        # Creator tabs: Home, Analytics, Profile
    events/[id].tsx # Event detail with ticket selection
    events/create.tsx # Create / edit event
    search.tsx      # Global search (events + people)
    profile-settings.tsx
    purchased-ticket.tsx
    payment-page.tsx
    wallet.tsx      # (tab)
    ...             # other stack screens for teams, guests, promo codes, etc.
components/ui/      # Shared design system components
store/              # Zustand stores
services/           # API client, storage helpers, mock data
constants/          # Colors, spacing, typography tokens
```

## Run in Expo Go

```bash
cd BlockTiks-Expo-Go
npm install
npx expo start --go
```

Then scan the QR code with the **Expo Go** app.

If the CLI asks you to sign in to Expo Go, make sure the Expo Go app on your phone is signed in with the same account.

## Verification

```bash
npx tsc --noEmit                  # Type check
npx expo export --platform web    # Verify the bundle builds
```

## Feature Mapping from Flutter

| Flutter Module | Expo Screen(s) |
|---|---|
| For You / Home | `app/(app)/user/index.tsx` |
| Resell / Marketplace / Asks / Bids | `app/(app)/user/resell.tsx` |
| Wallet | `app/(app)/user/wallet.tsx` |
| Profile Tab | `app/(app)/user/profile.tsx` |
| Creator Dashboard | `app/(app)/creator/index.tsx` |
| Analytics | `app/(app)/creator/analytics.tsx` + `app/(app)/analytics.tsx` |
| Search | `app/(app)/search.tsx` |
| Event Detail | `app/(app)/events/[id].tsx` |
| Create Event | `app/(app)/events/create.tsx` |
| Purchased Ticket / QR | `app/(app)/purchased-ticket.tsx` |
| Payment | `app/(app)/payment-page.tsx` |
| Transfer / Send Tickets | `app/(app)/transfer.tsx`, `app/(app)/send-tickets.tsx` |
| Place Bid / Ask Bid | `app/(app)/place-bid.tsx`, `app/(app)/ask-bid.tsx` |
| Notifications | `app/(app)/notifications.tsx` |
| Settings | `app/(app)/profile-settings.tsx` |
| Manage Teams / Guests / Scanner | `app/(app)/manage-teams.tsx`, `app/(app)/all-guests.tsx`, `app/(app)/scanner.tsx` |
| Promo Codes / Venue Layout | `app/(app)/promo-codes.tsx`, `app/(app)/venue-layout.tsx` |

## Known Limitations in Expo Go

- **Payments:** Card capture uses a placeholder form. Real Stripe / Apple Pay / Google Pay requires a development build.
- **Image cropping:** `expo-image-picker` supports basic editing; a dedicated native cropper requires a development build.
- **Push notifications:** Expo Go supports local notifications and Expo Push. FCM / custom push providers require a development build.
- **Firebase native SDKs:** require a development build if enabled later.

## Next Steps

1. Wire the real auth endpoints in `app/(auth)/sign-in.tsx` and `app/(auth)/sign-up.tsx`.
2. Replace mock event/ticket data in `services/data.ts` with API calls.
3. Add real payment flow via Stripe in a development build if needed.
4. Configure EAS Build / EAS Update for store distribution.
