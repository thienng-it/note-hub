/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Enhanced breakpoints for better device coverage
      screens: {
        xs: '375px', // Small phones (iPhone SE, etc.)
        sm: '640px', // Large phones / Small tablets
        md: '768px', // Tablets (iPad Mini, etc.)
        lg: '1024px', // Large tablets / Small laptops
        xl: '1280px', // Laptops / Desktops
        '2xl': '1536px', // Large desktops
        // Device-specific breakpoints
        mobile: { max: '767px' }, // All mobile devices
        tablet: { min: '768px', max: '1023px' }, // Tablets only
        desktop: { min: '1024px' }, // Desktops and laptops
        // Orientation-based breakpoints
        portrait: { raw: '(orientation: portrait)' },
        landscape: { raw: '(orientation: landscape)' },
        // Touch capability detection
        touch: { raw: '(hover: none) and (pointer: coarse)' },
        stylus: { raw: '(hover: none) and (pointer: fine)' },
        mouse: { raw: '(hover: hover) and (pointer: fine)' },
      },
      // Spacing for safe areas on notched devices
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      // Minimum touch target sizes (44x44 recommended by Apple/Google)
      minHeight: {
        touch: '44px',
        'touch-lg': '48px',
      },
      minWidth: {
        touch: '44px',
        'touch-lg': '48px',
      },
      // Font sizes optimized for readability on mobile
      fontSize: {
        'mobile-xs': ['0.75rem', { lineHeight: '1.25rem' }],
        'mobile-sm': ['0.875rem', { lineHeight: '1.375rem' }],
        'mobile-base': ['1rem', { lineHeight: '1.625rem' }],
        'mobile-lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'mobile-xl': ['1.25rem', { lineHeight: '1.875rem' }],
        'mobile-2xl': ['1.5rem', { lineHeight: '2rem' }],
      },
      // Backdrop blur values for glassmorphism on different devices
      backdropBlur: {
        xs: '2px',
        mobile: '8px',
        tablet: '12px',
        desktop: '20px',
      },
      // Animation durations - shorter on mobile for snappier feel
      transitionDuration: {
        mobile: '150ms',
        tablet: '200ms',
        desktop: '300ms',
      },
      // Z-index scale for layering
      zIndex: {
        'mobile-nav': '100',
        modal: '200',
        toast: '300',
        tooltip: '400',
      },
    },
  },
  plugins: [],
};
