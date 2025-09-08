# Design System - Color Guidelines

## Muted Color Palette

To maintain a consistent, professional, and easy-on-the-eyes design throughout the RPG Manager, use these muted color guidelines:

### Primary Colors (Muted)
- **Slate**: Use for primary content, headers, and main UI elements
  - Light: `slate-50, slate-100, slate-200`
  - Medium: `slate-400, slate-500, slate-600`
  - Dark: `slate-700, slate-800, slate-900`

- **Stone**: Use for secondary content and neutral elements
  - Light: `stone-50, stone-100, stone-200`
  - Medium: `stone-400, stone-500, stone-600`
  - Dark: `stone-700, stone-800, stone-900`

### Accent Colors (Muted)
- **Blue-Gray**: For interactive elements
  - `slate-400` → `slate-500` (hover)
  - `slate-600` → `slate-700` (pressed)

- **Warm Gray**: For secondary actions
  - `stone-400` → `stone-500` (hover)
  - `stone-600` → `stone-700` (pressed)

### Semantic Colors (Muted)
- **Success**: `emerald-500/600` instead of bright green
- **Warning**: `amber-500/600` instead of bright yellow  
- **Error**: `red-500/600` instead of bright red
- **Info**: `sky-500/600` instead of bright blue

### Text Colors
```css
/* Headers */
text-slate-800 dark:text-slate-100

/* Body text */
text-slate-600 dark:text-slate-400

/* Secondary text */
text-slate-500 dark:text-slate-500

/* Muted text */
text-slate-400 dark:text-slate-600
```

### Background Colors
```css
/* Card backgrounds */
bg-slate-50 dark:bg-slate-900/20

/* Gradients */
bg-gradient-to-r from-slate-50 to-stone-50 dark:from-slate-900/20 dark:to-stone-900/20

/* Borders */
border-slate-200 dark:border-slate-700
```

### Button Colors
```css
/* Primary action */
bg-slate-500 hover:bg-slate-600 text-white

/* Secondary action */
bg-stone-400 hover:bg-stone-500 text-white

/* Destructive action */
bg-red-500 hover:bg-red-600 text-white

/* Success action */
bg-emerald-500 hover:bg-emerald-600 text-white
```

## How to Ensure Muted Colors

### 1. **Avoid These Bright Colors:**
- `yellow-*` (use `amber-*` instead)
- `blue-*` numbers above 600 (use `slate-*` or `sky-*`)
- `green-*` (use `emerald-*` instead)
- `purple-*` (use `violet-*` or `slate-*`)
- `pink-*` (use `rose-*` in moderation)

### 2. **Stick to These Palettes:**
- **Neutrals**: `slate-*`, `stone-*`, `gray-*`
- **Blues**: `sky-*`, `slate-*` 
- **Greens**: `emerald-*`, `teal-*`
- **Reds**: `red-*` (but use 500-600 range)
- **Yellows**: `amber-*`, `orange-*`

### 3. **Color Intensity Rules:**
- **Light mode**: Use 400-600 range for most elements
- **Dark mode**: Use 300-500 range for better contrast
- **Avoid**: 100-300 in light mode, 700-900 in dark mode (too extreme)

### 4. **Quick Replacements:**
```
❌ bg-blue-100  →  ✅ bg-slate-100
❌ bg-yellow-500  →  ✅ bg-amber-500
❌ text-blue-800  →  ✅ text-slate-700
❌ border-blue-200  →  ✅ border-slate-200
```

### 5. **Design Principles:**
- **Hierarchy**: Use color intensity to show importance, not bright colors
- **Accessibility**: Muted colors often have better contrast ratios
- **Professional**: Muted palettes look more sophisticated
- **Eye strain**: Easier to read for long sessions

## Implementation Checklist

When adding new components:
- [ ] Use `slate-*` or `stone-*` for neutrals
- [ ] Replace any `yellow-*` with `amber-*`
- [ ] Use `emerald-*` instead of `green-*`
- [ ] Keep color numbers in 400-600 range
- [ ] Test in both light and dark modes
- [ ] Ensure sufficient contrast for accessibility

This design system will keep your RPG Manager looking clean, professional, and easy on the eyes during those long campaign planning sessions!
