---
description: Rule for adding test cases when bugs or issues are discovered
---

# Testing Rule for AI Agents

When something goes wrong or a bug is discovered in the NoteHub application, AI agents should follow this workflow to add new test cases.

## When to Add New Tests

Add new E2E test cases when:

1. **A bug is discovered** - Create a test that reproduces the bug, then fix the bug
2. **A regression occurs** - Add a test to prevent the same issue from happening again
3. **Edge case failure** - Add tests for edge cases that weren't previously covered
4. **User-reported issues** - Create tests that verify the reported behavior

## Workflow

### 1. Identify the Issue

Document what went wrong:
- What action was being performed?
- What was the expected behavior?
- What was the actual behavior?
- What conditions triggered the issue?

### 2. Create a Failing Test First

Navigate to the appropriate test file in `/e2e/tests/`:

- `01_auth_test.js` - Authentication issues
- `02_register_test.js` - Registration issues
- `03_notes_crud_test.js` - Note CRUD issues
- `04_notes_features_test.js` - Note search/filter issues
- `05_notes_folders_test.js` - Folder issues
- `06_notes_sharing_test.js` - Sharing issues
- `07_tasks_crud_test.js` - Task CRUD issues
- `08_tasks_features_test.js` - Task filter/sort issues
- `09_profile_test.js` - Profile issues
- `10_settings_test.js` - Theme/language issues
- `11_admin_test.js` - Admin dashboard issues
- `12_2fa_test.js` - 2FA issues
- `13_edge_cases_test.js` - Edge cases and error handling
- `14_critical_path_test.js` - Critical user journeys

### 3. Test Case Template

```javascript
Scenario('BUG-XXX: Description of the bug', async ({ I, pageName }) => {
  // Step 1: Setup - recreate the conditions
  
  // Step 2: Perform the action that triggered the bug
  
  // Step 3: Verify the expected behavior (this should fail before fix)
  
  // Step 4: After fix, this test should pass
});
```

### 4. Naming Convention

Use this format for bug-related tests:
- `BUG-XXX: Brief description of the issue`
- `REGRESSION: Feature that regressed`
- `EDGE-CASE: Specific edge case description`

### 5. Run the Test

```bash
# Run specific test file
cd e2e && npx codeceptjs run tests/XX_test.js --grep "BUG-XXX"

# Run all tests to ensure no regression
cd e2e && npm test
```

### 6. Fix the Bug

After the failing test is in place:
1. Fix the bug in the application code
2. Verify the test now passes
3. Run the full test suite to ensure no regressions

### 7. Document the Fix

Add a comment in the test explaining:
- What the bug was
- When it was discovered
- What the fix was

## Example

```javascript
/**
 * BUG: Note creation failed silently when content exceeded 50,000 characters
 * Discovered: 2026-01-25
 * Fixed: Added client-side validation and proper error message
 */
Scenario('BUG-001: Note with very long content should show validation error', async ({ I, notesPage }) => {
  notesPage.goto();
  notesPage.clickCreateNote();
  
  // Create content exceeding limit
  const veryLongContent = 'A'.repeat(60000);
  I.fillField(notesPage.editor.contentInput, veryLongContent);
  I.click(notesPage.editor.saveBtn);
  
  // Should show error instead of silent failure
  I.waitForElement('[class*="error"]', 5);
  I.see('content too long');
});
```

## Categories of Tests to Add

### Security Issues
- XSS vulnerabilities
- CSRF issues
- Authentication bypasses
- Authorization failures

### Data Integrity Issues
- Data loss scenarios
- Concurrent modification conflicts
- Validation bypasses

### UI/UX Issues
- Broken layouts on specific viewports
- Missing loading states
- Unclear error messages
- Accessibility problems

### Performance Issues
- Slow page loads
- Memory leaks
- Infinite loops

## Integration with CI/CD

When new tests are added:
1. Ensure they pass in the CI/CD pipeline
2. Mark flaky tests appropriately
3. Update test documentation if needed
