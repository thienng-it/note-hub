# Drone CI Trigger Configuration Fix

## Problem

When users forked the NoteHub repository and attempted to trigger manual builds in Drone CI, the builds were being skipped with the following errors:

```json
{
  "msg": "trigger: skipping pipeline, does not match event",
  "event": "custom"
}
{
  "msg": "trigger: skipping build, no matching pipelines"
}
{
  "msg": "trigger: skipping pipeline, does not match branch"
}
```

## Root Cause

The `.drone.yml` configuration had two issues:

1. **Missing Custom Event**: The trigger configuration only allowed `push` and `pull_request` events. Manual triggers in Drone CI use the `custom` event type.

2. **Branch Restrictions**: The trigger had explicit branch restrictions that prevented builds on branches not matching the patterns (main, develop, feature/*, bugfix/*).

## Solution

### Changes Made

1. **Added Custom Event Support**
   - Added `custom` to the list of allowed events in the trigger configuration
   - This enables manual/custom builds from the Drone CI UI

2. **Removed Branch Restrictions**
   - Commented out the branch restrictions to allow builds on all branches
   - This is particularly important for forked repositories where branch names may differ

### Updated Configuration

**Before:**
```yaml
trigger:
  event:
    - push
    - pull_request
  
  branch:
    - main
    - develop
    - feature/*
    - bugfix/*
```

**After:**
```yaml
trigger:
  # Run on push, pull request, and manual/custom triggers
  event:
    - push
    - pull_request
    - custom
  
  # Run on all branches (no restrictions to allow forked repos)
  # Leave empty or remove to allow all branches
  # Uncomment to restrict specific branches:
  # branch:
  #   - main
  #   - develop
  #   - feature/*
  #   - bugfix/*
```

## Testing

A new test script `tests/test-drone-trigger.sh` has been added to validate:

1. ✅ `.drone.yml` and `.drone.yml.example` exist
2. ✅ YAML syntax is valid
3. ✅ `custom` event is configured
4. ✅ `push` event is still configured
5. ✅ `pull_request` event is still configured
6. ✅ No active branch restrictions

Run the test:
```bash
./tests/test-drone-trigger.sh
```

## Impact

### Benefits
- ✅ Users can now trigger manual builds from forked repositories
- ✅ All branches are supported, not just specific patterns
- ✅ Existing automatic triggers (push, pull_request) continue to work
- ✅ No breaking changes to existing functionality

### Backward Compatibility
- ✅ All existing triggers continue to work as before
- ✅ No changes required for users already using push/PR triggers
- ✅ The configuration is more permissive, not more restrictive

## Files Changed

1. `.drone.yml` - Main Drone CI configuration
2. `.drone.yml.example` - Example configuration template
3. `tests/test-drone-trigger.sh` - New test script (added)

## Verification

To verify the fix is working:

1. Fork the repository
2. Enable the repository in your Drone CI instance
3. Navigate to the repository in Drone CI UI
4. Click "New Build" or "Restart" on any commit
5. The build should now execute instead of being skipped

## Additional Notes

- If you want to restrict builds to specific branches, you can uncomment the `branch` section in the trigger configuration
- The `custom` event type is specifically for manual/API-triggered builds
- This fix applies to both `.drone.yml` and `.drone.yml.example` for consistency

## References

- [Drone CI Trigger Documentation](https://docs.drone.io/pipeline/triggers/)
- [Drone CI Custom Events](https://docs.drone.io/pipeline/triggers/#by-event)
