# Hide/Show Content Feature - UI Mockup

## Tasks Page - Before and After

### Before (Task Without Hide/Show)
```
┌─────────────────────────────────────────────────────────────┐
│ [ ] Complete project documentation                          │
│     Medium                                                   │
│                                                              │
│     Write comprehensive documentation for the API           │
│                                                              │
│     📅 12/15/2025    🕐 Created 12/01/2025                  │
│                                        [Edit] [Delete]       │
└─────────────────────────────────────────────────────────────┘
```

### After - Normal View (New Hide Button Added)
```
┌─────────────────────────────────────────────────────────────┐
│ [ ] Complete project documentation                          │
│     Medium                                                   │
│                                                              │
│     Write comprehensive documentation for the API           │
│                                                              │
│     📅 12/15/2025    🕐 Created 12/01/2025                  │
│                           [👁️‍🗨️] [Edit] [Delete]              │
└─────────────────────────────────────────────────────────────┘
                             └─ NEW: Hide content button
```

### After - Hidden View (Content Hidden)
```
┌─────────────────────────────────────────────────────────────┐
│ [ ] Complete project documentation                          │
│     Medium                                                   │
│                                                              │
│  ┌───────────────────────────────────────────────────┐      │
│  │ 🚫 Content hidden              [Show]            │      │
│  └───────────────────────────────────────────────────┘      │
│                                                              │
│                           [👁️] [Edit] [Delete]                │
└─────────────────────────────────────────────────────────────┘
                             └─ Changed to "Show" icon
```

## Notes Page - Existing Feature

### Normal View
```
┌───────────────────────────────────┐
│  📌 ❤️                            │
│                                   │
│  Project Ideas                    │
│                                   │
│  Brainstorming new features...    │
│                                   │
│  #work #ideas                     │
│                                   │
│  🕐 5m    Dec 5                   │
│         [👁️‍🗨️] [Edit] [Share] [❤️] │
└───────────────────────────────────┘
        └─ Hide button appears on hover
```

### Hidden View
```
┌───────────────────────────────────┐
│  📌 ❤️                            │
│                                   │
│  Project Ideas                    │
│                                   │
│  ┌─────────────────────────┐     │
│  │ 🚫 Content hidden       │     │
│  │          [Show]         │     │
│  └─────────────────────────┘     │
│                                   │
│  🕐 5m    Dec 5                   │
│         [👁️] [Edit] [Share] [❤️]  │
└───────────────────────────────────┘
        └─ Changed to "Show" icon
```

## Key UI Elements

### Hide/Show Button States
- **Hide mode**: 👁️‍🗨️ (eye-slash icon) - Purple/Gray color
- **Show mode**: 👁️ (eye icon) - Purple color
- **Hover**: Lighter purple background

### Hidden Content Placeholder
- Gray background (`bg-[var(--bg-tertiary)]`)
- Centered content with icon and text
- "Content hidden" text in muted color
- Blue "Show" button for quick reveal

### Button Placement
**Notes**: 
- In quick actions menu (appears on card hover)
- Right side of card footer

**Tasks**:
- Always visible in actions area
- First button before Edit and Delete

## Color Scheme
- **Hide/Show button**: Purple (#7c3aed / text-purple-600)
- **Hidden placeholder**: Gray background
- **Show button**: Blue (#3b82f6 / bg-blue-500)
- **Icons**: Font Awesome eye/eye-slash

## Responsive Behavior
- Buttons scale appropriately on mobile
- Hidden content placeholder maintains readable size
- Touch-friendly button targets on mobile devices
