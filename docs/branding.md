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

- **16×16 px** — System tray (the `.ico` embed handles resizing; avoid using SVG at this size), and the sanctioned **inline tier**: the aggregate status sigil in the app header, and per-row sigils in dense lists
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

- **Dashboard hero text** — the only placement currently built (`src/pages/DashboardPage.vue`)

> **Not yet built:** the installer splash, the about dialog, and the
> documentation footer are all listed in the original design intent but have
> no implementation. Treat them as planned, not shipped.

Keep the tagline on a single line. Use sentence case. Pair with the logo when feasible. Resist adding a second tagline-like phrase elsewhere; one incantation is enough.

## Status Language

Beyond the tagline, the motif shows up in how services describe their own state. Three states only — don't invent a fourth:

| State       | UI copy             | Visual treatment                    |
| ----------- | ------------------- | ----------------------------------- |
| **Absent**  | "Not installed"     | Muted/gray sigil, no badge emphasis |
| **Dormant** | "Dormant"           | Muted/gray sigil, neutral text      |
| **Risen**   | "Risen · _context_" | Ember-accent sigil, ember text      |

The _context_ on a risen badge is machine data and must render in mono — a port, a version. The word itself stays sans.

### What the vocabulary does and does not cover

The three states describe **a service with a real on/off lifecycle**. That is the whole test: if a thing can be _running_, it can be risen; if it is _installed but idle_, it can be dormant; if it is _not there_, it is absent.

This applies to PHP versions and database instances. It does **not** apply to:

- **Installed artefacts** — the CLI shim, and a trusted root CA. A trusted certificate authority is not "risen"; it is trusted or it is not. Say so in plain words ("Root CA trusted") and give it no sigil. The exclusion of the CLI's Installed/Not installed applies here for the same reason.
- **Config toggles** — per-site SSL, extension enablement, autostart. These are Enabled/Disabled or On/Off. Never Risen/Dormant.
- **Actions and verbs** — no "Summon PHP", no "Banish instance". The audience is professional developers, and verb-level cosplay undercuts the tool's credibility. Nouns and status words carry the theme; verbs stay plain ("Start", "Stop", "Install", "Uninstall", "Manage").

**Dev servers are a deliberate exception to the dormant tier.** `DevServerManager` tracks servers in an in-memory map and `stop()` deletes the entry, so a stopped dev server leaves nothing behind to distinguish it from one that never started. Dev servers therefore read as risen or absent, and the UI must not synthesise a dormant state the main process cannot back. An aggregate over a _group_ of services can still be dormant — whether any one member is running is a different question.

### The sigil marks lifecycle, never identity

The sigil belongs only on a surface that reports a service's lifecycle state. It is not a general-purpose status dot and it is not decoration. A project catalogue, an extension list, a CLI install, and a trusted CA all get no sigil. Where a card has no lifecycle to report, having no sigil is the correct outcome, not a gap to fill.

Ember is **local to its surface**, with one exception: the header sigil in `App.vue` is _aggregate_ — it reports whether anything Horde manages is currently serving (database instances, dev servers, or the reverse proxy). It is a separate 16px sigil beside the wordmark; the 30px brand logo stays a static mark and is never itself an indicator.

### Consistency is a release blocker

Before shipping, verify:

1. **No ember outside a risen state.** Grep `text-ember`, `border-ember`, and `bg-ember` across `src/`. Every hit must be reachable from a `risen` boolean. Focus rings, links, borders, and interactive-but-not-running elements stay neutral — ember is a _signal_, not a general accent.
2. **Badge text always conveys state, in both themes.** Colour is reinforcement, never the only carrier. A state distinguishable by hue alone has failed.
3. **No raw palette colours on status surfaces.** Use tokens — `--ember`, `--dormant`, `--success`, and the shadcn neutrals. A hand-rolled `text-green-600 dark:text-green-400` pair means two unverified themes.
4. **Mono for machine data** — versions, ports, paths, domains, SQL, logs. Labels and body copy stay sans.

## Colour Palette

| Swatch                                               | Hex               | Role                                                                                                                                                                                                                         |
| ---------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ![#F97316](https://placehold.co/16x16/F97316/F97316) | `#F97316`         | **Primary brand colour** (ember orange). Reserved for "risen" states — active sigils, active status text, glow on the logo when something is running. Not a generic accent; if nothing is running, nothing should be orange. |
| ![#0A0A0A](https://placehold.co/16x16/0A0A0A/0A0A0A) | varies with theme | **Background** — dark/light via shadcn-vue theme tokens (`bg-background`, `bg-card`, etc.)                                                                                                                                   |
| ![#--](https://placehold.co/16x16/FFFFFF/FFFFFF)     | varies with theme | **Foreground** — `text-foreground`, `text-muted-foreground` from the shadcn-vue theme                                                                                                                                        |

The logo SVG renders in `currentColor` by default, inheriting the current text colour. In its dormant state it sits at `--dormant`; when marking a risen service, it switches to the ember accent. This ensures it adapts to both light and dark themes without modification, and doubles as a live status indicator rather than a static mark.

### Ember is theme-split

`#F97316` is the brand ember and the dark-theme value. It is **not** the light-theme value: on white it measures 2.80:1 and fails WCAG 1.4.11 (3:1 for non-text). The light theme therefore uses a darker ember of the same hue, and the token does the splitting so no component ever hard-codes a hex.

| Token       | Light                                 | Dark                                    | Contrast                                   |
| ----------- | ------------------------------------- | --------------------------------------- | ------------------------------------------ |
| `--ember`   | `oklch(0.576 0.157 47.6)` (`#c05502`) | `oklch(0.7049 0.1867 47.6)` (`#F97316`) | 4.63:1 on white · 7.00:1 on `--background` |
| `--dormant` | alias of `--muted-foreground`         | alias of `--muted-foreground`           | 4.74:1 / 6.84:1                            |
| `--success` | `oklch(0.52 0.13 150)`                | `oklch(0.75 0.15 150)`                  | 5.19:1 on white · 8.41:1 on `--card`       |

`--success` confirms a completed action (a scan that found a version). It is not a service state and never takes a sigil — it exists so confirmation text stops needing a raw `text-green-500`, which failed contrast on white.

**Never place ember text on `--ember-dim`.** The 14% wash drops light to 4.11:1 and dark to 3.62:1, failing AA for text. A dim wash is for fills behind _neutral_ text only.

`--primary` and `--ring` are deliberately **neutral**. Ember is a parallel axis, not a re-skin of primary; re-skinning primary would also repaint the extension toggles and `Progress.vue`.

## Typography

Horde uses the Geist font stack, configured by Tailwind CSS via the shadcn-vue
`font` option (`components.json` → `"font": "geist-sans"`):

```css
font-family:
  "Geist",
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  Roboto,
  sans-serif;
```

> This section previously claimed Inter, which the app has never loaded. If you
> change the font, change `components.json` and `src/assets/tailwind.css`
> together — this file is documentation, not the source of truth.

- **Headers:** `font-semibold` or `font-bold`, `tracking-tight`
- **Body:** default weight, `text-sm` for secondary content
- **Code / monospace:** `font-mono` for versions, ports, paths, domains, terminal output — anything machine-generated
- **Brand name:** Always title-case "Horde", never "horde" or "HORDE"

## App Icon

The Windows installer and system tray use `resources/horde_icon.ico`, a multi-resolution `.ico` file containing the skull logo. Electron's `nativeImage.createFromPath()` automatically selects the appropriate resolution for each context (16×16 for tray, 48×48 for taskbar, 256×256 for the installer).

> **Not implemented:** a dormant/risen tray treatment. The intent is for the tray icon to reflect whether any service is active — the one place the theme is allowed to be genuinely functional rather than decorative — but `electron/tray.ts` builds a static icon once via `createTrayIcon()` and never varies it. Treat this as a known gap, not existing behaviour. The in-app header sigil is where the aggregate signal currently lives.

## App Name

- **Application:** Horde
- **Package:** `com.zentaichi.horde`
- **Executable:** Horde.exe
- **Short description:** Your local PHP & DB manager — resurrected on demand
