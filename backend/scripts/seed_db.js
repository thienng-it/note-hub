/**
 * Database Seed Script
 *
 * Creates default admin and demo users with sample data.
 * Run with: npm run seed
 */
import dotenv from 'dotenv';

dotenv.config();

import bcrypt from 'bcryptjs';
import db from '../src/config/database.js';

async function seed() {
  try {
    console.log('🌱 Starting database seed...');

    await db.connect();
    await db.initSchema();

    // Get admin password from environment
    const adminPassword = process.env.NOTES_ADMIN_PASSWORD;
    if (!adminPassword || adminPassword.length < 12) {
      console.error('❌ NOTES_ADMIN_PASSWORD must be set and at least 12 characters');
      process.exit(1);
    }

    // Hash passwords
    const adminHash = await bcrypt.hash(adminPassword, 12);
    const demoHash = await bcrypt.hash('Demo12345678!', 12);

    // Create admin user
    const existingAdmin = await db.queryOne(`SELECT id FROM users WHERE username = ?`, ['admin']);
    if (!existingAdmin) {
      await db.run(
        `INSERT INTO users (username, password_hash, email, bio, is_admin) VALUES (?, ?, ?, ?, ?)`,
        ['admin', adminHash, 'admin@notehub.local', 'NoteHub Administrator', 1],
      );
      console.log('✅ Created admin user');
    } else {
      // Update existing admin to have is_admin flag
      await db.run(`UPDATE users SET is_admin = 1 WHERE username = ?`, ['admin']);
      console.log('ℹ️  Admin user already exists - updated is_admin flag');
    }

    // Create demo user
    const existingDemo = await db.queryOne(`SELECT id FROM users WHERE username = ?`, ['demo']);
    let demoUserId;
    if (!existingDemo) {
      const result = await db.run(
        `INSERT INTO users (username, password_hash, email, bio) VALUES (?, ?, ?, ?)`,
        ['demo', demoHash, 'demo@notehub.local', 'Demo user account for testing'],
      );
      demoUserId = result.insertId;
      console.log('✅ Created demo user');
    } else {
      demoUserId = existingDemo.id;
      console.log('ℹ️  Demo user already exists');
    }

    // Create sample tags
    const tags = ['work', 'personal', 'ideas', 'important', 'todo'];
    for (const tagName of tags) {
      const existing = await db.queryOne(`SELECT id FROM tags WHERE name = ?`, [tagName]);
      if (!existing) {
        await db.run(`INSERT INTO tags (name) VALUES (?)`, [tagName]);
      }
    }
    console.log('✅ Created sample tags');

    // Create sample notes for demo user
    const sampleNotes = [
      {
        title: 'Welcome to NoteHub! 👋',
        body: `# Welcome to NoteHub!

This is your personal note-taking application. Here's what you can do:

## Features
- **Create notes** with rich markdown support
- **Organize** with tags and favorites
- **Share** notes with other users
- **Search** across all your notes
- **Dark mode** for comfortable viewing

## Markdown Support
You can use *italic*, **bold**, and \`code\` formatting.

\`\`\`javascript
// Code blocks are supported too!
const greeting = "Hello, NoteHub!";
console.log(greeting);
\`\`\`

Get started by creating your first note! 🚀`,
        pinned: true,
        favorite: true,
        tags: ['important', 'ideas'],
      },
      {
        title: 'Meeting Notes Template',
        body: `# Meeting Notes

**Date:** [Date]
**Attendees:** [Names]
**Topic:** [Meeting Topic]

## Agenda
1. Item 1
2. Item 2
3. Item 3

## Discussion Points
- Point 1
- Point 2

## Action Items
- [ ] Action 1 - @person - Due date
- [ ] Action 2 - @person - Due date

## Next Steps
[Summary of next steps]`,
        tags: ['work', 'todo'],
      },
      {
        title: 'Quick Ideas',
        body: `# 💡 Ideas

- Build a personal website
- Learn a new programming language
- Start a side project
- Read more books
- Travel to a new place`,
        favorite: true,
        tags: ['personal', 'ideas'],
      },
    ];

    for (const noteData of sampleNotes) {
      const existing = await db.queryOne(`SELECT id FROM notes WHERE title = ? AND owner_id = ?`, [
        noteData.title,
        demoUserId,
      ]);

      if (!existing) {
        const result = await db.run(
          `INSERT INTO notes (title, body, pinned, favorite, owner_id) VALUES (?, ?, ?, ?, ?)`,
          [
            noteData.title,
            noteData.body,
            noteData.pinned ? 1 : 0,
            noteData.favorite ? 1 : 0,
            demoUserId,
          ],
        );

        // Add tags
        if (noteData.tags) {
          for (const tagName of noteData.tags) {
            const tag = await db.queryOne(`SELECT id FROM tags WHERE name = ?`, [tagName]);
            if (tag) {
              await db.run(`INSERT OR IGNORE INTO note_tag (note_id, tag_id) VALUES (?, ?)`, [
                result.insertId,
                tag.id,
              ]);
            }
          }
        }
      }
    }
    console.log('✅ Created sample notes');

    // Create sample tasks for demo user
    const sampleTasks = [
      {
        title: 'Review project requirements',
        description: 'Go through the project documentation and note down key requirements.',
        priority: 'high',
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
      },
      {
        title: 'Set up development environment',
        description: 'Install necessary tools and configure the development environment.',
        priority: 'medium',
        completed: true,
      },
      {
        title: 'Write documentation',
        description: 'Create comprehensive documentation for the project.',
        priority: 'low',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      },
    ];

    for (const taskData of sampleTasks) {
      const existing = await db.queryOne(`SELECT id FROM tasks WHERE title = ? AND owner_id = ?`, [
        taskData.title,
        demoUserId,
      ]);

      if (!existing) {
        await db.run(
          `INSERT INTO tasks (title, description, priority, completed, due_date, owner_id) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            taskData.title,
            taskData.description,
            taskData.priority,
            taskData.completed ? 1 : 0,
            taskData.due_date || null,
            demoUserId,
          ],
        );
      }
    }
    console.log('✅ Created sample tasks');

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('Default credentials:');
    console.log('  Admin: admin / [NOTES_ADMIN_PASSWORD from .env]');
    console.log('  Demo:  demo / Demo12345678!\n');

    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

seed();
