# CSS Class Reference Guide

Quick reference for all glass effect and utility classes in NoteHub.

## 🎨 Glass Components (components.css)

### Cards & Panels
```css
.glass-card          /* Standard card with glass effect */
.glass-panel         /* Panel with elevated glass effect */
.glass-panel-elevated /* Highly elevated panel */
.glass-container     /* Basic glass container */
```

### Inputs & Forms
```css
.glass-input         /* Glass effect input field */
.glass-input-with-icon /* Input with icon spacing */
.glass-textarea      /* Glass effect textarea */
.glass-select        /* Glass effect select dropdown */
.glass-checkbox      /* Glass effect checkbox */
.glass-radio         /* Glass effect radio button */
```

### Buttons
```css
.btn-apple           /* Primary Apple-style button */
.btn-apple-secondary /* Secondary button */
.btn-apple-danger    /* Danger/delete button */
.btn-apple-ghost     /* Ghost/outline button */
.btn-icon            /* Icon-only button */
```

### Alerts
```css
.alert-glass         /* Glass effect alert */
.alert-success       /* Success alert (green) */
.alert-error         /* Error alert (red) */
.alert-warning       /* Warning alert (yellow) */
.alert-info          /* Info alert (blue) */
```

### Lists & Tables
```css
.glass-list          /* List container */
.glass-list-item     /* List item */
.glass-table         /* Table with glass effect */
.glass-th            /* Table header cell */
.glass-td            /* Table data cell */
.glass-tr            /* Table row */
```

### Modals & Overlays
```css
.glass-modal         /* Modal overlay */
.glass-modal-content /* Modal content box */
.glass-tooltip       /* Tooltip container */
```

### Progress & Status
```css
.glass-progress      /* Progress bar container */
.glass-progress-bar  /* Progress bar fill */
.glass-badge         /* Badge/tag element */
.glass-avatar        /* Avatar with gradient */
```

### Code & Text
```css
.glass-code          /* Inline code */
.glass-pre           /* Code block */
.glass-blockquote    /* Blockquote */
.glass-kbd           /* Keyboard key */
```

### Controls
```css
.glass-segmented     /* Segmented control container */
.glass-segmented-item /* Segment item */
.glass-button-group  /* Button group */
```

### Context Menu
```css
.context-menu        /* Context menu container */
.context-menu-item   /* Menu item */
.context-menu-divider /* Menu divider */
```

---

## 🎯 Utilities (utilities.css)

### Glass Effects
```css
.glass-effect        /* Standard glass effect */
.glass-effect-sm     /* Small blur glass */
.glass-effect-md     /* Medium blur glass */
.glass-effect-xl     /* Extra large blur glass */
```

### Icons & Spans
```css
.glass-i             /* Icon wrapper (transparent) */
.glass-icon          /* Icon with glass background */
.glass-span          /* Inline glass badge */
.glass-div           /* Basic glass div */
.glass-div-center    /* Centered glass div */
.glass-section       /* Glass section with padding */
```

### Transitions
```css
.transition-fast     /* Fast transition (150ms) */
.transition-base     /* Base transition (200ms) */
.transition-smooth   /* Smooth transition (300ms) */
.transition-spring   /* Spring transition (cubic-bezier) */
```

### Shadows
```css
.shadow-glass-1      /* Light glass shadow */
.shadow-glass-2      /* Medium glass shadow */
.shadow-glass-3      /* Heavy glass shadow */
.shadow-apple        /* Apple-style blue glow */
```

### Hover Effects
```css
.hover-lift          /* Lift on hover (-2px) */
.hover-scale         /* Scale on hover (1.05) */
.hover-glow          /* Glow on hover */
```

### Flex Utilities
```css
.flex-center         /* Center items (both axes) */
.flex-between        /* Space between items */
.flex-col            /* Flex column direction */
```

### Text Utilities
```css
.text-gradient       /* Blue to purple gradient text */
.text-muted-glass    /* Muted glass text color */
.text-apple-blue     /* Apple blue color */
.line-clamp-1        /* Clamp to 1 line */
.line-clamp-2        /* Clamp to 2 lines */
.line-clamp-3        /* Clamp to 3 lines */
```

### Brand
```css
.logo-gradient       /* Logo gradient background */
```

### Safe Areas
```css
.safe-area-top       /* Safe area padding top */
.safe-area-bottom    /* Safe area padding bottom */
.notch-safe-top      /* Notch safe padding top */
.notch-safe-bottom   /* Notch safe padding bottom */
.notch-safe-left     /* Notch safe padding left */
.notch-safe-right    /* Notch safe padding right */
```

### Touch
```css
.touch-manipulation  /* Optimize touch interactions */
.touch-no-select     /* Disable text selection */
```

### Scroll
```css
.ios-scroll          /* iOS smooth scrolling */
.overscroll-contain  /* Prevent scroll chaining */
.scroll-smooth       /* Smooth scroll behavior */
```

### Responsive Visibility
```css
.hide-mobile         /* Hide on mobile (<768px) */
.hide-tablet         /* Hide on tablet (768-1023px) */
.hide-desktop        /* Hide on desktop (>1024px) */
.show-mobile         /* Show only on mobile */
```

### Animations
```css
.animate-fade-in     /* Fade in animation */
.animate-fade-in-up  /* Fade in + slide up */
.animate-slide-up    /* Slide up animation */
.animate-scale-in    /* Scale in animation */
```

### Sizing
```css
.w-22                /* Width: 5.5rem */
.h-22                /* Height: 5.5rem */
.border-l-3          /* Left border: 3px */
```

### Prose
```css
.prose               /* Prose text styling */
.prose-invert        /* Inverted prose styling */
```

---

## 📐 Layout (layout.css)

### Navigation
```css
.glass-nav           /* Navigation bar */
.glass-header        /* Header with bottom border */
.glass-footer        /* Footer with top border */
.liquid-glass-nav    /* Liquid glass navigation */
```

### Containers
```css
.glass-wrapper       /* General wrapper */
.glass-main          /* Main content area */
.sidebar             /* Sidebar container */
.mobile-nav          /* Mobile navigation */
```

### Modals
```css
.responsive-modal    /* Responsive modal overlay */
.responsive-modal-content /* Modal content */
```

---

## 📄 Pages (pages.css)

Page-specific styles for:
- Notes page
- Tasks page
- Admin dashboard
- Profile page
- Settings pages

---

## 💬 Chat (chat.css)

Chat-specific styles for:
- Chat messages
- Message bubbles
- Chat input
- User avatars
- Typing indicators

---

## 🎨 Base (base.css)

### CSS Variables
```css
--glass-bg           /* Glass background color */
--glass-border       /* Glass border color */
--glass-shadow       /* Glass shadow color */
--apple-blue         /* Apple blue (#007aff) */
--apple-purple       /* Apple purple (#af52de) */
--blur-sm            /* Small blur (4px) */
--blur-md            /* Medium blur (8px) */
--blur-lg            /* Large blur (12px) */
--blur-xl            /* Extra large blur (16px) */
```

### Print Styles
```css
@media print         /* Print-specific styles */
```

### Responsive Grid
```css
.responsive-grid-glass /* Responsive grid with glass */
```

---

## 🌙 Dark Mode

All glass components automatically support dark mode via the `.dark` class on the root element.

### Dark Mode Classes
Most components have dark mode variants:
```css
.dark .glass-card
.dark .glass-input
.dark .glass-table
.dark .text-muted-glass
/* etc. */
```

---

## 📱 Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 640px)

/* Tablet */
@media (min-width: 768px)

/* Desktop */
@media (min-width: 1024px)

/* Large Desktop */
@media (min-width: 1280px)
```

---

## 🎯 Common Patterns

### Card with Header
```html
<div class="glass-card">
  <h2 class="glass-title">Title</h2>
  <p class="glass-subtitle">Subtitle</p>
  <!-- Content -->
</div>
```

### Button Group
```html
<div class="glass-button-group">
  <button class="btn-apple">Primary</button>
  <button class="btn-apple-secondary">Secondary</button>
</div>
```

### Input with Icon
```html
<div class="relative">
  <i class="glass-i fas fa-search absolute left-4"></i>
  <input class="glass-input glass-input-with-icon" />
</div>
```

### Alert
```html
<div class="alert-glass alert-success">
  <i class="glass-i fas fa-check-circle"></i>
  <span>Success message</span>
</div>
```

### Modal
```html
<div class="glass-modal">
  <div class="glass-modal-content">
    <!-- Modal content -->
  </div>
</div>
```

---

## 🔍 Finding Classes

Use your editor's search to find class definitions:

```bash
# Search in all CSS files
grep -r "\.class-name" src/styles/

# Search in specific file
grep "\.class-name" src/styles/components.css
```

---

## 📚 Resources

- **Main CSS Entry**: `src/index.css`
- **Modular Files**: `src/styles/`
- **Component Examples**: Check existing pages in `src/pages/`
- **Cleanup Summary**: See `CSS_CLEANUP_SUMMARY.md`
