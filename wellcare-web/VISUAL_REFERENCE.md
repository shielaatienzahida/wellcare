# WellCare UI/UX Refinement - Visual Reference Guide

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    HEADER (60px)                            │
│  [Logo] WELLCARE · Portal    [Bell] [Message] [Profile ▼]  │
└─────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│ SIDEBAR (240px)  │                                           │
│ ─────────────    │                                           │
│ • Home           │                                           │
│ • History        │         MAIN CONTENT AREA                │
│ • Messages       │                                           │
│ • Profile        │         [Cards, Forms, Data]             │
│ • Notifications  │                                           │
│ ─────────────    │                                           │
│ [Log Out]        │                                           │
└──────────────────┴───────────────────────────────────────────┘
                    ┌─────────────────────────────────┐
                    │  FLOATING BOTTOM NAV (Mobile)   │
                    │  [Home] [History] [Messages]    │
                    │  [Profile] [Notifications]      │
                    └─────────────────────────────────┘
```

---

## Component Hierarchy

### Header Component
```
Header (60px height)
├── Left Section
│   ├── Menu Button (9x9)
│   └── Logo Section
│       ├── Logo Image (36x36)
│       ├── "WELLCARE" Text
│       └── "· Portal" Label
└── Right Section
    ├── Notification Button (9x9)
    ├── Message Button (9x9)
    └── Profile Menu
        ├── Avatar (6x6)
        ├── Chevron Icon
        └── Dropdown Menu
            ├── User Info
            ├── Nav Items (Mobile)
            └── Log Out Button
```

### Main Content Area
```
Main Content
├── Welcome Banner
├── Stat Cards Grid
│   ├── Sessions Card
│   ├── Absences Card
│   └── Alkaline Uses Card
├── Therapy Banner
├── Last Seen Indicator
├── Recent Activity Section
│   └── Activity Items
├── Account Status Section
│   └── Info Rows
└── [Additional Sections]
```

### Bottom Navigation (Mobile)
```
Floating Navigation (56px height)
├── Home Icon + Label
├── History Icon + Label
├── Messages Icon + Label (with badge)
├── Profile Icon + Label
└── Notifications Icon + Label (with badge)
```

---

## Card Layouts

### Stat Card
```
┌─────────────────────────────┐
│ ┌──┐  Value                 │
│ │  │  Label                 │
│ └──┘                        │
└─────────────────────────────┘
Padding: 12px 14px
Border Radius: 12px
```

### Sessions/Alkaline Card
```
┌──────────────────────────────────┐
│ ┌────┐  Sessions                 │
│ │ 🟢 │  Total Check-ins: 45      │
│ └────┘  Wellness Attendance      │
└──────────────────────────────────┘
Padding: 16px 18px
Border Radius: 14px
```

### Info Card
```
┌──────────────────────────────────┐
│ Username          john_doe       │
│ ─────────────────────────────    │
│ Full Name         John Doe       │
│ ─────────────────────────────    │
│ Email             john@email.com │
│ ─────────────────────────────    │
│ Membership        ● Active       │
└──────────────────────────────────┘
Padding: 14px 16px
Border Radius: 12px
```

---

## Button Styles

### Primary Button
```
┌──────────────────────┐
│  Save Changes        │
└──────────────────────┘
Background: Emerald (#046a38)
Color: White
Padding: 10px 18px
Border Radius: 10px
Shadow: 0 4px 12px rgba(4,106,56,0.15)
Hover: Darker + increased shadow
```

### Secondary Button
```
┌──────────────────────┐
│  Cancel              │
└──────────────────────┘
Background: Light emerald
Border: 1.5px solid emerald/15
Color: Emerald
Padding: 10px 18px
Border Radius: 10px
Hover: Darker background
```

### Icon Button
```
┌────┐
│ 🔔 │
└────┘
Width: 40px
Height: 40px
Border Radius: 10px
Background: rgba(4,106,56,0.08)
Border: 1px solid rgba(4,106,56,0.12)
Hover: Scale 1.05 + darker background
```

---

## Dropdown Styling

### Hydration Dropdown
```
┌─────────────────────────────┐
│ Select Hydration Level  ▼   │
└─────────────────────────────┘
Border: 1.5px solid rgba(4,106,56,0.2)
Border Radius: 10px
Padding: 11px 14px (36px right for icon)
Background: rgba(255,255,255,0.9)
Icon: Custom SVG chevron-down
Hover: Enhanced border + shadow
Focus: 3px focus ring
```

### Profile Menu Dropdown
```
┌──────────────────────┐
│ John Doe             │
│ Member               │
├──────────────────────┤
│ 🏠 Home              │
│ 📋 History           │
│ 💬 Messages          │
│ 👤 Profile           │
│ 🔔 Notifications     │
├──────────────────────┤
│ 🚪 Log Out           │
└──────────────────────┘
Width: 208px (w-52)
Border Radius: 12px
Background: white/90
Backdrop: blur-2xl
```

---

## Color Palette Reference

### Primary Colors
```
Emerald Primary:    #046a38 ████████
Emerald Dark:       #064e3b ████████
Kelly Green:        #10b981 ████████
```

### Semantic Colors
```
Sessions (Green):   #2d8a00 ████████
Alkaline (Blue):    #0284c7 ████████
Success (Green):    #15803d ████████
Error (Red):        #dc2626 ████████
```

### Background Colors
```
Sand:               #f4fbf7 ████████
White:              #ffffff ████████
Overlay:            rgba(4,106,56,0.08) ████████
```

### Text Colors
```
Deep Emerald:       #022c22 ████████
Emerald 900:        #064e3b ████████
Muted:              #475569 ████████
Light:              #64748b ████████
```

---

## Spacing System

### Padding
```
xs: 4px
sm: 8px
md: 12px
lg: 16px
xl: 20px
2xl: 24px
```

### Gaps
```
xs: 4px
sm: 8px
md: 12px
lg: 14px
xl: 16px
2xl: 18px
```

### Margins
```
Header Bottom: 0px
Sidebar Top: 60px
Content Padding: 24px (desktop), 12px (mobile)
Bottom Nav Bottom: 16px
```

---

## Typography

### Font Family
```
Primary: Plus Jakarta Sans
Fallback: Inter
System: -apple-system, BlinkMacSystemFont, sans-serif
```

### Font Sizes
```
xs: 0.75rem (12px)
sm: 0.82rem (13px)
base: 0.88rem (14px)
lg: 1rem (16px)
xl: 1.05rem (17px)
2xl: 1.2rem (19px)
3xl: 1.4rem (22px)
```

### Font Weights
```
Regular: 400
Medium: 500
Semibold: 600
Bold: 700
Extrabold: 800
```

---

## Responsive Breakpoints

### Desktop (1024px+)
```
Sidebar: 240px (visible)
Header: Full width
Cards: Full width
Navigation: Sidebar
```

### Tablet (768px - 1023px)
```
Sidebar: Collapsible
Header: Adjusted padding
Cards: Responsive grid
Navigation: Sidebar + bottom nav
```

### Mobile (480px - 767px)
```
Sidebar: Hidden
Header: Compact
Cards: Single column
Navigation: Floating bottom nav
```

### Small Mobile (< 480px)
```
Sidebar: Hidden
Header: Minimal
Cards: Compact
Navigation: Floating bottom nav
Padding: Reduced
```

---

## Animation Specifications

### Transitions
```
Duration: 0.2s
Timing: ease
Properties: all
```

### Hover Effects
```
Cards: translateY(-2px) + shadow
Buttons: translateY(-1px) + background
Icons: scale(1.05) + background
```

### Animations
```
Pulse: 2s infinite (live indicators)
Slide-up: 0.3s ease (dropdowns)
Fade-in: 0.2s ease (modals)
```

---

## Accessibility Features

### Focus States
```
Outline: 2px solid emerald
Offset: 2px
Visible: Always
```

### Color Contrast
```
Text on White: 4.5:1 (AA)
Text on Emerald: 4.5:1 (AA)
Icons: 3:1 minimum
```

### Touch Targets
```
Minimum: 44px × 44px
Recommended: 48px × 48px
Spacing: 8px between targets
```

---

## Mobile Safe Area

```
Top: 0px (below status bar)
Bottom: 24px (above home indicator)
Left: 0px
Right: 0px
```

---

## Z-Index Stack

```
Base: 0
Cards: 1
Buttons: 5
Sidebar: 40
Header: 50
Profile Menu: 50
Bottom Nav: 50
Modals: 200
Overlays: 200
```

---

## Shadow System

### Subtle Shadow
```
0 2px 4px rgba(0,0,0,0.05)
```

### Medium Shadow
```
0 4px 12px rgba(4,106,56,0.08)
```

### Large Shadow
```
0 8px 20px rgba(4,106,56,0.08)
```

### Extra Large Shadow
```
0 12px 40px rgba(4,106,56,0.15)
```

---

## Border Radius System

```
xs: 8px
sm: 10px
md: 12px
lg: 14px
xl: 16px
2xl: 20px
3xl: 24px
full: 99px (pills)
```

---

## Component States

### Button States
```
Default: Base styling
Hover: Background change + shadow
Active: Scale down
Focus: Focus ring visible
Disabled: Opacity 50%
```

### Input States
```
Default: Light background + border
Hover: Slightly darker background
Focus: Enhanced border + focus ring
Error: Red border + error message
Disabled: Opacity 50%
```

### Card States
```
Default: Base styling
Hover: translateY(-2px) + shadow
Active: Darker background
Disabled: Opacity 50%
```

---

## Responsive Typography

### Desktop
```
Headings: 1.4rem - 2.3rem
Body: 0.88rem - 1rem
Labels: 0.75rem - 0.82rem
```

### Mobile
```
Headings: 1.2rem - 1.8rem
Body: 0.82rem - 0.88rem
Labels: 0.7rem - 0.78rem
```

---

## Grid System

### Desktop Grid
```
Columns: 4
Gap: 24px
Max Width: 1200px
```

### Tablet Grid
```
Columns: 2-3
Gap: 20px
Max Width: 900px
```

### Mobile Grid
```
Columns: 1
Gap: 16px
Max Width: 100%
```

---

## Performance Metrics

### Load Time
```
CSS: < 50ms
Animations: 60fps
Transitions: Smooth
```

### File Sizes
```
CSS: ~8KB (minified)
JavaScript: No additional
Total: Minimal overhead
```

---

**Visual Reference Version**: 1.0
**Last Updated**: 2024
**Status**: Complete
