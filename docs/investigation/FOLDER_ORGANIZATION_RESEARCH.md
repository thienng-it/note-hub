# Folder Organization Research for NoteHub

## Executive Summary

This document analyzes different approaches to implementing folder/category organization for notes and tasks in NoteHub.

**Recommendation:** Implement a **flat folder system with hierarchical support** using a self-referential parent_id approach, combined with existing tags for flexible organization.

## Current Organization System

### Existing Features
- ✅ **Tags** - Multi-tag support with tag management
- ✅ **Favorites** - Mark notes as favorites
- ✅ **Pinned** - Pin notes to top
- ✅ **Archived** - Archive old notes
- ✅ **Search** - Full-text search with Elasticsearch
- ✅ **Filtering** - Filter by tag, favorite, archived

### Limitations
- ❌ No hierarchical organization
- ❌ No folder-based grouping
- ❌ Tags are flat (no nested tags)
- ❌ Difficult to organize large number of notes

## User Requirements

Based on common note-taking app patterns, users need:
1. **Folders** - Organize notes into logical groups
2. **Nested Folders** - Support for sub-folders (Work > Project A > Meeting Notes)
3. **Multiple Categories** - Notes that fit in multiple folders
4. **Quick Navigation** - Easy folder switching
5. **Visual Hierarchy** - Clear folder structure display
6. **Drag-and-Drop** - Move notes between folders
7. **Breadcrumbs** - Show current location in hierarchy

## Design Options

### Option 1: Simple Folder System (Single Level)

**Schema:**
```sql
CREATE TABLE folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  user_id INTEGER NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE notes ADD COLUMN folder_id INTEGER REFERENCES folders(id);
ALTER TABLE tasks ADD COLUMN folder_id INTEGER REFERENCES tasks(id);
```

**Pros:**
- ✅ Simple to implement
- ✅ Easy to understand
- ✅ Fast queries
- ✅ No recursion needed

**Cons:**
- ❌ No nested folders
- ❌ Limited organization for complex projects
- ❌ Can't group folders

### Option 2: Hierarchical Folders (Nested)

**Schema:**
```sql
CREATE TABLE folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  user_id INTEGER NOT NULL,
  parent_id INTEGER,
  icon VARCHAR(50),
  color VARCHAR(20),
  position INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);

-- Add indexes
CREATE INDEX idx_folders_user ON folders(user_id);
CREATE INDEX idx_folders_parent ON folders(parent_id);
CREATE INDEX idx_folders_user_parent ON folders(user_id, parent_id);

ALTER TABLE notes ADD COLUMN folder_id INTEGER REFERENCES folders(id);
ALTER TABLE tasks ADD COLUMN folder_id INTEGER REFERENCES folders(id);
```

**Pros:**
- ✅ Supports nested folders
- ✅ Flexible organization
- ✅ Can represent complex hierarchies
- ✅ Industry standard approach

**Cons:**
- ⚠️ Requires recursive queries
- ⚠️ More complex UI
- ⚠️ Potential performance issues with deep nesting

### Option 3: Tags + Virtual Folders

**Schema:**
```sql
-- No new table, use existing tags
-- Add special tag prefix for folders: "folder:Work", "folder:Personal"
```

**Pros:**
- ✅ No schema changes
- ✅ Leverages existing tag system
- ✅ Notes can be in multiple "folders"

**Cons:**
- ❌ Not a true folder system
- ❌ No hierarchical structure
- ❌ Confusing UI (mixing tags and folders)

### Option 4: Hybrid Folders + Tags (Recommended)

**Schema:**
```sql
CREATE TABLE folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  user_id INTEGER NOT NULL,
  parent_id INTEGER,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'folder',
  color VARCHAR(20) DEFAULT '#3B82F6',
  position INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);

CREATE INDEX idx_folders_user ON folders(user_id);
CREATE INDEX idx_folders_parent ON folders(parent_id);
CREATE INDEX idx_folders_user_parent ON folders(user_id, parent_id);

ALTER TABLE notes ADD COLUMN folder_id INTEGER DEFAULT NULL REFERENCES folders(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN folder_id INTEGER DEFAULT NULL REFERENCES folders(id) ON DELETE SET NULL;
```

**How It Works:**
- **Folders** - Hierarchical organization
- **Tags** - Cross-cutting labels
- **Favorites/Pinned** - Quick access
- **Search** - Find across all folders

**Example:**
```
📁 Work
  📁 Project A
    📄 Meeting Notes (tags: #important, #review)
    📄 Requirements (tags: #documentation)
  📁 Project B
📁 Personal
  📄 Shopping List (tags: #todo)
  📄 Book Ideas (tags: #creative)
```

**Pros:**
- ✅ Best of both worlds
- ✅ Folders for structure
- ✅ Tags for flexible categorization
- ✅ Intuitive for users
- ✅ Supports complex workflows

**Cons:**
- ⚠️ More complex to implement
- ⚠️ Need to maintain both systems

## Recommended Approach: Hybrid Folders + Tags

### Database Schema

#### Folders Table
```sql
CREATE TABLE folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  user_id INTEGER NOT NULL,
  parent_id INTEGER DEFAULT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'folder',
  color VARCHAR(20) DEFAULT '#3B82F6',
  position INTEGER DEFAULT 0,
  is_expanded INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE,
  UNIQUE (user_id, name, parent_id)
);

CREATE INDEX idx_folders_user ON folders(user_id);
CREATE INDEX idx_folders_parent ON folders(parent_id);
CREATE INDEX idx_folders_user_parent ON folders(user_id, parent_id);
```

#### Modify Existing Tables
```sql
-- Add folder_id to notes
ALTER TABLE notes ADD COLUMN folder_id INTEGER DEFAULT NULL;
ALTER TABLE notes ADD FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL;
CREATE INDEX idx_notes_folder ON notes(folder_id);
CREATE INDEX idx_notes_user_folder ON notes(owner_id, folder_id);

-- Add folder_id to tasks
ALTER TABLE tasks ADD COLUMN folder_id INTEGER DEFAULT NULL;
ALTER TABLE tasks ADD FOREIGN KEY (folder_id) REFERENCES tasks(id) ON DELETE SET NULL;
CREATE INDEX idx_tasks_folder ON tasks(folder_id);
CREATE INDEX idx_tasks_user_folder ON tasks(owner_id, folder_id);
```

### Backend API Design

#### Folder Endpoints

```
GET    /api/folders                  - List user's folders (tree structure)
POST   /api/folders                  - Create new folder
GET    /api/folders/:id              - Get folder details
PUT    /api/folders/:id              - Update folder
DELETE /api/folders/:id              - Delete folder
POST   /api/folders/:id/move         - Move folder to different parent
```

#### Notes with Folders

```
GET    /api/notes?folder_id=:id      - Get notes in folder (existing endpoint, add filter)
PUT    /api/notes/:id/move           - Move note to folder
```

#### Example API Responses

**GET /api/folders - Tree Structure**
```json
{
  "folders": [
    {
      "id": 1,
      "name": "Work",
      "icon": "briefcase",
      "color": "#3B82F6",
      "parent_id": null,
      "is_expanded": true,
      "note_count": 5,
      "children": [
        {
          "id": 2,
          "name": "Project A",
          "icon": "folder",
          "color": "#10B981",
          "parent_id": 1,
          "is_expanded": false,
          "note_count": 3,
          "children": []
        }
      ]
    },
    {
      "id": 3,
      "name": "Personal",
      "icon": "home",
      "color": "#F59E0B",
      "parent_id": null,
      "is_expanded": true,
      "note_count": 2,
      "children": []
    }
  ],
  "total": 3
}
```

### Frontend UI Design

#### Sidebar Navigation

```
┌─────────────────────────┐
│ 🔍 Search               │
├─────────────────────────┤
│ ⭐ Favorites            │
│ 📌 Pinned               │
│ 🔔 All Notes            │
├─────────────────────────┤
│ 📁 Folders              │
│   ▼ 💼 Work         (5) │
│     ▼ 📁 Project A  (3) │
│       📄 Document 1     │
│     ▶ 📁 Project B  (2) │
│   ▼ 🏠 Personal     (2) │
│     📄 Note 1           │
│   ▶ 📂 Archive      (8) │
├─────────────────────────┤
│ 🏷️ Tags                │
│   #work (10)            │
│   #important (5)        │
└─────────────────────────┘
```

#### Features

1. **Collapsible Folders** - Click to expand/collapse
2. **Drag & Drop** - Drag notes to folders
3. **Context Menu** - Right-click for actions
4. **Breadcrumbs** - Show current path
5. **Folder Actions** - Create, rename, delete, change color/icon

#### Component Structure

```typescript
// Folder tree component
<FolderTree>
  <FolderItem folder={folder} level={0}>
    <FolderItem folder={subfolder} level={1} />
  </FolderItem>
</FolderTree>

// Notes list with folder filter
<NotesList folderId={currentFolder?.id} />
```

### Implementation Plan

#### Phase 1: Database & Backend (Week 1)
1. Create migration script for folders table
2. Modify notes and tasks tables
3. Implement folder CRUD endpoints
4. Add folder filtering to notes/tasks endpoints
5. Write backend tests

#### Phase 2: Basic Frontend (Week 2)
1. Create folder tree component
2. Add folder list to sidebar
3. Implement folder creation/editing
4. Add folder filtering to notes view
5. Write frontend tests

#### Phase 3: Advanced Features (Week 3)
1. Implement drag-and-drop
2. Add folder context menus
3. Implement folder moving/reordering
4. Add breadcrumb navigation
5. Polish UI/UX

#### Phase 4: Polish & Documentation (Week 4)
1. Performance optimization
2. Edge case handling
3. Update documentation
4. User testing
5. Bug fixes

### UI/UX Considerations

#### Folder Icons & Colors

Predefined options:
- **Icons**: folder, briefcase, home, book, code, heart, star, tag, archive, inbox
- **Colors**: Blue, Green, Red, Orange, Purple, Pink, Gray, Yellow

#### Folder Actions

- **Create** - "New Folder" button or context menu
- **Rename** - Double-click or context menu
- **Delete** - Context menu (with confirmation)
- **Move** - Drag folder to new parent
- **Change Color** - Color picker in folder settings
- **Change Icon** - Icon selector in folder settings

#### Default Folders

Consider creating default folders for new users:
- 📁 Work
- 📁 Personal
- 📁 Archive

### Performance Considerations

#### Query Optimization

```sql
-- Get all folders with note counts (optimized)
SELECT 
  f.id, f.name, f.parent_id, f.icon, f.color, f.is_expanded,
  COUNT(n.id) as note_count
FROM folders f
LEFT JOIN notes n ON n.folder_id = f.id AND n.archived = 0
WHERE f.user_id = ?
GROUP BY f.id
ORDER BY f.position, f.name;
```

#### Caching Strategy

- Cache folder tree in Redis (if enabled)
- Cache key: `folders:user:{user_id}`
- TTL: 1 hour
- Invalidate on folder changes

#### Recursive Queries

For fetching folder paths (breadcrumbs):
```sql
-- SQLite
WITH RECURSIVE folder_path AS (
  SELECT id, name, parent_id, 0 as level
  FROM folders
  WHERE id = ?
  UNION ALL
  SELECT f.id, f.name, f.parent_id, fp.level + 1
  FROM folders f
  JOIN folder_path fp ON f.id = fp.parent_id
)
SELECT * FROM folder_path ORDER BY level DESC;
```

### Migration Strategy

1. **Add columns with defaults** - folder_id = NULL
2. **Existing notes remain unfiled** - accessible from "All Notes"
3. **Optional migration** - Users can organize at their pace
4. **Bulk operations** - Allow moving multiple notes to folder

### Edge Cases

1. **Delete folder with notes** - Move notes to parent or root
2. **Delete parent folder** - Move children to grandparent
3. **Circular references** - Prevent in validation
4. **Deep nesting** - Limit to 5 levels (recommended)
5. **Folder name conflicts** - Unique per parent
6. **Empty folders** - Allow but show count = 0

## Comparison with Other Apps

### Notion
- Hierarchical pages with unlimited nesting
- Pages can contain pages
- No separate folder concept

### Evernote
- Notebooks and notebook stacks (2 levels)
- Simple but effective
- One note in one notebook

### OneNote
- Notebook > Section > Page
- 3-level hierarchy
- Good for different content types

### Apple Notes
- Folders with unlimited nesting
- Simple and intuitive
- Drag-and-drop support

## Recommendation

Implement **Hybrid Folders + Tags** approach because:

1. ✅ **User-Friendly** - Familiar folder metaphor
2. ✅ **Flexible** - Hierarchical organization + tags
3. ✅ **Scalable** - Works for 10 notes or 10,000 notes
4. ✅ **Standard** - Industry best practice
5. ✅ **Future-Proof** - Easy to extend later

### Next Steps

1. Review this document with team
2. Create migration script
3. Implement backend API
4. Build frontend components
5. User testing and feedback
6. Iterate and improve

---

**Document Version:** 1.0  
**Date:** December 2024  
**Author:** NoteHub Development Team  
**Status:** Proposal - Pending Implementation
