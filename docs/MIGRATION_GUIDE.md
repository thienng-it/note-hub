# Migration Guide: Legacy to New Architecture

This guide helps developers understand and work with the new modular architecture.

## What Changed?

### Before (Legacy)
```
src/notehub/
├── routes/
│   └── __init__.py    # 850 lines - all routes in one file
└── services/
    ├── bootstrap.py
    └── utils.py       # Only helper functions
```

### After (New Architecture)
```
src/notehub/
├── routes/
│   └── __init__.py           # 40 lines - orchestration only
├── routes_modules/           # NEW - modular routes
│   ├── auth_routes.py        # Authentication
│   ├── note_routes.py        # Notes
│   ├── task_routes.py        # Tasks
│   ├── profile_routes.py     # Profiles
│   └── admin_routes.py       # Admin
└── services/                 # EXPANDED - business logic
    ├── auth_service.py       # NEW
    ├── note_service.py       # NEW
    ├── task_service.py       # NEW
    ├── bootstrap.py
    └── utils.py
```

## Finding Code in New Structure

### Authentication & Authorization

**Old Location**: `routes/__init__.py` (lines 75-409)

**New Location**: 
- Routes: `routes_modules/auth_routes.py`
- Business Logic: `services/auth_service.py`

**Routes**:
- `/login` - `auth_routes.py:login()`
- `/register` - `auth_routes.py:register()`
- `/logout` - `auth_routes.py:logout()`
- `/forgot-password` - `auth_routes.py:forgot_password()`
- `/reset-password/<token>` - `auth_routes.py:reset_password()`
- `/verify-2fa` - `auth_routes.py:verify_2fa()`
- `/profile/setup-2fa` - `auth_routes.py:setup_2fa()`
- `/profile/disable-2fa` - `auth_routes.py:disable_2fa()`

**Services**:
- `AuthService.authenticate_user()` - Verify credentials
- `AuthService.register_user()` - Create new user
- `AuthService.create_password_reset_token()` - Generate reset token
- `AuthService.reset_password()` - Reset user password

### Notes Management

**Old Location**: `routes/__init__.py` (lines 30-658)

**New Location**:
- Routes: `routes_modules/note_routes.py`
- Business Logic: `services/note_service.py`

**Routes**:
- `/` (index) - `note_routes.py:index()`
- `/note/new` - `note_routes.py:new_note()`
- `/note/<id>` - `note_routes.py:view_note()`
- `/note/<id>/edit` - `note_routes.py:edit_note()`
- `/note/<id>/delete` - `note_routes.py:delete_note()`
- `/note/<id>/toggle-pin` - `note_routes.py:toggle_pin()`
- `/note/<id>/toggle-favorite` - `note_routes.py:toggle_favorite()`
- `/note/<id>/toggle-archive` - `note_routes.py:toggle_archive()`
- `/note/<id>/share` - `note_routes.py:share_note()`
- `/note/<id>/unshare/<share_id>` - `note_routes.py:unshare_note()`

**Services**:
- `NoteService.get_notes_for_user()` - Filter and search notes
- `NoteService.check_note_access()` - Check permissions
- `NoteService.create_note()` - Create new note
- `NoteService.update_note()` - Update existing note
- `NoteService.share_note()` - Share with user

### Task Management

**Old Location**: `routes/__init__.py` (lines 730-828)

**New Location**:
- Routes: `routes_modules/task_routes.py`
- Business Logic: `services/task_service.py`

**Routes**:
- `/tasks` - `task_routes.py:tasks()`
- `/task/new` - `task_routes.py:new_task()`
- `/task/<id>/edit` - `task_routes.py:edit_task()`
- `/task/<id>/toggle` - `task_routes.py:toggle_task()`
- `/task/<id>/delete` - `task_routes.py:delete_task()`

**Services**:
- `TaskService.get_tasks_for_user()` - Get filtered tasks
- `TaskService.get_task_counts()` - Get statistics
- `TaskService.create_task()` - Create new task
- `TaskService.update_task()` - Update task
- `TaskService.toggle_task_completion()` - Toggle status
- `TaskService.check_task_access()` - Check permissions

### User Profiles

**Old Location**: `routes/__init__.py` (lines 679-728)

**New Location**:
- Routes: `routes_modules/profile_routes.py`

**Routes**:
- `/profile` - `profile_routes.py:profile()`
- `/profile/edit` - `profile_routes.py:edit_profile()`
- `/user/<id>` - `profile_routes.py:view_user_profile()`
- `/invite` - `profile_routes.py:invite()`
- `/toggle-theme` - `profile_routes.py:toggle_theme()`

### Admin Dashboard

**Old Location**: `routes/__init__.py` (lines 224-282)

**New Location**:
- Routes: `routes_modules/admin_routes.py`

**Routes**:
- `/admin/users` - `admin_routes.py:admin_users()`

## Code Examples

### Example 1: Adding a New Route

**Before (Legacy)**:
```python
# routes/__init__.py
def register_routes(app):
    @app.route("/my-route")
    def my_route():
        # All logic here
        with db() as s:
            user = s.execute(select(User)...).scalar()
            # More database queries
            # Business logic
            # Validation
        return render_template("my_template.html")
```

**After (New Architecture)**:

**Step 1: Create Service** (if needed)
```python
# services/my_service.py
class MyService:
    @staticmethod
    def do_something(session: Session, user: User) -> Result:
        """Business logic here."""
        # Complex operations
        return result
```

**Step 2: Create Route Module**
```python
# routes_modules/my_routes.py
from ..services.my_service import MyService
from ..services.utils import current_user, db, login_required

def register_my_routes(app):
    @app.route("/my-route")
    @login_required
    def my_route():
        user = current_user()
        with db() as s:
            result = MyService.do_something(s, user)
            s.commit()
        return render_template("my_template.html", result=result)
```

**Step 3: Register Routes**
```python
# routes/__init__.py
from ..routes_modules import register_my_routes

def register_routes(app):
    # ... other registrations
    register_my_routes(app)
```

### Example 2: Refactoring Existing Code

**Before**:
```python
@app.route("/login", methods=["GET", "POST"])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        with db() as s:
            user = s.execute(
                select(User).where(User.username == form.username.data)
            ).scalar_one_or_none()
            
            if user and user.check_password(form.password.data):
                session["user_id"] = user.id
                user.last_login = datetime.now(timezone.utc)
                s.commit()
                return redirect(url_for("index"))
        flash("Invalid credentials", "error")
    return render_template("login.html", form=form)
```

**After**:
```python
# Service
class AuthService:
    @staticmethod
    def authenticate_user(session, username, password):
        user = session.execute(
            select(User).where(User.username == username)
        ).scalar_one_or_none()
        if user and user.check_password(password):
            return user
        return None
    
    @staticmethod
    def update_last_login(session, user):
        user.last_login = datetime.now(timezone.utc)

# Route
@app.route("/login", methods=["GET", "POST"])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        with db() as s:
            user = AuthService.authenticate_user(
                s, form.username.data, form.password.data
            )
            if user:
                session["user_id"] = user.id
                AuthService.update_last_login(s, user)
                s.commit()
                return redirect(url_for("index"))
        flash("Invalid credentials", "error")
    return render_template("login.html", form=form)
```

### Example 3: Testing

**Before (Integration Test Only)**:
```python
def test_login(client):
    response = client.post('/login', data={
        'username': 'admin',
        'password': 'test'
    })
    assert response.status_code == 302
```

**After (Unit + Integration Tests)**:

**Unit Test (Service)**:
```python
def test_authenticate_user():
    session = Mock()
    user = Mock()
    user.check_password.return_value = True
    
    session.execute.return_value.scalar_one_or_none.return_value = user
    
    result = AuthService.authenticate_user(session, "admin", "test")
    assert result == user
```

**Integration Test (Route)**:
```python
def test_login_route(client):
    response = client.post('/login', data={
        'username': 'admin',
        'password': 'test'
    })
    assert response.status_code == 302
```

## Common Tasks

### Task 1: Add a New Feature

1. **Plan** - Identify required routes, services, models
2. **Models** - Add database models if needed
3. **Services** - Create service class with business logic
4. **Routes** - Create route module
5. **Forms** - Add form definitions
6. **Templates** - Create HTML templates
7. **Register** - Add route registration
8. **Test** - Write unit and integration tests

### Task 2: Fix a Bug in Authentication

1. **Locate** - Check `routes_modules/auth_routes.py` for route
2. **Check Service** - Review `services/auth_service.py` for logic
3. **Fix** - Make changes in appropriate layer
4. **Test** - Run tests to verify fix
5. **Commit** - Commit with clear message

### Task 3: Add Business Logic to Existing Route

1. **Identify Route** - Find in `routes_modules/`
2. **Extract Logic** - Move business logic to service
3. **Create Service Method** - Add to appropriate service class
4. **Update Route** - Call service method from route
5. **Test** - Ensure functionality unchanged

### Task 4: Optimize Database Query

1. **Locate Query** - Check service methods
2. **Analyze** - Use SQLAlchemy query logging
3. **Optimize** - Add indexes, eager loading, etc.
4. **Verify** - Check performance improvement
5. **Document** - Add comments about optimization

## Benefits of New Architecture

### 1. Better Organization
- Each file has single, clear purpose
- Easy to find relevant code
- Logical grouping by feature

### 2. Easier Testing
- Business logic testable independently
- Mock dependencies easily
- Faster unit tests

### 3. Improved Maintainability
- Changes isolated to relevant modules
- Less risk of breaking unrelated features
- Clear dependencies

### 4. Better Reusability
- Services can be used across routes
- Common patterns extracted
- DRY principle

### 5. Clearer Responsibilities
- Routes: HTTP concerns only
- Services: Business logic only
- Models: Data access only

## Backward Compatibility

All changes are **100% backward compatible**:

- ✅ All routes work as before
- ✅ All URLs unchanged
- ✅ All functionality preserved
- ✅ All templates work
- ✅ No database changes required
- ✅ Existing tests pass

## Getting Help

### Documentation
- `docs/ARCHITECTURE.md` - Complete architecture overview
- `docs/DATABASE_FLOW.md` - Database operations guide
- Code comments - Inline documentation

### Finding Specific Functionality
1. Check `routes_modules/` for route handlers
2. Check `services/` for business logic
3. Check `models.py` for data models
4. Check `forms.py` for form definitions

### Common Questions

**Q: Where should I put database queries?**
A: In service methods. Routes should only call services.

**Q: Where should I put validation?**
A: Form validation in `forms.py`, business validation in services.

**Q: How do I add a new route?**
A: Create method in appropriate `routes_modules/` file, or create new module.

**Q: Can I still access the database directly in routes?**
A: Yes, but prefer using services for testability and reusability.

**Q: How do I test my changes?**
A: Write unit tests for services, integration tests for routes.

## Checklist for New Features

- [ ] Models updated (if needed)
- [ ] Service methods created
- [ ] Service methods have docstrings
- [ ] Routes created in appropriate module
- [ ] Forms created (if needed)
- [ ] Templates created
- [ ] Routes registered in `routes/__init__.py`
- [ ] Unit tests for services
- [ ] Integration tests for routes
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] All tests passing

## Next Steps

The architecture will continue to evolve:

- **Phase 3**: Add comprehensive test suite
- **Phase 4**: Implement repository pattern
- **Phase 5**: Add API layer
- **Phase 6**: Improve caching and performance

Stay tuned for updates!
