# Hide/Show Content Feature - UI Documentation

## Overview
Added hide/show content buttons for all notes and tasks in the UI, allowing users to quickly hide sensitive information when needed.

## Implementation Details

### Notes Page
The notes page already had hide/show functionality implemented. This feature includes:
- **Individual note hiding**: Each note card has a hide/show button (eye/eye-slash icon)
- **Persistent state**: Hidden notes are saved in localStorage
- **Visual feedback**: Hidden notes show a "Content hidden" message with a "Show" button
- **Hover action**: The hide button appears on hover in the note's action menu

**Location**: `frontend/src/pages/NotesPage.tsx`

**UI Elements**:
- Eye-slash icon button in the note card's quick actions menu
- When hidden: Shows "Content hidden" message with inline "Show" button
- Purple color scheme for the hide/show button to distinguish from other actions

### Tasks Page (NEW)
Added the same hide/show functionality to the tasks page:
- **Individual task hiding**: Each task item has a hide/show button (eye/eye-slash icon)
- **Persistent state**: Hidden tasks are saved in localStorage under 'hiddenTasks' key
- **Visual feedback**: Hidden tasks show a "Content hidden" message with a "Show" button
- **Always visible**: The hide button is visible alongside edit and delete buttons

**Location**: `frontend/src/pages/TasksPage.tsx`

**Changes Made**:
1. Added state management for hidden tasks:
   ```typescript
   const [hiddenTasks, setHiddenTasks] = useState<Set<number>>(() => {
     const saved = localStorage.getItem('hiddenTasks');
     return saved ? new Set(JSON.parse(saved)) : new Set();
   });
   ```

2. Added toggle function:
   ```typescript
   const toggleHideTask = (taskId: number) => {
     setHiddenTasks(prev => {
       const newSet = new Set(prev);
       if (newSet.has(taskId)) {
         newSet.delete(taskId);
       } else {
         newSet.add(taskId);
       }
       localStorage.setItem('hiddenTasks', JSON.stringify([...newSet]));
       return newSet;
     });
   };
   ```

3. Updated task rendering to conditionally show/hide content:
   - When hidden: Shows "Content hidden" with a "Show" button
   - When visible: Shows full task description and metadata

4. Added hide/show button to task actions:
   - Eye-slash icon to hide content
   - Eye icon when content is hidden
   - Purple color scheme for consistency with notes

## User Experience

### Notes Page Behavior
1. User hovers over a note card
2. Quick action buttons appear including the eye-slash icon
3. Clicking the icon hides the note's excerpt and tags
4. Hidden note shows "Content hidden" message
5. Clicking "Show" button or the eye icon reveals content again

### Tasks Page Behavior
1. Each task displays action buttons (hide, edit, delete)
2. Clicking the eye-slash icon hides the task's description and dates
3. Hidden task shows "Content hidden" message with inline "Show" button
4. Clicking "Show" or the eye icon reveals content again
5. Task completion status and actions remain visible even when hidden

## Privacy Features
- **Persistent**: Hidden state survives page reloads via localStorage
- **Independent**: Each note/task can be hidden individually
- **Quick toggle**: Single click to hide/show
- **Clear indication**: Visual feedback shows what's hidden
- **Accessible**: Can show content with a single click when needed

## Storage
- Notes hidden state: `localStorage.getItem('hiddenNotes')`
- Tasks hidden state: `localStorage.getItem('hiddenTasks')`
- Both stored as JSON arrays of IDs

## Use Cases
1. **Screen sharing**: Quickly hide sensitive information during presentations
2. **Privacy**: Hide personal tasks/notes when showing the screen to others
3. **Focus**: Reduce visual clutter by hiding less important items
4. **Security**: Quick privacy layer for sensitive information

## Visual Design
- **Icon**: Font Awesome eye/eye-slash icons
- **Color**: Purple (#7c3aed) for hide/show actions
- **Hover state**: Lighter purple on hover
- **Hidden state**: Gray background with muted text
- **Show button**: Blue background (#3b82f6) with white text
