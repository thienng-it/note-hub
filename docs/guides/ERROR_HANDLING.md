# Error Handling Guide

This document explains the error handling strategy implemented in the Note Hub application.

## Overview

The application implements comprehensive error handling for all database operations to ensure:
- **Data consistency**: Automatic rollback on errors prevents partial commits
- **User-friendly messages**: Clear, actionable error messages for common issues
- **Debug support**: Detailed logging for troubleshooting
- **Security**: Error messages don't expose sensitive system information

## Error Categories

### 1. IntegrityError

**Cause**: Database constraint violations (unique constraints, foreign key violations, etc.)

**Examples**:
- Duplicate usernames
- Duplicate tag associations (though now prevented by code)
- Foreign key constraint violations

**Handling**:
```python
try:
    # Database operation
    session.commit()
except IntegrityError as exc:
    session.rollback()
    logger.error(f"Integrity error: {exc}")
    flash("Error: Database constraint violation. Please check your data.", "error")
```

**User Message**: "Error: Database constraint violation. Please check your data."

### 2. SQLAlchemyError

**Cause**: General database errors (connection issues, syntax errors, etc.)

**Examples**:
- Database connection timeout
- SQL syntax errors (rare in ORM)
- Transaction deadlocks

**Handling**:
```python
try:
    # Database operation
    session.commit()
except SQLAlchemyError as exc:
    session.rollback()
    logger.error(f"Database error: {exc}")
    flash("Error: Database error occurred. Please try again.", "error")
```

**User Message**: "Error: Database error occurred. Please try again."

### 3. Generic Exception

**Cause**: Unexpected errors not covered by specific handlers

**Examples**:
- Programming errors
- File system issues
- Third-party library errors

**Handling**:
```python
try:
    # Database operation
    session.commit()
except Exception as exc:
    session.rollback()
    logger.error(f"Unexpected error: {exc}")
    flash("Error: An unexpected error occurred. Please try again.", "error")
```

**User Message**: "Error: An unexpected error occurred. Please try again."

## Implementation Patterns

### Web Routes (Flask)

```python
import logging
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

logger = logging.getLogger(__name__)

@app.route("/resource", methods=["POST"])
def create_resource():
    try:
        with db() as s:
            # Create resource
            resource = Resource(...)
            s.add(resource)
            s.commit()
            flash("Resource created!", "success")
            return redirect(url_for("view_resource"))
    except IntegrityError as exc:
        s.rollback()
        logger.error(f"Integrity error creating resource: {exc}")
        flash("Error: Database constraint violation.", "error")
    except SQLAlchemyError as exc:
        s.rollback()
        logger.error(f"Database error creating resource: {exc}")
        flash("Error: Database error occurred.", "error")
    except Exception as exc:
        s.rollback()
        logger.error(f"Unexpected error creating resource: {exc}")
        flash("Error: An unexpected error occurred.", "error")
```

### API Routes (JSON)

```python
import logging
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

logger = logging.getLogger(__name__)

@app.route("/api/resources", methods=["POST"])
def api_create_resource():
    try:
        with db() as s:
            # Create resource
            resource = Resource(...)
            s.add(resource)
            s.commit()
            return jsonify({'resource': {...}}), 201
    except IntegrityError as exc:
        logger.error(f"Integrity error: {exc}")
        return jsonify({'error': 'Database constraint violation'}), 400
    except SQLAlchemyError as exc:
        logger.error(f"Database error: {exc}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as exc:
        logger.error(f"Unexpected error: {exc}")
        return jsonify({'error': 'An unexpected error occurred'}), 500
```

## Tag-Specific Error Handling

### Duplicate Tags

The application handles duplicate tags gracefully:

1. **Input parsing**: `parse_tags()` removes duplicate tag names from input
2. **Database check**: Before adding a tag to a note, checks if already associated
3. **Race condition handling**: Concurrent tag creation is handled with try/catch

```python
def _process_tags(session: Session, note: Note, tags_str: str) -> None:
    note.tags.clear()
    session.flush()  # Clear associations
    
    tag_names = parse_tags(tags_str)  # Removes duplicates
    for tag_name in tag_names:
        tag = session.execute(
            select(Tag).where(Tag.name == tag_name)
        ).scalar_one_or_none()
        
        if not tag:
            tag = Tag(name=tag_name)
            session.add(tag)
            try:
                session.flush()  # Get tag ID
            except IntegrityError:
                # Tag created by concurrent request
                session.rollback()
                tag = session.execute(
                    select(Tag).where(Tag.name == tag_name)
                ).scalar_one_or_none()
        
        # Only add if not already attached
        if tag not in note.tags:
            note.tags.append(tag)
```

## Session Management

### Proper Flush Operations

To avoid SQLAlchemy warnings and ensure data consistency:

```python
# Add object to session BEFORE processing relationships
note = Note(title="Test")
session.add(note)
session.flush()  # Note now has an ID

# Process relationships
for tag_name in tag_names:
    tag = get_or_create_tag(session, tag_name)
    note.tags.append(tag)

session.flush()  # Flush associations
session.commit()  # Commit transaction
```

### Rollback on Error

Always rollback the session on error to prevent partial commits:

```python
try:
    # Operations
    session.commit()
except Exception as exc:
    session.rollback()  # CRITICAL: Rollback on error
    logger.error(f"Error: {exc}")
    raise
```

## Logging Strategy

### Log Levels

- **ERROR**: Database errors, unexpected exceptions
- **WARNING**: Recoverable issues, deprecated features
- **INFO**: Normal operation, user actions
- **DEBUG**: Detailed debugging information

### Log Format

```python
logger.error(f"Integrity error creating note: {exc}")
# Output: ERROR:notehub.routes_modules.note_routes:Integrity error creating note: UNIQUE constraint failed: tags.name
```

### What to Log

✅ **Do log**:
- Exception type and message
- Operation being performed
- User ID (not username or email)
- Resource IDs

❌ **Don't log**:
- Passwords or tokens
- Personal information (email, real names)
- Full request bodies with sensitive data
- Database connection strings with passwords

## Testing Error Handling

### Test Structure

```python
def test_error_handling(db_session, test_user):
    """Test that errors are handled gracefully."""
    try:
        # Operation that should fail
        service.operation_that_fails(...)
        assert False, "Should have raised an exception"
    except ExpectedException as exc:
        # Verify error message
        assert "expected message" in str(exc)
```

### Mock Errors

```python
from unittest.mock import patch

def test_database_error_handling(client, test_user):
    """Test handling of database errors."""
    with patch('src.notehub.database.SessionLocal') as mock_session:
        mock_session.return_value.commit.side_effect = SQLAlchemyError("DB error")
        
        response = client.post('/note/new', data={...})
        assert b'Database error occurred' in response.data
```

## Best Practices

1. **Always rollback on error**: Prevents partial commits
2. **Log before raising**: Ensure errors are logged even if caught elsewhere
3. **User-friendly messages**: Don't expose technical details to users
4. **Specific error types**: Catch specific exceptions before generic ones
5. **Module-level loggers**: Import logging at module level, not in functions
6. **Test error paths**: Write tests for error handling, not just happy paths
7. **Document error behavior**: Explain what errors mean and how to fix them

## Common Error Scenarios

### Scenario 1: Duplicate Username

**Cause**: User registration with existing username

**Error Type**: IntegrityError

**Resolution**: Inform user to choose different username

### Scenario 2: Database Connection Lost

**Cause**: Network issue or database service restart

**Error Type**: SQLAlchemyError

**Resolution**: Automatic retry (connection pooling), inform user to retry

### Scenario 3: Concurrent Tag Creation

**Cause**: Two requests creating same tag simultaneously

**Error Type**: IntegrityError (caught and handled)

**Resolution**: Automatic - fetch existing tag and continue

### Scenario 4: Foreign Key Violation

**Cause**: Deleting user with associated notes

**Error Type**: IntegrityError

**Resolution**: Cascade delete or prevent deletion with message

## Monitoring and Alerting

### Metrics to Track

1. **Error rate**: Percentage of requests resulting in errors
2. **Error types**: Distribution of IntegrityError vs SQLAlchemyError vs generic
3. **Error frequency**: Spike detection for systemic issues
4. **Response time**: Degradation indicating database issues

### Alert Thresholds

- Error rate > 5%: Warning
- Error rate > 10%: Critical
- Database connection errors > 3 in 1 minute: Critical
- Repeated IntegrityError on same resource: Potential bug

## Future Improvements

1. **Retry logic**: Automatic retry for transient errors
2. **Circuit breaker**: Prevent cascading failures
3. **Error reporting**: Automatic bug reporting for unexpected errors
4. **User feedback**: Collect user feedback on error messages
5. **Metrics dashboard**: Real-time error monitoring
