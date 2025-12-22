/**
 * Templates for Notes and Tasks
 * Provides convenient pre-filled content for users to choose from
 */

import i18n from '../i18n';

export interface NoteTemplate {
  id: string;
  name: string;
  icon: string;
  title: string;
  body: string;
  tags: string;
  description: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  icon: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  templateDescription: string;
}

export const getNoteTemplates = (): NoteTemplate[] => [
  {
    id: 'blank',
    name: i18n.t('templates.notes.blank.name'),
    icon: 'fa-file',
    title: '',
    body: '',
    tags: '',
    description: i18n.t('templates.notes.blank.desc'),
  },
  {
    id: 'meeting-notes',
    name: i18n.t('templates.notes.meetingNotes.name'),
    icon: 'fa-users',
    title: 'Meeting Notes - [Date]',
    body: `# Meeting Notes

## Attendees
- 
- 

## Agenda
1. 
2. 
3. 

## Discussion
- 

## Action Items
- [ ] 
- [ ] 

## Next Steps
- 
`,
    tags: 'meeting, work',
    description: i18n.t('templates.notes.meetingNotes.desc'),
  },
  {
    id: 'project-planning',
    name: i18n.t('templates.notes.projectPlanning.name'),
    icon: 'fa-project-diagram',
    title: 'Project: [Project Name]',
    body: `# Project Planning

## Overview
Brief description of the project

## Goals
- 
- 
- 

## Timeline
- **Start Date:** 
- **End Date:** 
- **Milestones:**
  - 
  - 

## Resources
- **Team Members:** 
- **Budget:** 
- **Tools:** 

## Risks & Mitigation
- 

## Success Criteria
- 
- 
`,
    tags: 'project, planning',
    description: i18n.t('templates.notes.projectPlanning.desc'),
  },
  {
    id: 'daily-journal',
    name: i18n.t('templates.notes.dailyJournal.name'),
    icon: 'fa-calendar-day',
    title: 'Daily Journal - [Date]',
    body: `# Daily Journal

## Today's Date
[Date]

## What I'm Grateful For
- 
- 
- 

## Goals for Today
- [ ] 
- [ ] 
- [ ] 

## Reflections
### What went well
- 

### What could be improved
- 

### Lessons learned
- 

## Tomorrow's Focus
- 
`,
    tags: 'journal, personal',
    description: i18n.t('templates.notes.dailyJournal.desc'),
  },
  {
    id: 'research-notes',
    name: i18n.t('templates.notes.researchNotes.name'),
    icon: 'fa-book',
    title: 'Research: [Topic]',
    body: `# Research Notes

## Topic
[Research Topic]

## Sources
1. 
2. 
3. 

## Key Findings
- 
- 
- 

## Quotes & References
> 

## Analysis
- 

## Conclusions
- 

## Further Reading
- 
`,
    tags: 'research, study',
    description: i18n.t('templates.notes.researchNotes.desc'),
  },
  {
    id: 'recipe',
    name: i18n.t('templates.notes.recipe.name'),
    icon: 'fa-utensils',
    title: 'Recipe: [Dish Name]',
    body: `# Recipe

## Ingredients
- 
- 
- 

## Instructions
1. 
2. 
3. 

## Prep Time
- **Prep:** 
- **Cook:** 
- **Total:** 

## Servings
[Number] servings

## Notes
- 

## Variations
- 
`,
    tags: 'recipe, cooking',
    description: i18n.t('templates.notes.recipe.desc'),
  },
  {
    id: 'book-notes',
    name: i18n.t('templates.notes.bookNotes.name'),
    icon: 'fa-bookmark',
    title: 'Book: [Title] by [Author]',
    body: `# Book Notes

## Book Information
- **Title:** 
- **Author:** 
- **Published:** 
- **Genre:** 

## Summary
Brief overview of the book

## Key Takeaways
- 
- 
- 

## Favorite Quotes
> 

> 

## Personal Thoughts
- 

## Rating
⭐⭐⭐⭐⭐ / 5
`,
    tags: 'book, reading',
    description: i18n.t('templates.notes.bookNotes.desc'),
  },
  {
    id: 'bug-report',
    name: i18n.t('templates.notes.bugReport.name'),
    icon: 'fa-bug',
    title: 'Bug: [Issue Title]',
    body: `# Bug Report

## Description
Brief description of the bug

## Steps to Reproduce
1. 
2. 
3. 

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- **OS:** 
- **Browser:** 
- **Version:** 

## Screenshots
[Add screenshots if applicable]

## Additional Context
- 

## Priority
- [ ] Low
- [ ] Medium
- [ ] High
- [ ] Critical
`,
    tags: 'bug, development',
    description: i18n.t('templates.notes.bugReport.desc'),
  },
  {
    id: 'travel-planning',
    name: i18n.t('templates.notes.travelPlanning.name'),
    icon: 'fa-plane',
    title: 'Trip to [Destination]',
    body: `# Travel Planning

## Destination
[Location]

## Dates
- **Departure:** 
- **Return:** 
- **Duration:** 

## Transportation
- **Flights:** 
- **Local Transport:** 

## Accommodation
- **Hotel/Airbnb:** 
- **Address:** 
- **Check-in/out:** 

## Itinerary
### Day 1
- 

### Day 2
- 

## Things to Pack
- [ ] 
- [ ] 
- [ ] 

## Budget
- **Flights:** 
- **Accommodation:** 
- **Food:** 
- **Activities:** 
- **Total:** 

## Important Notes
- 
`,
    tags: 'travel, planning',
    description: i18n.t('templates.notes.travelPlanning.desc'),
  },
];

export const getTaskTemplates = (): TaskTemplate[] => [
  {
    id: 'blank',
    name: i18n.t('templates.tasks.blank.name'),
    icon: 'fa-tasks',
    title: '',
    description: '',
    priority: 'medium',
    templateDescription: i18n.t('templates.tasks.blank.desc'),
  },
  {
    id: 'daily-routine',
    name: i18n.t('templates.tasks.dailyRoutine.name'),
    icon: 'fa-calendar-day',
    title: 'Daily Routine',
    description: 'Complete morning routine, exercise, plan the day',
    priority: 'medium',
    templateDescription: i18n.t('templates.tasks.dailyRoutine.desc'),
  },
  {
    id: 'code-review',
    name: i18n.t('templates.tasks.codeReview.name'),
    icon: 'fa-code',
    title: 'Review Pull Request #',
    description: 'Review code changes, check for bugs, test functionality, provide feedback',
    priority: 'high',
    templateDescription: i18n.t('templates.tasks.codeReview.desc'),
  },
  {
    id: 'blog-post',
    name: i18n.t('templates.tasks.blogPost.name'),
    icon: 'fa-pen',
    title: 'Write Blog Post: [Topic]',
    description: 'Research topic, create outline, write draft, edit, add images, publish',
    priority: 'medium',
    templateDescription: i18n.t('templates.tasks.blogPost.desc'),
  },
  {
    id: 'grocery-shopping',
    name: i18n.t('templates.tasks.groceryShopping.name'),
    icon: 'fa-shopping-cart',
    title: 'Grocery Shopping',
    description: 'Buy vegetables, fruits, dairy, proteins, pantry items',
    priority: 'low',
    templateDescription: i18n.t('templates.tasks.groceryShopping.desc'),
  },
  {
    id: 'workout',
    name: i18n.t('templates.tasks.workout.name'),
    icon: 'fa-dumbbell',
    title: 'Workout Session',
    description:
      'Warm-up (10 min), strength training (30 min), cardio (20 min), cool-down (10 min)',
    priority: 'medium',
    templateDescription: i18n.t('templates.tasks.workout.desc'),
  },
  {
    id: 'study-session',
    name: i18n.t('templates.tasks.studySession.name'),
    icon: 'fa-graduation-cap',
    title: 'Study: [Subject/Topic]',
    description:
      'Review notes, complete practice problems, watch video tutorials, create flashcards',
    priority: 'high',
    templateDescription: i18n.t('templates.tasks.studySession.desc'),
  },
  {
    id: 'home-maintenance',
    name: i18n.t('templates.tasks.homeMaintenance.name'),
    icon: 'fa-home',
    title: 'Home Maintenance',
    description: 'Clean gutters, change air filters, check smoke detectors, lawn care',
    priority: 'low',
    templateDescription: i18n.t('templates.tasks.homeMaintenance.desc'),
  },
  {
    id: 'birthday-planning',
    name: i18n.t('templates.tasks.birthdayPlanning.name'),
    icon: 'fa-birthday-cake',
    title: 'Plan Birthday: [Name]',
    description: 'Send invitations, order cake, buy decorations, plan activities, buy gift',
    priority: 'medium',
    templateDescription: i18n.t('templates.tasks.birthdayPlanning.desc'),
  },
  {
    id: 'budget-review',
    name: i18n.t('templates.tasks.budgetReview.name'),
    icon: 'fa-dollar-sign',
    title: 'Review Monthly Budget',
    description: 'Review expenses, check subscriptions, update savings goals, plan next month',
    priority: 'medium',
    templateDescription: i18n.t('templates.tasks.budgetReview.desc'),
  },
  {
    id: 'presentation',
    name: i18n.t('templates.tasks.presentation.name'),
    icon: 'fa-presentation',
    title: 'Prepare Presentation: [Topic]',
    description: 'Create slides, gather data, practice delivery, prepare Q&A, test equipment',
    priority: 'high',
    templateDescription: i18n.t('templates.tasks.presentation.desc'),
  },
  {
    id: 'car-maintenance',
    name: i18n.t('templates.tasks.carMaintenance.name'),
    icon: 'fa-car',
    title: 'Car Maintenance',
    description: 'Oil change, tire rotation, check fluids, wash and vacuum',
    priority: 'low',
    templateDescription: i18n.t('templates.tasks.carMaintenance.desc'),
  },
];

// Keep old exports for backward compatibility
export const noteTemplates = getNoteTemplates();
export const taskTemplates = getTaskTemplates();

/**
 * Get a note template by ID
 */
export function getNoteTemplate(id: string): NoteTemplate | undefined {
  return getNoteTemplates().find((t) => t.id === id);
}

/**
 * Get a task template by ID
 */
export function getTaskTemplate(id: string): TaskTemplate | undefined {
  return getTaskTemplates().find((t) => t.id === id);
}
