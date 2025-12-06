/**
 * Templates for Notes and Tasks
 * Provides convenient pre-filled content for users to choose from
 */

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

export const noteTemplates: NoteTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Note',
    icon: 'fa-file',
    title: '',
    body: '',
    tags: '',
    description: 'Start from scratch with an empty note',
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
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
    description: 'Template for recording meeting discussions and action items',
  },
  {
    id: 'project-planning',
    name: 'Project Planning',
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
    description: 'Plan and organize project details and milestones',
  },
  {
    id: 'daily-journal',
    name: 'Daily Journal',
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
    description: 'Reflect on your day and plan for tomorrow',
  },
  {
    id: 'research-notes',
    name: 'Research Notes',
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
    description: 'Organize research findings and references',
  },
  {
    id: 'recipe',
    name: 'Recipe',
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
    description: 'Save your favorite recipes',
  },
  {
    id: 'book-notes',
    name: 'Book Notes',
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
    description: 'Record insights from books you read',
  },
  {
    id: 'bug-report',
    name: 'Bug Report',
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
    description: 'Document and track software bugs',
  },
  {
    id: 'travel-planning',
    name: 'Travel Planning',
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
    description: 'Plan your trips and keep travel details organized',
  },
];

export const taskTemplates: TaskTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Task',
    icon: 'fa-tasks',
    title: '',
    description: '',
    priority: 'medium',
    templateDescription: 'Start from scratch with an empty task',
  },
  {
    id: 'daily-routine',
    name: 'Daily Routine',
    icon: 'fa-calendar-day',
    title: 'Daily Routine',
    description: 'Complete morning routine, exercise, plan the day',
    priority: 'medium',
    templateDescription: 'Track daily habits and routines',
  },
  {
    id: 'code-review',
    name: 'Code Review',
    icon: 'fa-code',
    title: 'Review Pull Request #',
    description: 'Review code changes, check for bugs, test functionality, provide feedback',
    priority: 'high',
    templateDescription: 'Review and provide feedback on code changes',
  },
  {
    id: 'blog-post',
    name: 'Write Blog Post',
    icon: 'fa-pen',
    title: 'Write Blog Post: [Topic]',
    description: 'Research topic, create outline, write draft, edit, add images, publish',
    priority: 'medium',
    templateDescription: 'Plan and write a blog post',
  },
  {
    id: 'grocery-shopping',
    name: 'Grocery Shopping',
    icon: 'fa-shopping-cart',
    title: 'Grocery Shopping',
    description: 'Buy vegetables, fruits, dairy, proteins, pantry items',
    priority: 'low',
    templateDescription: 'Plan your grocery shopping trip',
  },
  {
    id: 'workout',
    name: 'Workout Session',
    icon: 'fa-dumbbell',
    title: 'Workout Session',
    description:
      'Warm-up (10 min), strength training (30 min), cardio (20 min), cool-down (10 min)',
    priority: 'medium',
    templateDescription: 'Schedule and track workout sessions',
  },
  {
    id: 'study-session',
    name: 'Study Session',
    icon: 'fa-graduation-cap',
    title: 'Study: [Subject/Topic]',
    description:
      'Review notes, complete practice problems, watch video tutorials, create flashcards',
    priority: 'high',
    templateDescription: 'Plan focused study time',
  },
  {
    id: 'home-maintenance',
    name: 'Home Maintenance',
    icon: 'fa-home',
    title: 'Home Maintenance',
    description: 'Clean gutters, change air filters, check smoke detectors, lawn care',
    priority: 'low',
    templateDescription: 'Keep track of home maintenance tasks',
  },
  {
    id: 'birthday-planning',
    name: 'Birthday Planning',
    icon: 'fa-birthday-cake',
    title: 'Plan Birthday: [Name]',
    description: 'Send invitations, order cake, buy decorations, plan activities, buy gift',
    priority: 'medium',
    templateDescription: 'Organize birthday party or celebration',
  },
  {
    id: 'budget-review',
    name: 'Monthly Budget Review',
    icon: 'fa-dollar-sign',
    title: 'Review Monthly Budget',
    description: 'Review expenses, check subscriptions, update savings goals, plan next month',
    priority: 'medium',
    templateDescription: 'Review and plan monthly finances',
  },
  {
    id: 'presentation',
    name: 'Prepare Presentation',
    icon: 'fa-presentation',
    title: 'Prepare Presentation: [Topic]',
    description: 'Create slides, gather data, practice delivery, prepare Q&A, test equipment',
    priority: 'high',
    templateDescription: 'Prepare for an important presentation',
  },
  {
    id: 'car-maintenance',
    name: 'Car Maintenance',
    icon: 'fa-car',
    title: 'Car Maintenance',
    description: 'Oil change, tire rotation, check fluids, wash and vacuum',
    priority: 'low',
    templateDescription: 'Schedule regular car maintenance',
  },
];

/**
 * Get a note template by ID
 */
export function getNoteTemplate(id: string): NoteTemplate | undefined {
  return noteTemplates.find((t) => t.id === id);
}

/**
 * Get a task template by ID
 */
export function getTaskTemplate(id: string): TaskTemplate | undefined {
  return taskTemplates.find((t) => t.id === id);
}
