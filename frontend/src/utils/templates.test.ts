import { describe, it, expect } from 'vitest';
import { noteTemplates, taskTemplates, getNoteTemplate, getTaskTemplate } from './templates';

describe('templates', () => {
  describe('noteTemplates', () => {
    it('should have multiple note templates', () => {
      expect(noteTemplates.length).toBeGreaterThan(0);
    });

    it('should include blank note template', () => {
      const blankTemplate = noteTemplates.find(t => t.id === 'blank');
      expect(blankTemplate).toBeDefined();
      expect(blankTemplate?.name).toBe('Blank Note');
      expect(blankTemplate?.title).toBe('');
      expect(blankTemplate?.body).toBe('');
    });

    it('should include meeting notes template', () => {
      const meetingTemplate = noteTemplates.find(t => t.id === 'meeting-notes');
      expect(meetingTemplate).toBeDefined();
      expect(meetingTemplate?.name).toBe('Meeting Notes');
      expect(meetingTemplate?.body).toContain('Attendees');
      expect(meetingTemplate?.body).toContain('Action Items');
    });

    it('should have valid structure for all templates', () => {
      noteTemplates.forEach(template => {
        expect(template.id).toBeTruthy();
        expect(template.name).toBeTruthy();
        expect(template.icon).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(typeof template.title).toBe('string');
        expect(typeof template.body).toBe('string');
        expect(typeof template.tags).toBe('string');
      });
    });

    it('should have unique IDs', () => {
      const ids = noteTemplates.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(noteTemplates.length);
    });
  });

  describe('taskTemplates', () => {
    it('should have multiple task templates', () => {
      expect(taskTemplates.length).toBeGreaterThan(0);
    });

    it('should include blank task template', () => {
      const blankTemplate = taskTemplates.find(t => t.id === 'blank');
      expect(blankTemplate).toBeDefined();
      expect(blankTemplate?.name).toBe('Blank Task');
      expect(blankTemplate?.title).toBe('');
      expect(blankTemplate?.description).toBe('');
    });

    it('should include daily routine template', () => {
      const routineTemplate = taskTemplates.find(t => t.id === 'daily-routine');
      expect(routineTemplate).toBeDefined();
      expect(routineTemplate?.name).toBe('Daily Routine');
      expect(routineTemplate?.priority).toBe('medium');
    });

    it('should have valid structure for all templates', () => {
      taskTemplates.forEach(template => {
        expect(template.id).toBeTruthy();
        expect(template.name).toBeTruthy();
        expect(template.icon).toBeTruthy();
        expect(template.templateDescription).toBeTruthy();
        expect(typeof template.title).toBe('string');
        expect(typeof template.description).toBe('string');
        expect(['low', 'medium', 'high']).toContain(template.priority);
      });
    });

    it('should have unique IDs', () => {
      const ids = taskTemplates.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(taskTemplates.length);
    });
  });

  describe('getNoteTemplate', () => {
    it('should return a template by ID', () => {
      const template = getNoteTemplate('meeting-notes');
      expect(template).toBeDefined();
      expect(template?.id).toBe('meeting-notes');
    });

    it('should return undefined for invalid ID', () => {
      const template = getNoteTemplate('non-existent');
      expect(template).toBeUndefined();
    });
  });

  describe('getTaskTemplate', () => {
    it('should return a template by ID', () => {
      const template = getTaskTemplate('daily-routine');
      expect(template).toBeDefined();
      expect(template?.id).toBe('daily-routine');
    });

    it('should return undefined for invalid ID', () => {
      const template = getTaskTemplate('non-existent');
      expect(template).toBeUndefined();
    });
  });
});
