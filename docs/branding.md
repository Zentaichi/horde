# Branding Guidelines

## Logo

The Horde logo is a stylized skull with an engraved "H" on its forehead, symbolising the power to resurrect and animate development services at will.

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

Maintain padding of at least 25% of the logo's rendered size on all sides. Never place text, buttons, or other UI elements directly against the logo.

### Do Not

- Stretch, skew, or rotate the logo
- Change the skull silhouette or the "H" engraving
- Recolor the logo with colours outside the brand palette
- Use the logo as a loading spinner or decorative background pattern

## Tagline

> **Resurrect and animate your dev services**

### Usage

- Dashboard hero text
- Installer splash
- About dialog
- Documentation footer

Keep the tagline on a single line. Use sentence case. Pair with the logo when feasible.

## Colour Palette

| Swatch                                               | Hex               | Role                                                                                       |
| ---------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| ![#F97316](https://placehold.co/16x16/F97316/F97316) | `#F97316`         | **Primary brand colour** (orange). Accent elements, active states, logo glow.              |
| ![#0A0A0A](https://placehold.co/16x16/0A0A0A/0A0A0A) | varies with theme | **Background** — dark/light via shadcn-vue theme tokens (`bg-background`, `bg-card`, etc.) |
| ![#--](https://placehold.co/16x16/FFFFFF/FFFFFF)     | varies with theme | **Foreground** — `text-foreground`, `text-muted-foreground` from the shadcn-vue theme      |

The logo SVG renders in `currentColor` by default, inheriting the current text colour. This ensures it adapts to both light and dark themes without modification.

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

The Windows installer and system tray use `resources/horde_icon.ico`, a multi-resolution `.ico` file containing the skull logo. Electron's `nativeImage.createFromPath()` automatically selects the appropriate resolution for each context (16×16 for tray, 48×48 for taskbar, 256×256 for the installer).

## App Name

- **Application:** Horde
- **Package:** `com.zentaichi.horde`
- **Executable:** Horde.exe
- **Short description:** Your local PHP & DB manager
