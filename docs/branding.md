# Branding Guidelines

## Brand Concept

Horde treats every PHP version, database instance, and dev server as something that can be **summoned, animated, and put back to rest** — not just "started" and "stopped." The skull-and-glyph mark, the dormant/risen language, and the single ember accent color all exist to make that idea felt at a glance, without turning a professional devtool into a costume. Restraint matters here: the theme should live in the _mark_, the _tagline_, and _status language_ — not in verbs on every button.

## Logo

The Horde logo is a stylized skull with an engraved "H" on its forehead — a ward, not a decoration — symbolizing the power to resurrect and animate development services at will. Treat it as a sigil: legible at a glance, quiet at rest, and only ever "lit" (accent-colored) when it's marking something genuinely active.

### Variations

| File                         | Format                 | Use Case                       |
| ---------------------------- | ---------------------- | ------------------------------ |
| `horde_logo.svg`             | SVG                    | UI rendering (header, favicon) |
| `horde_icon.ico`             | ICO (multi-res)        | Windows app icon, system tray  |
| `horde_logo.png`             | PNG (1095×1095)        | General raster use             |
| `horde_logo_transparent.png` | PNG (1095×1095, alpha) | Dark backgrounds, overlays     |

### Minimum Size

- **16×16 px** — System tray (the `.ico` embed handles resizing; avoid using SVG at this size)
- **22×22 px** — App header (inline SVG via `HordeLogo` component)
- **48×48 px** — Dialog headers, about panel
- **256×256 px** — Installer icon

### Clearspace

Maintain padding of at least 25% of the logo's rendered size on all sides. Never place text, buttons, or other UI elements directly against the logo — the sigil needs room to breathe, not to be crowded by chrome.

### Do Not

- Stretch, skew, or rotate the logo
- Change the skull silhouette or the "H" engraving
- Recolor the logo with colours outside the brand palette
- Use the logo as a loading spinner or decorative background pattern — it marks _state_ (dormant/risen), not motion

## Tagline

> **Resurrect and animate your dev services**

### Usage

- Dashboard hero text
- Installer splash
- About dialog
- Documentation footer

Keep the tagline on a single line. Use sentence case. Pair with the logo when feasible. This is the theme's one guaranteed appearance in every surface — resist adding a second tagline-like phrase elsewhere; one incantation is enough.

## Status Language

Beyond the tagline, the motif shows up in how services describe their own state. Two states only — don't invent a third:

| State       | UI copy example                | Visual treatment                        |
| ----------- | ------------------------------ | --------------------------------------- |
| **Dormant** | "No active version", "Dormant" | Muted/gray sigil, neutral text          |
| **Risen**   | "Risen: PHP 8.4.23"            | Ember-accent sigil, accent-colored text |

This applies to PHP versions, database instances, and dev servers — anywhere a service has a real on/off lifecycle. Do **not** extend the vocabulary to buttons or actions (no "Summon PHP", no "Banish instance") — the audience is professional developers, and verb-level cosplay undercuts the tool's credibility. Nouns and status words carry the theme; verbs stay plain ("Start", "Stop", "Manage").

## Colour Palette

| Swatch                                               | Hex               | Role                                                                                                                                                                                                                         |
| ---------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ![#F97316](https://placehold.co/16x16/F97316/F97316) | `#F97316`         | **Primary brand colour** (ember orange). Reserved for "risen" states — active sigils, active status text, glow on the logo when something is running. Not a generic accent; if nothing is running, nothing should be orange. |
| ![#0A0A0A](https://placehold.co/16x16/0A0A0A/0A0A0A) | varies with theme | **Background** — dark/light via shadcn-vue theme tokens (`bg-background`, `bg-card`, etc.)                                                                                                                                   |
| ![#--](https://placehold.co/16x16/FFFFFF/FFFFFF)     | varies with theme | **Foreground** — `text-foreground`, `text-muted-foreground` from the shadcn-vue theme                                                                                                                                        |

The logo SVG renders in `currentColor` by default, inheriting the current text colour. In its dormant state it should sit at `text-muted-foreground`; when marking a risen service, it switches to the ember accent. This ensures it adapts to both light and dark themes without modification, and doubles as a live status indicator rather than a static mark.

## Typography

Horde uses the system font stack configured by Tailwind CSS:

```css
font-family:
  "Inter",
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  Roboto,
  sans-serif;
```

- **Headers:** `font-semibold` or `font-bold`, `tracking-tight`
- **Body:** default weight, `text-sm` for secondary content
- **Code / monospace:** `font-mono` for paths, versions, terminal output
- **Brand name:** Always title-case "Horde", never "horde" or "HORDE"

## App Icon

The Windows installer and system tray use `resources/horde_icon.ico`, a multi-resolution `.ico` file containing the skull logo. Electron's `nativeImage.createFromPath()` automatically selects the appropriate resolution for each context (16×16 for tray, 48×48 for taskbar, 256×256 for the installer). The tray icon should switch between its dormant and risen treatment based on whether any service is currently active — the one place the theme is allowed to be genuinely functional, not just decorative.

## App Name

- **Application:** Horde
- **Package:** `com.zentaichi.horde`
- **Executable:** Horde.exe
- **Short description:** Your local PHP & DB manager — resurrected on demand
