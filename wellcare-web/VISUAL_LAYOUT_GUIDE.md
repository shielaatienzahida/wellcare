# WellCare UI Refinement - Visual Layout Guide

## Header Layout (56px)

```
┌─────────────────────────────────────────────────────────────┐
│ [☰] [Logo] WELLCARE · Portal          [🔔] [💬] [CF]       │
└─────────────────────────────────────────────────────────────┘
     ↑                                              ↑
   Menu                                    Profile Avatar
   Button                                  (Far Right)
```

### Profile Avatar Dropdown
```
                                    ┌──────────────────┐
                                    │ John Doe         │
                                    │ Member           │
                                    ├──────────────────┤
                                    │ 🏠 Home          │
                                    │ 📋 History       │
                                    │ 💬 Messages      │
                                    │ 👤 Profile       │
                                    │ 🔔 Notifications │
                                    ├──────────────────┤
                                    │ 🚪 Log Out       │
                                    └──────────────────┘
```

---

## Main Content Layout

```
┌──────────────────────────────────────────────────────────────┐
│ SIDEBAR (220px)  │                                           │
│ ─────────────    │                                           │
│ • Home           │         MAIN CONTENT AREA                │
│ • History        │                                           │
│ • Messages       │  ┌─────────────────────────────────────┐ │
│ • Profile        │  │ Welcome Banner                      │ │
│ • Notifications  │  └─────────────────────────────────────┘ │
│ ─────────────    │                                           │
│ [Log Out]        │  ┌──────────────┬──────────────┐         │
│                  │  │ Sessions     │ Absences     │         │
│                  │  │ 45 ✓         │ 2 ✗          │         │
│                  │  └──────────────┴──────────────┘         │
│                  │                                           │
│                  │  ┌──────────────────────────────────────┐ │
│                  │  │ 🟢 Sessions          45 Check-ins   │ │
│                  │  │    Wellness Attendance               │ │
│                  │  └──────────────────────────────────────┘ │
│                  │                                           │
│                  │  ┌──────────────────────────────────────┐ │
│                  │  │ 🔵 Alkaline Intake   12 Sessions    │ │
│                  │  │    Therapy Sessions                  │ │
│                  │  └──────────────────────────────────────┘ │
│                  │                                           │
│                  │  ┌──────────────────────────────────────┐ │
│                  │  │ Today's Hydration ▼                 │ │
│                  │  │ [Select Hydration Level ▼]          │ │
│                  │  └──────────────────────────────────────┘ │
│                  │                                           │
└──────────────────┴───────────────────────────────────────────┘
```

---

## Card Styling Examples

### Stat Card (Reduced Padding)
```
┌──────────────────────────┐
│ 🟢  45                   │
│     Sessions Attended    │
└──────────────────────────┘
Padding: 10px 12px
Border: 1px solid rgba(4,106,56,0.1)
Border Radius: 11px
```

### Sessions Card (Separate)
```
┌────────────────────────────────────────┐
│ 🟢 Sessions                            │
│    45 Check-ins                        │
│    Wellness Attendance                 │
└────────────────────────────────────────┘
Icon: Green (#2d8a00)
Padding: 13px 14px
Border: 1.5px solid rgba(4,106,56,0.12)
```

### Alkaline Card (Separate)
```
┌────────────────────────────────────────┐
│ 🔵 Alkaline Intake                     │
│    12 Sessions                         │
│    Therapy Sessions                    │
└────────────────────────────────────────┘
Icon: Blue (#0284c7)
Padding: 13px 14px
Border: 1.5px solid rgba(4,106,56,0.12)
```

---

## Hydration Dropdown (Enhanced)

```
┌──────────────────────────────────────┐
│ Select Hydration Level           ▼   │
└──────────────────────────────────────┘

Border: 1.5px solid #046a38 (Emerald)
Background: Gradient (white to sand)
Icon: Bold chevron-down (18px)
Hover: Enhanced border + shadow + lift
Focus: 3px focus ring + shadow
```

---

## Button Styling (Professional Box)

### Standard Button
```
┌──────────────────────┐
│  Save Changes        │
└──────────────────────┘
Border: 1.5px solid rgba(4,106,56,0.2)
Background: rgba(255,255,255,0.85)
Padding: 10px 16px
Border Radius: 9px
Shadow: 0 2px 6px rgba(4,106,56,0.08)
Hover: White/95 + emerald border + lift
```

### Primary Button
```
┌──────────────────────┐
│  Save Changes        │
└──────────────────────┘
Background: Gradient (emerald-700 to emerald-600)
Color: White
Border: None
Padding: 10px 16px
Shadow: 0 4px 12px rgba(4,106,56,0.2)
Hover: Darker gradient + enhanced shadow
```

---

## Floating Bottom Navigation (Mobile)

```
                    ┌─────────────────────────────┐
                    │ [🏠] [📋] [💬] [👤] [🔔]   │
                    │ Home History Messages...    │
                    └─────────────────────────────┘
                    ↑
            Floating Effect:
            - Position: Fixed bottom-3
            - Shadow: 0 16px 48px rgba(4,106,56,0.2)
            - Backdrop: blur-2xl
            - Border Radius: 16px (pill-shaped)
            - Height: 64px
            - Animation: Float-up on load
```

### Navigation Item States

**Active State**
```
┌─────┐
│ 🏠  │  Icon: 22px, emerald color
│Home │  Text: Bold, emerald color
└─────┘
```

**Inactive State**
```
┌─────┐
│ 📋  │  Icon: 20px, muted color
│Hist │  Text: Medium, muted color
└─────┘
```

---

## Icon Styling (Catchy)

```
┌──────────────┐
│   🟢 45      │  Icon Container:
│              │  - 40px × 40px
│              │  - Gradient background
│              │  - 1.5px border
│              │  - Rounded corners
└──────────────┘  - Hover: Scale 1.08 + shadow
```

---

## Color Reference

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
```

### Backgrounds
```
White:              #ffffff ████████
Sand:               #f4fbf7 ████████
Overlay:            rgba(4,106,56,0.08) ████████
```

---

## Spacing System

### Padding
```
xs: 8px
sm: 10px
md: 12px
lg: 14px
xl: 16px
```

### Gaps
```
xs: 8px
sm: 10px
md: 12px
lg: 14px
```

---

## Typography

### Font Sizes
```
xs: 0.7rem (11px)
sm: 0.75rem (12px)
base: 0.82rem (13px)
lg: 0.85rem (14px)
xl: 1.5rem (24px)
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
Sidebar: 220px (visible)
Header: 56px
Cards: Full width
Navigation: Sidebar
```

### Tablet (768px - 1023px)
```
Sidebar: Collapsible
Header: 56px
Cards: Responsive
Navigation: Sidebar + bottom nav
```

### Mobile (480px - 767px)
```
Sidebar: Hidden
Header: 56px (compact)
Cards: Single column
Navigation: Floating bottom nav
```

### Small Mobile (< 480px)
```
Sidebar: Hidden
Header: 56px (minimal)
Cards: Compact
Navigation: Floating bottom nav
Padding: Reduced
```

---

## Animation Specifications

### Transitions
```
Duration: 0.25s
Timing: cubic-bezier(0.4, 0, 0.2, 1)
Properties: all
```

### Hover Effects
```
Cards: translateY(-2px) + shadow
Buttons: translateY(-2px) + background
Icons: scale(1.08) + shadow
Dropdown: translateY(-1px) + shadow
```

### Animations
```
Pulse: 2.5s infinite (live indicators)
Float-up: 0.4s (bottom nav load)
Shine: 0.5s (button hover)
```

---

## Shadow System

### Subtle
```
0 2px 6px rgba(4,106,56,0.08)
```

### Medium
```
0 4px 16px rgba(4,106,56,0.15)
```

### Large
```
0 8px 24px rgba(4,106,56,0.12)
```

### Extra Large (Floating Nav)
```
0 16px 48px rgba(4,106,56,0.2)
```

---

## Border Radius System

```
xs: 6px
sm: 8px
md: 9px
lg: 10px
xl: 11px
2xl: 12px
3xl: 16px
full: 99px (pills)
```

---

## Component States

### Button States
```
Default: Base styling
Hover: Background + border + shadow + lift
Active: Scale down
Focus: Focus ring visible
Disabled: Opacity 50%
```

### Dropdown States
```
Default: Emerald border + gradient background
Hover: Enhanced border + shadow + lift
Focus: Focus ring + shadow
```

### Card States
```
Default: Base styling
Hover: translateY(-2px) + shadow
Active: Darker background
```

---

**Visual Reference Version**: 2.0
**Last Updated**: 2024
**Status**: Complete & Production Ready
