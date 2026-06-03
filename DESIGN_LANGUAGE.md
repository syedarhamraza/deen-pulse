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
| **Obsidian Dark** | `#080B14` | `rgb(8, 11, 20)` | App-wide screen background |
| **Midnight Gray** | `#111827` | `rgb(17, 24, 39)` | Card layers, containers, modals, watch surface |
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
