---
version: 2.0
name: BlockTiks-design-system
description: |
  Luma-minimal design system for BlockTiks, an event-ticketing and resale
  marketplace. Near-black canvas, photography-led event cards, one electric
  violet accent used sparingly, white pill CTAs, Manrope display type over
  Inter body. Restrained like Luma, warm through the event imagery itself.

colors:
  primary: "#7c5cff"
  primary-bright: "#9b85ff"
  primary-deep: "#6a4ae0"
  on-primary: "#ffffff"
  canvas: "#0a0a0b"
  surface: "#141416"
  elevated: "#1c1c1f"
  hairline: "rgba(255,255,255,0.08)"
  text-primary: "#f5f5f7"
  text-muted: "rgba(245,245,247,0.64)"
  text-dim: "rgba(245,245,247,0.4)"
  ink: "#0a0a0b"
  success: "#34c77b"
  error: "#ff5c5c"
  warning: "#ff9f43"
  info: "#5c8dff"

typography:
  display:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.03em
  heading1:
    fontFamily: Manrope
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.02em
  heading2:
    fontFamily: Manrope
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.27
    letterSpacing: -0.018em
  heading3:
    fontFamily: Manrope
    fontSize: 17px
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
  caption:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.38

rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  full: 9999px

spacing:
  xxs: 4px
  xs: 6px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  xxxl: 48px
  block: 64px
---

## Overview

BlockTiks is a social event-ticketing marketplace. The design language follows
**Luma**: dark, photography-led, restrained, with big event imagery doing the
emotional work while the chrome stays quiet. A single violet accent
(`#7c5cff`) marks interactivity — active filters, links, live states — and is
never used as a full-bleed button surface. The primary CTA is always a white
pill with ink text.

The previous Revolut-derived system (true-black canvas, cobalt `#494fdf`,
marketing-site spacing) read as fintech-brochure, not events. This system
keeps the dark-first canvas but replaces the austerity with warmth carried by
event photography, avatar stacks, and generous 24px section rhythm.

**Key characteristics:**

- Dark-only canvas: `#0a0a0b` background, `#141416` cards, `#1c1c1f` elevated.
- Manrope (700/600) for display and headings; Inter (400/500/600) for body and UI.
- White pill primary buttons; violet accent reserved for active/selected/live states.
- Poster-forward event cards — image fills the card, scrim only at bottom.
- One accent per screen; neutrals carry the rest.

## Colors

### Brand

- **Primary** (`#7c5cff`): the single accent. Active chips, selected states,
  links, "live" indicators, focus rings. Never a button background.
- **Primary Bright** (`#9b85ff`): hover/pressed tint of the accent.
- **Primary Deep** (`#6a4ae0`): pressed state.
- **On Primary** (`#ffffff`): text/icons on accent surfaces.

### Surfaces

- **Canvas** (`#0a0a0b`): app background. Not pure black — Luma-style near-black.
- **Surface** (`#141416`): cards, inputs, tab bar.
- **Elevated** (`#1c1c1f`): pressed cards, sheets, modals.
- **Hairline** (`rgba(255,255,255,0.08)`): the only divider treatment.

### Text

- **Primary** (`#f5f5f7`): headings and body — slightly warm off-white.
- **Muted** (`rgba(245,245,247,0.64)`): secondary text, metadata.
- **Dim** (`rgba(245,245,247,0.4)`): tertiary, placeholders, disabled.
- **Ink** (`#0a0a0b`): text on white/light surfaces (primary buttons, QR).

### Semantic

- **Success** (`#34c77b`), **Error** (`#ff5c5c`), **Warning** (`#ff9f43`),
  **Info** (`#5c8dff`). Used for status only, never decoration.

## Typography

- **Manrope** carries display, heading1–3. Tight negative tracking on display
  sizes (-0.03em at 40px, easing to 0 by 17px).
- **Inter** carries body, bodySmall, caption, labels. No positive tracking —
  the previous mechanical 0.24px tracking is gone.
- Hierarchy: display 40 → heading1 30 → heading2 22 → heading3 17 → body 16 →
  bodySmall 14 → caption 13. One display element per screen max.

## Layout

- 4px base unit; working scale 4/6/8/12/16/24/32/48.
- Screen padding: 16px horizontal, 24px vertical rhythm between sections.
- Cards: 16px radius (`lg`), images 12px (`md`), buttons full pill.
- Poster cards: image fills the card edge-to-edge; a bottom scrim carries
  price + title only.

## Components

- **Primary button**: white pill, ink text, 48px tall, Manrope 600.
- **Secondary**: elevated surface (`#1c1c1f`) pill.
- **Outline**: transparent with hairline border.
- **Accent usage**: selected chips invert to white-on-ink or violet tint;
  active filter = white pill (keeps Luma's monochrome restraint).
- **Event card**: full-bleed poster, bottom gradient scrim, price pill,
  date chip top-right.
- **Ticket card**: event thumb + tier/qty meta + QR glyph; tap → ticket detail.

## Do / Don't

- Do let event photography carry color and mood.
- Do keep one violet accent element per screen.
- Don't use the accent as a button fill — CTAs stay white.
- Don't add drop shadows; depth comes from surface luminance steps.
- Don't introduce light-mode surfaces; the product is dark-only.
