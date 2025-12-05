# Internationalization (i18n) Guide

NoteHub supports multiple languages through the react-i18next library, providing a seamless multilingual experience for users worldwide.

## Supported Languages

- **English (en)** 🇬🇧 - Default language
- **German (de)** 🇩🇪 - Deutsch
- **Vietnamese (vi)** 🇻🇳 - Tiếng Việt
- **Japanese (ja)** 🇯🇵 - 日本語

## Features

- **Automatic Language Detection**: The application automatically detects the user's browser language
- **Persistent Selection**: Selected language is saved in browser's localStorage
- **Easy Language Switching**: Users can change language via the language selector dropdown
- **Comprehensive Coverage**: All user-facing text is translated including:
  - Authentication pages (Login, Register, Password Reset)
  - Navigation menus
  - Notes and Tasks management
  - Profile settings
  - Admin dashboard
  - Error messages and notifications

## How to Use

### For Users

1. **On Login Page**: Click the language selector at the top of the page
2. **After Login**: Click the language selector in the sidebar (desktop) or header (mobile)
3. **Select Language**: Choose from English, German, Vietnamese, or Japanese
4. Your selection will be automatically saved and persist across sessions

### For Developers

#### Using Translations in Components

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('app.name')}</h1>
      <p>{t('app.tagline')}</p>
      <button>{t('common.save')}</button>
    </div>
  );
}
```

#### Translation Key Structure

Translation keys follow a hierarchical structure:

```
{
  "app": {
    "name": "NoteHub",
    "tagline": "Secure note-taking for everyone"
  },
  "auth": {
    "login": {
      "title": "Welcome back! Sign in to continue",
      "username": "Username or Email",
      // ... more keys
    }
  },
  "notes": { /* ... */ },
  "tasks": { /* ... */ },
  "profile": { /* ... */ }
}
```

#### Adding a New Language

1. Create a new JSON file in `frontend/src/i18n/locales/` (e.g., `fr.json` for French)
2. Copy the structure from `en.json` and translate all values
3. Import and add the language in `frontend/src/i18n/index.ts`:

```typescript
import frTranslations from './locales/fr.json';

const resources = {
  en: { translation: enTranslations },
  de: { translation: deTranslations },
  vi: { translation: viTranslations },
  ja: { translation: jaTranslations },
  fr: { translation: frTranslations }, // Add new language
};
```

4. Add the language option in `frontend/src/components/LanguageSelector.tsx`:

```typescript
const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' }, // Add new language
];
```

#### Adding New Translation Keys

1. Add the key to all language files (`en.json`, `de.json`, `vi.json`, `ja.json`)
2. Use the key in your component with the `t()` function

Example:
```json
// In en.json
{
  "myFeature": {
    "title": "My New Feature",
    "description": "This is a new feature"
  }
}
```

```tsx
// In your component
<h1>{t('myFeature.title')}</h1>
<p>{t('myFeature.description')}</p>
```

## Technical Details

### Libraries Used

- **i18next**: Core i18n framework
- **react-i18next**: React bindings for i18next
- **i18next-browser-languagedetector**: Automatic language detection plugin

### Configuration

The i18n configuration is in `frontend/src/i18n/index.ts`:

```typescript
i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources,
    fallbackLng: 'en', // Fallback to English if translation missing
    debug: false,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });
```

### Language Detection Priority

1. **localStorage**: Previously selected language
2. **navigator**: Browser's language setting

### Storage

The selected language is stored in the browser's localStorage under the key `i18nextLng`.

## Testing

All tests are configured to work with i18n. The test setup (`frontend/src/test/setup.ts`) automatically imports the i18n configuration.

## Best Practices

1. **Always use translation keys**: Never hardcode user-facing text
2. **Keep keys descriptive**: Use hierarchical keys that describe the context
3. **Maintain consistency**: Ensure all language files have the same keys
4. **Test translations**: Verify translations in all supported languages
5. **Use interpolation for dynamic content**: 
   ```tsx
   t('welcome.message', { username: user.name })
   ```

## Screenshots

### English (Default)
![English Login Page](https://github.com/user-attachments/assets/1efb1cb3-5b6d-49eb-8575-f443d5e458bf)

### German
![German Login Page](https://github.com/user-attachments/assets/3ffa9df3-8519-4b2b-beed-3d2e043323bb)

### Vietnamese
![Vietnamese Login Page](https://github.com/user-attachments/assets/3b457dce-c411-4adb-8e36-374fd1cfc02e)

### Japanese
![Japanese Login Page](https://github.com/user-attachments/assets/42f3d141-5621-4931-a55e-73dc37ea6f0b)

## Future Enhancements

Potential improvements for the i18n system:

- Add more languages (Spanish, French, Chinese, etc.)
- Backend API translation support
- Date and time formatting per locale
- Number and currency formatting
- Right-to-left (RTL) language support
- Translation management system for easier updates

## Support

If you encounter any issues with translations or want to contribute new languages, please:
1. Check existing translation files for reference
2. Open an issue on GitHub
3. Submit a pull request with your translations

## References

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)
