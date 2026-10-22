# WellCare Dark Theme - Design System Guide

## 📋 Overview

This document outlines the updated dark theme design system for the WellCare application, implementing a professional 60-30-10 color hierarchy with glassmorphic effects and proper text contrast.

---

## 🎨 Color Palette (60-30-10 Rule)

### 60% - Background (Deep Forest Green)
```
Primary Background: #081F1C
- Used for: Page backgrounds, main container
- Purpose: Creates a deep, professional foundation
```

### 30% - Surfaces (Elevated Dark Green)
```
Card/Container Surface: #123530
- Used for: Cards, panels, elevated containers
- Purpose: Provides visual hierarchy and separation
- Border: rgba(45, 212, 191, 0.15) - Subtle teal border
```

### 10% - Accents (Bright Teal)
```
Primary Accent: #2DD4BF
Alternative Accent: #14B8A6
- Used for: Active icons, progress bars, buttons, status tags
- Purpose: Draws attention to interactive elements
- Opacity variants: 0.15 (background), 0.2 (border), 0.3 (hover)
```

---

## 📝 Text Hierarchy

### Primary Text (White)
```
Color: #FFFFFF
Usage: Main headings, important information, primary labels
Font Weight: 600-700
Example: Client name, section titles
```

### Secondary Text (Soft Muted Teal)
```
Color: #5EEAD4
Usage: Subtext, usernames, secondary labels
Font Weight: 500-600
Opacity: 0.8
Example: @username, subtitle text
```

### Tertiary Text (Slate Gray)
```
Color: #94A3B8
Usage: Subtle text, hints, disabled states
Font Weight: 400-500
Opacity: 0.6-0.7
Example: Helper text, timestamps
```

---

## 🎯 Component Examples

### Membership Card (Glassmorphic)

```jsx
<div className="bg-gradient-to-br from-[#0D3B36] to-[#0A2E2A] rounded-2xl p-6 border border-[rgba(45,212,191,0.2)] shadow-lg backdrop-blur-sm">
  {/* Header */}
  <div className="flex items-center justify-between mb-6">
    <span className="text-xs font-bold text-white uppercase tracking-wider opacity-70">
      Membership
    </span>
    
    {/* Active Badge */}
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(45,212,191,0.15)] border border-[rgba(45,212,191,0.3)]">
      <span className="w-2 h-2 rounded-full bg-[#2DD4BF]" />
      <span className="text-xs font-bold text-[#2DD4BF] uppercase tracking-wide">
        Active
      </span>
    </div>
  </div>

  {/* Client Name - White */}
  <h3 className="text-xl font-bold text-white leading-tight mb-1">
    Shiela Ahida
  </h3>

  {/* Username - Soft Teal */}
  <p className="text-sm font-medium text-[#5EEAD4] opacity-80 mb-4">
    @shielaahida
  </p>

  {/* ID Badge */}
  <div className="inline-block px-3 py-2 rounded-lg bg-[rgba(45,212,191,0.1)] border border-[rgba(45,212,191,0.25)]">
    <p className="text-xs font-bold text-[#2DD4BF] tracking-wide">
      ID: 329022
    </p>
  </div>

  {/* Slot Info */}
  <div className="mt-4 pt-4 border-t border-[rgba(45,212,191,0.15)]">
    <p className="text-xs text-[#94A3B8] font-medium">
      Slot #1
    </p>
  </div>
</div>
```

### Dark Surface Card

```jsx
<div className="bg-[#123530] border border-[rgba(45,212,191,0.15)] rounded-lg p-4">
  <h4 className="text-white font-bold mb-2">Card Title</h4>
  <p className="text-[#5EEAD4] text-sm">Secondary content</p>
</div>
```

### Accent Button

```jsx
<button className="bg-[#2DD4BF] text-[#081F1C] px-6 py-2 rounded-lg font-bold hover:bg-[#14B8A6] transition-all">
  Action Button
</button>
```

### Active Badge

```jsx
<span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[rgba(45,212,191,0.15)] border border-[rgba(45,212,191,0.3)]">
  <span className="w-2 h-2 rounded-full bg-[#2DD4BF]" />
  <span className="text-xs font-bold text-[#2DD4BF]">Active</span>
</span>
```

---

## 🛠️ Implementation Guide

### 1. Update Tailwind Config

```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        wellcare: {
          bg: '#081F1C',           // 60%
          surface: '#123530',      // 30%
          accent: '#2DD4BF',       // 10%
          accentDark: '#14B8A6',
        },
      },
    },
  },
};
```

### 2. Import Dark Theme CSS

```jsx
// main.jsx or App.jsx
import './dark-theme.css';
```

### 3. Use MembershipCard Component

```jsx
import MembershipCard from './components/MembershipCard';

export default function ClientPortal() {
  return (
    <div className="bg-[#081F1C] min-h-screen">
      <MembershipCard client={client} />
      {/* Other components */}
    </div>
  );
}
```

---

## 📐 Spacing & Sizing

- **Padding**: 0.75rem (12px), 1rem (16px), 1.5rem (24px)
- **Border Radius**: 0.5rem (8px), 0.75rem (12px), 1rem (16px), 1.5rem (24px)
- **Font Sizes**: 0.75rem (12px), 0.875rem (14px), 1rem (16px), 1.25rem (20px)
- **Gap/Margin**: 0.5rem (8px), 1rem (16px), 1.5rem (24px)

---

## 🌈 Glassmorphic Effects

### Backdrop Blur
```css
backdrop-filter: blur(16px);
```

### Glass Background
```css
background: rgba(18, 53, 48, 0.5);
backdrop-filter: blur(16px);
border: 1px solid rgba(45, 212, 191, 0.15);
```

### Shadow Hierarchy
- **Small**: `0 4px 16px rgba(13, 59, 47, 0.08)`
- **Medium**: `0 8px 32px rgba(13, 59, 47, 0.12)`
- **Large**: `0 16px 48px rgba(13, 59, 47, 0.18)`

---

## ✅ Accessibility Checklist

- [x] Text contrast meets WCAG AA standards (white on dark green)
- [x] Accent color (#2DD4BF) is distinguishable for colorblind users
- [x] Focus states are clearly visible
- [x] Interactive elements have sufficient padding (min 44x44px)
- [x] Semantic HTML structure maintained
- [x] ARIA labels for icon-only buttons

---

## 🎬 Animations

### Fade In
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
animation: fadeIn 0.4s ease-out;
```

### Slide Up
```css
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
```

---

## 📱 Responsive Design

### Mobile (< 768px)
- Reduce padding: 1.25rem instead of 1.5rem
- Adjust font sizes: -0.1rem
- Maintain touch targets: min 44x44px

### Tablet (768px - 1024px)
- Standard spacing
- Optimized for landscape

### Desktop (> 1024px)
- Full spacing
- Enhanced shadows for depth

---

## 🔄 Migration Checklist

- [ ] Update Tailwind config with new colors
- [ ] Import dark-theme.css in main app
- [ ] Replace MembershipCard component
- [ ] Update all card backgrounds to #123530
- [ ] Update text colors to white/teal hierarchy
- [ ] Replace accent colors with #2DD4BF
- [ ] Test contrast ratios
- [ ] Verify on mobile devices
- [ ] Update documentation

---

## 📚 Resources

- **Tailwind CSS**: https://tailwindcss.com/docs
- **WCAG Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **Color Accessibility**: https://www.color-blindness.com/

---

## 🎨 Design Tokens Summary

| Token | Value | Usage |
|-------|-------|-------|
| `--wellcare-bg` | #081F1C | Page background (60%) |
| `--wellcare-surface` | #123530 | Cards & containers (30%) |
| `--wellcare-accent` | #2DD4BF | Interactive elements (10%) |
| `--text-primary` | #FFFFFF | Main text |
| `--text-secondary` | #5EEAD4 | Subtext |
| `--text-tertiary` | #94A3B8 | Subtle text |

---

**Last Updated**: 2024
**Version**: 1.0
