# BlockTiks — Expo Go Version

A React Native + Expo SDK rewrite of the original Flutter `BlockTiks-Mobile-Application`, redesigned around the patterns used by **Luma**, **Partiful**, and **dice.fm**.

## Product purpose

BlockTiks is a premium event-ticketing and resale marketplace.

- **Fans** discover events, buy tickets in seconds, store them in a wallet, and resell or transfer them safely.
- **Creators** publish events, manage ticket tiers, promo codes, guest lists, and view real-time performance.

The UI is intentionally **content-first and commerce-simple**: big event posters, clear CTAs, upfront pricing, and fast checkout.

## Design approach

The design system is inspired by **Revolut** (installed via `getdesign`): high-contrast, near-black canvas, pill-shaped CTAs, generous whitespace, and a single cobalt-violet accent used sparingly. For an event app, that translates to:

- Immersive dark discovery feeds (like **dice.fm**).
- Clean event pages with social proof and a single "Get tickets" CTA (like **Luma**).
- Simple ticket-tier selection with transparent fees and fast checkout (like **Partiful** / **dice.fm**).
- A creator dashboard that surfaces revenue, live events, and quick actions in one place (like **Luma** host tools).

See `DESIGN.md` for the full token reference.

## Tech Stack

- Expo SDK 57
- Expo Router (file-based routing)
- React 19 / React Native 0.86
- TypeScript
- Zustand + `expo-secure-store` (auth & session)
- Axios (API client)
- `react-native-chart-kit` (analytics)
- `expo-image-picker`, `expo-camera`, `expo-notifications`

## Project Structure

```
app/
  (auth)/               # Get started, sign in/up, OTP, forgot/reset password
  (app)/
    user/               # Attendee tabs: For You, Resell, Wallet, Profile
    creator/            # Creator tabs: Home, Analytics, Profile
    events/[id].tsx     # Event detail
    events/[id]/tickets.tsx  # Ticket tier selection
    events/create.tsx   # Create event
    search.tsx          # Global search
    payment-page.tsx    # Checkout
    purchased-ticket.tsx
    wallet.tsx / withdraw.tsx / transfer.tsx / place-bid.tsx / ask-bid.tsx
    notifications.tsx / profile-settings.tsx / edit-profile.tsx / faqs.tsx
    ...                 # creator tools (teams, guests, scanner, promo codes, etc.)
components/ui/          # Shared design-system components
store/                  # Zustand stores
services/               # API client, storage helpers, mock data
constants/              # Colors, spacing, typography tokens
DESIGN.md               # Revolut-inspired design tokens
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

## Key UX changes from the first pass

1. **Discovery → dice.fm-style feed**: vertical poster cards, filter pills, location selector, minimal metadata.
2. **Event detail → Luma-style page**: hero image, date/venue/lineup, social proof, single sticky "Get tickets" CTA.
3. **Ticket purchase → Partiful/dice.fm-style tier selection**: selectable cards, quantity stepper, fees shown upfront, clear total.
4. **Wallet → Tickets / Wallet tabs**: tickets are the default; wallet balance and transactions live under the second tab.
5. **Creator dashboard → Luma host dashboard**: total revenue, live stats, quick actions, and your events list.
6. **Design system → Revolut-inspired tokens**: true-black canvas, elevated dark cards, white pill primary CTA, cobalt-violet accent.

## Known Expo Go Limitations

- **Payments:** The checkout form is a UI placeholder. Real Apple Pay / Google Pay / card capture requires an Expo **development build**.
- **Image cropping:** `expo-image-picker` supports basic editing only; a native cropper UI needs a development build.
- **Push notifications:** Expo Go supports local notifications and Expo Push. FCM / custom providers need a development build.

## Next Steps

1. Wire real auth endpoints in `app/(auth)/sign-in.tsx` and `app/(auth)/sign-up.tsx`.
2. Replace mock data in `services/data.ts` with API calls.
3. Add real payment flow via Stripe in a development build if needed.
4. Configure EAS Build / EAS Update for store distribution.
