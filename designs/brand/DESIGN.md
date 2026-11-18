# Sahra · سهرة — Brand & Design System

Version 1.0 · November 2026

---

## 1. The name

**Sahra (سهرة)** — *sah-ra*. The evening out: the hours after sunset when people gather for music, theatre, football, comedy, dinner, or simply each other. Every Arabic speaker knows the word, from Casablanca to Muscat, and it carries warmth rather than formality. In English it is short, easy to say, and has no conflicting meanings.

- Arabic: **سهرة**. Always written in full and never transliterated in Arabic contexts.
- Latin: **Sahra**, set in title case in running text and in tracked capitals **SAHRA** in the lockup.
- Verb-able: *"Where's the sahra tonight?"* / *"وين السهرة الليلة؟"*
- Tagline: **Your night starts here** · **سهرتك تبدأ هنا**

## 2. Philosophy

Sahra is a ticketing platform, but what people buy is the night itself. The brand has three beliefs:

1. **The ticket is a promise.** Paying for a ticket starts the anticipation. Our design should feel like holding a real ticket: tactile, warm and worth keeping.
2. **Arabic first, never Arabic-flavoured.** The identity is built from real Arabic letterforms, not from borrowed decoration such as domes, lanterns, crescents or arabesque patterns. It is cultural without being religious and regional without being touristic.
3. **Get out of the way.** Ticketing is stressful: queues, gates, sold-out shows. Outside the logo, the interface is calm, high-contrast and fast. The personality lives in the logo, the colour and the copy, not in UI chrome.

## 3. Logo

### 3.1 Anatomy
The logo is a **ticket stub**, a rounded rectangle with two half-circle notches, carrying the word **سهرة** in Ruqaa calligraphy. The word is the motif: the name printed on the admission ticket. There is no separate symbol.

- Ratio: 5 : 3 (160 × 96 units)
- Corner radius: 12 units
- Notches: radius 15 units, centred vertically on both short edges
- Wordmark: Aref Ruqaa Bold, 54 units, optically centred (baseline at 64 units)

### 3.2 Versions
| File | Use |
|---|---|
| `sahra-logo-gold.png` | **Primary.** Gold ticket, Night ink. Use on Night or dark photography. |
| `sahra-logo-night.png` | Night ticket, Gold ink. Use on Sand, white or light photography. |
| `sahra-lockup-on-night.png` | Stacked lockup with SAHRA, 1200×630 @2x. Social, OG images, splash. |
| `sahra-lockup-on-sand.png` | Stacked lockup on a light background. |
| `sahra-lockup-horizontal.png` | Ticket + SAHRA side by side, transparent. Web header, email, partner co-branding. |
| `sahra-app-icon-1024.png` | **Primary app icon.** Gold ticket on Night, square (the OS applies the mask). |
| `sahra-app-icon-alt-1024.png` | Alternate icon: calligraphy only on Gold, for in-app icon switching and favicons at ≥32px. |

### 3.3 Clear space
Keep a clear space equal to the **notch radius** (≈ 10% of the ticket width) on every side. Nothing enters this zone: text, edges or other logos.

### 3.4 Minimum size
- Ticket logo: 48 px / 12 mm wide. Below that, use the alternate calligraphy icon.
- Stacked lockup: 120 px / 30 mm wide.

### 3.5 Don'ts
- Don't add a crescent, star, dome, lantern or any religious or architectural motif.
- Don't recolour outside the palette or put the gold ticket on Sand (contrast is too low).
- Don't swap the calligraphy for another Arabic font, or typeset سهرة yourself. Always use the supplied artwork.
- Don't add perforation lines, stubs, barcodes or shadows to the logo.
- Don't stretch, rotate, outline or put the logo in a container shape.
- Don't use SAHRA without the ticket except in plain running text.

## 4. Colour

| Name | Arabic | Hex | RGB | Role |
|---|---|---|---|---|
| **Night** | ليل | `#16263B` | 22 38 59 | Primary dark. Backgrounds, text on light, primary buttons. |
| **Gold** | ذهب | `#F2D9A0` | 242 217 160 | Brand signature. The ticket, highlights, CTA on Night. |
| **Sand** | رمل | `#F7F1E6` | 247 241 230 | Light background and cards. Replaces pure white. |
| **Dune** | كثيب | `#ECE4D6` | 236 228 214 | Secondary light surface, dividers, skeleton loaders. |
| **Ink** | حبر | `#241C14` | 36 28 20 | Body text on Sand and Dune. |
| **Rumman** | رمّان | `#B8323A` | 184 50 58 | Accent and alerts only: "selling fast", errors, live. Use sparingly. |

**Proportion:** about 60% Night or Sand, 30% the opposite neutral, 8% Gold, 2% Rumman.

**Accessible pairs** (WCAG AA for body text): Night on Sand, Night on Gold, Gold on Night, Sand on Night, Ink on Sand, Sand on Rumman (large text only).
Never Gold on Sand, and never Rumman on Night for text.

**Dark mode** is the default for the event-discovery experience (it's a night brand). Checkout, account and receipts use light mode for legibility.

## 5. Typography

| Role | Arabic | Latin |
|---|---|---|
| Logo / display moments | **Aref Ruqaa** Bold (logo artwork only, plus big hero words like event-category titles) | **Bricolage Grotesque** 800 |
| Headlines | **IBM Plex Sans Arabic** SemiBold | **Bricolage Grotesque** 600–800 |
| UI & body | **IBM Plex Sans Arabic** Regular / Medium | **Bricolage Grotesque** 400 (UI), 16px min body |
| Numerals (prices, seats, dates) | Western numerals by default; Eastern Arabic (٠١٢٣) as a locale setting | Bricolage Grotesque tabular |

All are free on Google Fonts.

Rules:
- Ruqaa is for **display only**. It is never used for body text, buttons or anything smaller than 32px.
- Latin SAHRA in the lockup: Bricolage Grotesque SemiBold, tracking +0.32em.
- Arabic line-height is at least 1.6 for body text. Latin is 1.45.
- Never fake-bold or italicise Arabic.

## 6. Layout & RTL

- **RTL is the default.** Design in Arabic first, then mirror to English. Don't do it the other way round.
- Mirror direction-dependent icons (back, forward, progress). Never mirror media controls, clocks, phone numbers or logos.
- 8px spacing grid. Corner radius: 12px for cards (matching the ticket), 999px for chips and buttons, 22% for app-icon-style tiles.
- Ticket notches can be used as a **UI motif** only on actual ticket objects: tickets in the Tickets tab, order confirmation and the QR pass. They aren't decoration elsewhere.

## 7. Voice & tone

Sahra talks like a well-connected friend who always knows what's on: warm, quick and a little playful. It is never corporate and never slangy enough to exclude anyone. Arabic copy uses friendly Modern Standard Arabic (فصحى مبسطة), with light Gulf or Levantine touches allowed in marketing for local campaigns.

| Situation | ✅ Do | ❌ Don't |
|---|---|---|
| Empty state | "Nothing booked yet. Your next sahra is waiting." / "لا حجوزات بعد — سهرتك القادمة بانتظارك" | "You have 0 tickets." |
| Purchase success | "You're in. See you there." / "تم! نشوفك هناك" | "Transaction completed successfully." |
| Sold out | "Sold out. Want us to tell you if seats open up?" | "Error: no inventory." |
| Urgency | "Selling fast" | "HURRY!!! LAST CHANCE!!!" |

Write in second person and keep sentences short. Be specific about time, place and seat. Never use emoji in product UI.

## 8. Imagery

- Real events and real crowds from the region, shot at night: stage light, phone torches, stadium floodlights, café glow.
- Warm grade. Lift the blacks slightly towards Night (#16263B) and push the highlights towards Gold.
- Faces are welcome, and cultural diversity across the region (Gulf, Levant, Maghreb, Egypt) should be visible.
- No stock clichés: camels, desert dunes at sunset, mosque silhouettes or generic "Arabian" patterns.

## 9. Iconography

- Line icons with a 1.75px stroke on a 24px grid, round caps and joins, and 12px-radius-friendly forms.
- Use a single weight. Filled versions are only for the active tab state.
- Recommended base set: Phosphor Regular or Lucide, recoloured to the palette.

## 10. Applications

- **App icon:** the gold ticket on Night. The alternate calligraphy icon is offered as an in-app option.
- **QR pass (Tickets tab):** a Night card with notches, the gold logo at the top, event title in Plex Arabic SemiBold, and a QR on a Sand panel.
- **Wristbands and physical tickets:** a gold stock with the Night logo, and the event and seat printed in Ink.
- **Social:** stacked lockup on Night, with event photography graded per §8.

## 11. File index

```
brand/
├── DESIGN.md                      ← this document
└── png/
    ├── sahra-logo-gold.png        1600×960, transparent
    ├── sahra-logo-night.png       1600×960, transparent
    ├── sahra-lockup-on-night.png  2400×1260
    ├── sahra-lockup-on-sand.png   2400×1260
    ├── sahra-lockup-horizontal.png 2000×600, transparent
    ├── sahra-app-icon-1024.png    1024×1024
    └── sahra-app-icon-alt-1024.png 1024×1024
```

Visual guidelines: `Sahra Brand Guidelines.dc.html`. Source artwork: `Sahra Logo Exports.dc.html`.

> Before launch: run trademark clearance for "Sahra / سهرة" in Classes 9, 35, 41 and 42 in the target markets (UAE, KSA, Egypt, Jordan, Qatar, Kuwait, Bahrain, Oman, Morocco), and secure domains and social handles.
