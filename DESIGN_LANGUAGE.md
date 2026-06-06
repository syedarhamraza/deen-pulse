# Deen Pulse — Design Language Specification

This document defines the unified **"Obsidian Mint"** design system and visual language shared between the **React Native Phone App** and the **Wear OS Watch App**.

---

## 1. Visual Theme: "Obsidian Mint"
The design language is characterized by an ultra-premium, dark-mode-only aesthetics, featuring **deep slate/midnight backdrops**, **sleek mint-green accents**, **subtle borders (glassmorphism)**, and **mint-glow text shadows**.

---

## 2. Color Palette Tokens

### Primary Colors
| Token Name | Hex Code | Android / CSS Value | Description |
| :--- | :--- | :--- | :--- |
| **Obsidian Dark** | `#0B0F12` | `rgb(11, 15, 18)` | App-wide screen background |
| **Midnight Gray** | `#111417` | `rgb(17, 20, 23)` | Card layers, containers, modals, watch surface |
| **Mint Accent** | `#00E8A2` | `rgb(0, 232, 162)` | Highlights, countdown clocks, primary controls |

### Text Colors & Opacities
| Token Name | Value / Opacity | Usage |
| :--- | :--- | :--- |
| **Text Primary** | `#FFFFFF` (100% white) | Screen titles, prayer names, selected states |
| **Text Secondary**| `rgba(255, 255, 255, 0.7)` | Body texts, options labels, descriptions |
| **Text Muted** | `rgba(255, 255, 255, 0.4)` | Subtitles, disabled tabs, elapsed indicators |

### Mint Accent Overlays
| Token Name | Opacity | Usage |
| :--- | :--- | :--- |
| **Mint Glow 8** | `rgba(0, 232, 162, 0.08)` | Selected item backdrops, badge wrappers |
| **Mint Active 15**| `rgba(0, 232, 162, 0.15)` | Primary call-to-actions, tag buttons |
| **Mint Border 25**| `rgba(0, 232, 162, 0.25)` | Card and modal borders (glassmorphism edge) |

---

## 3. Border Radiuses (Obsidian Geometry)

We enforce a consistent rounding system to keep the layout feeling premium and organic:

| Radius Token | Value | Applied Components |
| :--- | :---: | :--- |
| **Badge Pill** | `8px` | Beta badges, confirmation actions |
| **Soft Rounded** | `12px` | Settings options, images, minor elements |
| **Card / Screen Container**| `16px` | Settings cards, about cards, onboarding guide cards |
| **Dashboard Card** | `20px` | Main Dashboard calendar block, skeleton placeholders |
| **Watch Card** | `24px` | Wear OS compose list items, watch progress widgets |
| **Modal / Dialog Sheets**| `28px` | Slide-up option sheets, picker menus |
| **Fully Circular** | `50%` | Close buttons, header control circles, countdown ring overlays |

---

## 4. Shadows & Glows

To create depth in a dark interface, we use **Mint-themed shadow glows** instead of generic black drop shadows:

### Modal Sheet Drop Shadow (Phone)
- **Color**: `#00E8A2` (Mint Green)
- **Offset**: `{ width: 0, height: 8 }`
- **Opacity**: `0.2`
- **Radius**: `20`
- **Elevation (Android)**: `8`

### Alert Modal Glow (Phone)
- **Color**: `#00E8A2`
- **Offset**: `{ width: 0, height: 4 }`
- **Opacity**: `0.3`
- **Radius**: `10`
- **Elevation**: `8`

### Text Glow (Countdown Timer)
- **Shadow Color**: `rgba(0, 232, 162, 0.35)`
- **Offset**: `{ width: 0, height: 0 }`
- **Radius**: `10`

---

## 5. Spacing & Layout Rules

### Phone App Layout Grid
- **Screen Margin (Sides)**: `24px` horizontal padding for headers and scrolling layouts.
- **Card Spacing**: `12px` vertical margin between list elements.
- **Inner Card Padding**: `16px` or `20px` to keep texts comfortable.
- **Dashboard Inner Ring Spacing**: `30px` vertical margins around circular widgets.

### Watch App Layout Grid (Responsive Scaling)
- **Horizontal Screen Padding**: `8px` left and right (to prevent text clipping on round bezels).
- **List Vertical Padding**: `40px` bottom (allows the last card to scroll past circular screens).
- **Card Spacing**: `2px` vertical margin between list cards.
- **Progress Ring Dimensions**: Scales dynamically to **72%** of screen width (`LocalConfiguration.current.screenWidthDp * 0.72f`).
- **Layout centering spacer**: derived dynamically as `(screenHeight - ringSize) / 2` to keep the UI perfectly balanced on round screens.

---

## 6. Typography & Letter Spacings

All apps utilize **Inter** (fallback system default) with high contrast weights:

| Weight Token | Weight Value | Applied Components |
| :--- | :--- | :--- |
| **Ultra Bold** | `800` | Main application titles, onboarding numbers |
| **Bold** | `700` | Card labels, confirmation button titles |
| **Semi-Bold** | `600` | Values, selected status bar list names |
| **Light** | `300` | Big countdown numbers (keeps the display looking clean) |

### Accent Spacings
- **Countdown Display Subheaders**: `letterSpacing: 4`, uppercase (creates a precise, technical look).
- **Tab Dividers**: `letterSpacing: 2`, `fontSize: 11` (for dividing headings like `"TODAY'S PRAYERS"`).

---

## 7. Motion & Transitions

- **Screen Transitions**: Parallel fading (`fadeAnim`: 0 ➔ 1 over `300ms`) and sliding (`translateY`: 25 ➔ 0 with spring damping `24`).
- **Interactive States**: Hover/Press effects scale elements to `0.98` or `0.95` scale to simulate mechanical button depth.
- **Notification Updates**: Chronometer is delegated to the native OS countdown thread, which dynamically updates every second with zero app background process footprint.

---

## 8. Layout Parity & Component Rendering Rules

To ensure a seamless, pixel-perfect visual design across mobile and watch form factors, we enforce the following rules:

### Solid Card Background Rule (Shadow Bleed Prevention)
- **Problem**: Applying Android `elevation` shadows to semi-transparent `rgba` view backgrounds causes the OS shadow engine to bleed a dark rectangular box artifact through the transparency.
- **Rule**: All elements utilizing shadow elevation MUST use solid backgrounds (e.g., `#111417` card base, `#141D20` active emerald tint, or `#0B0F12` circle base) to mask rendering glitches.

### Checklist Column Spacer Rule (Pixel-Perfect Grid)
- **Problem**: Removing left checklist indicators on active rows shifts the rest of the elements horizontally, breaking the vertical column grid.
- **Rule**: Active rows that omit checklist icons must render a matching alignment spacer (`checkIconSpacer` of `width: 14`, `marginRight: 12`) to keep custom sun/sky icons and text perfectly aligned with other rows.

### Dynamic Timezone Suffix
- **Rule**: All time displays (countdown subtexts and prayer card times) should dynamically display short timezone abbreviations (e.g. `(PKT)`) using the `getTimezoneAbbreviation` date utility to prevent double timezone labels when the API output already contains them.

### Split-Weight Branding Typography
- **Rule**: Screen header branding utilizes weight contrast: a Regular/Light weight segment followed by an Ultra-Bold highlighted segment (e.g., `Deen` in `400` + `Pulse` in `800` neon mint) with a glowing text shadow. Accent underlines are deprecated in favor of this clean typographic contrast.

---

## 9. Settings, Sub-Screens & Onboarding Consistency

To maintain absolute theme parity across all secondary pages, we enforce these guidelines:

### Solid Card Backgrounds
- **Background Rule**: Settings cards, feature listings, onboarding options, troubleshooting blocks, and step panels must use solid `#111417` (Midnight Gray) backgrounds. Muted borders should use `rgba(0, 232, 162, 0.15)`.

### Uniform Headers & Back Controls
- **Headers & Padding**: Sub-headers must use 24px horizontal padding (`paddingHorizontal: 24` or `paddingHorizontal: 20` if card margins match) to avoid horizontal jumpiness on navigation transitions.
- **Glassmorphic Back Button**: Back buttons must match `App.tsx` global styling: width `38`, height `38`, border radius `19`, background `rgba(255, 255, 255, 0.02)`, and a neon mint border tint `rgba(0, 232, 162, 0.15)`.
- **Haptic Scale Feedbacks**: Button pressed interactions must employ springy scale transforms (`scale: pressed ? 0.92 : 1` for small icons, and `scale: pressed ? 0.98 : 1` for action cards/buttons) to provide mechanical tactility.

---

## 10. Licensing & Open Source Notices

To align with the project's open-source distribution model, the following standards apply:

### Global Source File Headers
- **Rule**: Every source file (`.js`, `.jsx`, `.ts`, `.tsx`, `.kt`, `.java`) must contain the official GNU GPL v3.0 copyright comment block prepended at the top.

### Dashboard Screen Footer
- **Rule**: The main dashboard screen must feature a centered, muted footer containing developer credit and copyright information, followed by the text: `Licensed under GNU GPL v3.0`.
- **Interaction**: Tapping this footer must redirect the user to the official open-source GitHub repository.

### About Screen Link Cards
- **Rule**: The About screen must feature a dedicated License card styled as a standard `linkCard` alongside the "Source Code" card. 
- **Icon & Label**: Use a file icon (e.g. `file-text` in Feather icons) colored in Mint Accent (`#00E8A2`), with the title `License` and the subtitle `GNU GPL v3.0 (Open Source)`. Selecting this card must open the official GNU GPL v3.0 license web page.


