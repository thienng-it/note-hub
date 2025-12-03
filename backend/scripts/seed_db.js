/**
 * Database Seed Script
 * 
 * Creates default admin and demo users with sample data.
 * Run with: npm run seed
 */
require('dotenv').config();

const { initializeSequelize, syncDatabase, closeDatabase, User, Tag, Note, Task, NoteTag } = require('../src/models');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    console.log('🌱 Starting database seed...');
    
    await initializeSequelize();
    await syncDatabase();

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
    const existingAdmin = await User.findOne({ where: { username: 'admin' } });
    if (!existingAdmin) {
      await User.create({
        username: 'admin',
        password_hash: adminHash,
        email: 'admin@notehub.local',
        bio: 'NoteHub Administrator'
      });
      console.log('✅ Created admin user');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // Create demo user
    let demoUser = await User.findOne({ where: { username: 'demo' } });
    if (!demoUser) {
      demoUser = await User.create({
        username: 'demo',
        password_hash: demoHash,
        email: 'demo@notehub.local',
        bio: 'Demo user account for testing'
      });
      console.log('✅ Created demo user');
    } else {
      console.log('ℹ️  Demo user already exists');
    }
    const demoUserId = demoUser.id;

    // Create sample tags
    const tagNames = ['work', 'personal', 'ideas', 'important', 'todo'];
    const tags = {};
    for (const tagName of tagNames) {
      const [tag] = await Tag.findOrCreate({ where: { name: tagName } });
      tags[tagName] = tag;
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
        tags: ['important', 'ideas']
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
        tags: ['work', 'todo']
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
        tags: ['personal', 'ideas']
      }
    ];

    for (const noteData of sampleNotes) {
      const existing = await Note.findOne({
        where: { title: noteData.title, owner_id: demoUserId }
      });
      
      if (!existing) {
        const note = await Note.create({
          title: noteData.title,
          body: noteData.body,
          pinned: noteData.pinned || false,
          favorite: noteData.favorite || false,
          owner_id: demoUserId
        });
        
        // Add tags
        if (noteData.tags) {
          for (const tagName of noteData.tags) {
            const tag = tags[tagName];
            if (tag) {
              await NoteTag.findOrCreate({
                where: { note_id: note.id, tag_id: tag.id }
              });
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
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days from now
      },
      {
        title: 'Set up development environment',
        description: 'Install necessary tools and configure the development environment.',
        priority: 'medium',
        completed: true
      },
      {
        title: 'Write documentation',
        description: 'Create comprehensive documentation for the project.',
        priority: 'low',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      }
    ];

    for (const taskData of sampleTasks) {
      const existing = await Task.findOne({
        where: { title: taskData.title, owner_id: demoUserId }
      });
      
      if (!existing) {
        await Task.create({
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          completed: taskData.completed || false,
          due_date: taskData.due_date || null,
          owner_id: demoUserId
        });
      }
    }
    console.log('✅ Created sample tasks');

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('Default credentials:');
    console.log('  Admin: admin / [NOTES_ADMIN_PASSWORD from .env]');
    console.log('  Demo:  demo / Demo12345678!\n');

    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

seed();
