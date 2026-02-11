# Firebase Analytics Integration

## Overview

Firebase Analytics is integrated into NoteHub to track user behavior, page views, and custom events. This helps you understand how users interact with your application.

## Configuration

### Firebase Config Location
`frontend/src/config/firebase.ts`

```typescript
const firebaseConfig = {
  apiKey: 'AIzaSyBAjhsrar8O8D5a0wlXyN4OqLRZr2kdaCU',
  authDomain: 'note-hub-80f76.firebaseapp.com',
  projectId: 'note-hub-80f76',
  storageBucket: 'note-hub-80f76.firebasestorage.app',
  messagingSenderId: '990819462432',
  appId: '1:990819462432:web:92e7864aca939a1a82fb45',
  measurementId: 'G-EDSV8Y84BY',
};
```

### Automatic Events Tracked

Firebase automatically tracks:
- **Page views** - when users navigate between pages
- **First open** - when users first open the app
- **Session start** - when a new session begins
- **User engagement** - time spent in app

### Accessing Analytics Dashboard

View your analytics data at:
https://console.firebase.google.com/project/note-hub-80f76/analytics

## Custom Event Tracking (Optional)

If you want to track custom events, you can import and use the analytics object:

```typescript
import { logEvent } from 'firebase/analytics';
import { analytics } from './config/firebase';

// Track custom events
if (analytics) {
  logEvent(analytics, 'note_created', {
    note_id: noteId,
    has_tags: tags.length > 0,
  });
}
```

### Example Custom Events

```typescript
// Note management
logEvent(analytics, 'note_created');
logEvent(analytics, 'note_edited', { note_id: id });
logEvent(analytics, 'note_deleted', { note_id: id });
logEvent(analytics, 'note_shared', { note_id: id });

// Tags
logEvent(analytics, 'tag_created', { tag_name: name });
logEvent(analytics, 'tag_applied', { tag_count: tags.length });

// Search
logEvent(analytics, 'search', { search_term: query });

// Tasks
logEvent(analytics, 'task_created', { priority: priority });
logEvent(analytics, 'task_completed', { task_id: id });
```

## Privacy Considerations

### Data Collection

Firebase Analytics collects:
- Device information (OS, browser, screen size)
- Geographic location (country, city)
- User engagement metrics
- Custom events you define

### GDPR Compliance

To be GDPR compliant, consider:

1. **Add Cookie/Analytics Consent Banner:**
   ```typescript
   import { setAnalyticsCollectionEnabled } from 'firebase/analytics';
   
   // Disable analytics by default
   setAnalyticsCollectionEnabled(analytics, false);
   
   // Enable when user consents
   function handleUserConsent() {
     setAnalyticsCollectionEnabled(analytics, true);
   }
   ```

2. **Update Privacy Policy** to mention:
   - What data is collected
   - How it's used
   - How users can opt-out
   - Data retention periods

3. **Provide Opt-Out Option:**
   ```typescript
   // In user settings
   setAnalyticsCollectionEnabled(analytics, userPreferences.allowAnalytics);
   ```

## Disabling Analytics

If you want to disable analytics completely:

### Option 1: Remove from code
```typescript
// frontend/src/main.tsx
import './config/firebase'; // Remove this line
```

### Option 2: Conditional Loading
```typescript
// frontend/src/config/firebase.ts
const enableAnalytics = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';

if (enableAnalytics) {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}
```

Then set in `.env.production`:
```bash
VITE_ENABLE_ANALYTICS=false
```

## Analytics Reports Available

### Realtime Dashboard
- Active users right now
- Top pages
- Active countries
- User activity timeline

### User Metrics
- Daily/Monthly Active Users (DAU/MAU)
- New vs Returning users
- User retention
- Cohort analysis

### Engagement
- Screen views per session
- Average engagement time
- Session duration
- Events per session

### Acquisition
- User sources (direct, referral, search)
- First user medium
- User campaign attribution

### Custom Reports
Create custom reports with:
- Event parameters
- User properties
- Conversion funnels
- Path analysis

## Best Practices

1. **Don't Over-Track**: Only track meaningful events
2. **Respect Privacy**: Always get user consent
3. **Test Analytics**: Use Debug View in Firebase Console
4. **Set User Properties**: For better segmentation
5. **Use Descriptive Event Names**: Follow naming conventions

## Debugging

### Enable Debug Mode (Development)

```bash
# In browser console
localStorage.setItem('debug_mode', 'true');
```

Or add to URL:
```
https://note-hub-80f76.web.app?debug_mode=1
```

### View Debug Events

1. Go to Firebase Console → Analytics → DebugView
2. Events will appear in real-time
3. Inspect event parameters and user properties

## Resources

- [Firebase Analytics Documentation](https://firebase.google.com/docs/analytics)
- [Analytics Dashboard](https://console.firebase.google.com/project/note-hub-80f76/analytics)
- [GDPR Compliance Guide](https://firebase.google.com/support/privacy)
