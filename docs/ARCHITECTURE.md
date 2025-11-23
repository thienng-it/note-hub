# NoteHub Architecture Documentation

## Overview

NoteHub follows a layered architecture pattern with clear separation of concerns. The application is organized into distinct layers, each with specific responsibilities.

## Architecture Layers

```
┌─────────────────────────────────────────────────┐
│              Presentation Layer                  │
│         (Templates, Forms, Routes)               │
├─────────────────────────────────────────────────┤
│              Service Layer                       │
│         (Business Logic, Validation)             │
├─────────────────────────────────────────────────┤
│              Data Access Layer                   │
│         (Models, Database Sessions)              │
├─────────────────────────────────────────────────┤
│              Infrastructure Layer                │
│         (Database, Extensions, Config)           │
└─────────────────────────────────────────────────┘
```

## Directory Structure

```
src/notehub/
├── __init__.py              # Application factory
├── config.py                # Configuration management
├── database.py              # Database initialization and sessions
├── extensions.py            # Flask extensions (CSRF, etc.)
├── forms.py                 # WTForms definitions
├── models.py                # SQLAlchemy ORM models
├── security.py              # Security utilities (password policy)
├── routes/                  # Route registration
│   └── __init__.py          # Main route orchestration
├── routes_modules/          # Modular route handlers
│   ├── __init__.py          # Route module exports
│   ├── auth_routes.py       # Authentication routes
│   ├── note_routes.py       # Note management routes
│   ├── task_routes.py       # Task management routes
│   ├── profile_routes.py    # User profile routes
│   └── admin_routes.py      # Admin dashboard routes
└── services/                # Business logic layer
    ├── __init__.py
    ├── auth_service.py      # Authentication business logic
    ├── note_service.py      # Note business logic
    ├── task_service.py      # Task business logic
    ├── bootstrap.py         # Application startup utilities
    └── utils.py             # Shared utilities
```

## Layer Responsibilities

### 1. Presentation Layer

**Location**: `routes_modules/`, `forms.py`, `templates/`

**Responsibilities**:
- Handle HTTP requests and responses
- Form validation (WTForms)
- Session management
- Flash messages
- Template rendering
- URL routing

**Key Files**:
- `routes_modules/auth_routes.py` - Login, registration, 2FA, password reset
- `routes_modules/note_routes.py` - Note CRUD, sharing, search
- `routes_modules/task_routes.py` - Task management
- `routes_modules/profile_routes.py` - User profiles, invitations
- `routes_modules/admin_routes.py` - Admin dashboard
- `forms.py` - Form definitions and validation rules

**Example Route**:
```python
@app.route("/login", methods=["GET", "POST"])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        with db() as s:
            user = AuthService.authenticate_user(s, form.username.data, form.password.data)
            if user:
                session["user_id"] = user.id
                return redirect(url_for("index"))
    return render_template("login.html", form=form)
```

### 2. Service Layer

**Location**: `services/`

**Responsibilities**:
- Implement business logic
- Orchestrate operations across multiple models
- Enforce business rules
- Handle complex workflows
- Independent of Flask/HTTP concerns

**Key Services**:

#### AuthService (`auth_service.py`)
- User authentication
- User registration with transaction safety
- Password reset token management
- Password validation

**Methods**:
- `authenticate_user(session, username, password)` - Verify credentials
- `register_user(session, username, password, invitation_token)` - Create user
- `create_password_reset_token(session, username)` - Generate reset token
- `reset_password(session, token, new_password)` - Reset password

#### NoteService (`note_service.py`)
- Note filtering and search
- Access control checking
- Note CRUD operations
- Note sharing logic

**Methods**:
- `get_notes_for_user(session, user, view_type, query, tag_filter)` - Get filtered notes
- `check_note_access(session, note_id, user)` - Check permissions
- `create_note(session, user, title, body, tags, ...)` - Create note
- `update_note(session, note, user, title, body, tags, ...)` - Update note
- `share_note(session, note, shared_by, username, can_edit)` - Share note

#### TaskService (`task_service.py`)
- Task filtering and retrieval
- Task statistics
- Task CRUD operations
- Access control

**Methods**:
- `get_tasks_for_user(session, user, filter_type)` - Get filtered tasks
- `get_task_counts(session, user)` - Get task statistics
- `create_task(session, user, title, description, ...)` - Create task
- `update_task(session, task, title, description, ...)` - Update task
- `toggle_task_completion(session, task)` - Toggle completion
- `check_task_access(session, task_id, user)` - Check permissions

**Example Service Method**:
```python
@staticmethod
def authenticate_user(session: Session, username: str, password: str) -> Optional[User]:
    """Authenticate a user with username and password."""
    user = session.execute(
        select(User).where(User.username == username)
    ).scalar_one_or_none()
    
    if user and user.check_password(password):
        return user
    return None
```

### 3. Data Access Layer

**Location**: `models.py`, `database.py`

**Responsibilities**:
- Define database schema (SQLAlchemy models)
- Provide database session management
- Handle database connections
- Define relationships between models

**Key Models**:
- `User` - User accounts, authentication, profiles
- `Note` - Notes with markdown support, tags
- `Task` - Task management with priorities
- `Tag` - Tags for organizing notes
- `ShareNote` - Note sharing permissions
- `Invitation` - User invitation system
- `PasswordResetToken` - Password reset tokens

**Session Management**:
```python
with db() as session:
    # Perform database operations
    session.commit()  # Or rollback automatically on error
```

### 4. Infrastructure Layer

**Location**: `config.py`, `database.py`, `extensions.py`

**Responsibilities**:
- Application configuration
- Database initialization
- Extension setup (CSRF, etc.)
- Environment variable management

## Design Patterns

### 1. Service Pattern
Services encapsulate business logic and provide a clean API for routes to use.

**Benefits**:
- Testable business logic
- Reusable across routes
- Clear separation of concerns
- Easy to mock for testing

### 2. Repository Pattern (Implicit)
Models serve as repositories with SQLAlchemy providing the data access abstraction.

### 3. Dependency Injection (Context Manager)
Database sessions are injected via context manager:
```python
with db() as session:
    # Use session
```

### 4. Factory Pattern
Application created via factory function:
```python
app = create_app(config)
```

## Request Flow

```
1. HTTP Request
   ↓
2. Flask Route Handler (routes_modules/)
   ↓
3. Form Validation (forms.py)
   ↓
4. Service Layer (services/)
   ↓
5. Data Access Layer (models.py)
   ↓
6. Database (SQLite/PostgreSQL)
   ↓
7. Response (templates/)
```

**Example Flow - User Login**:
```
1. POST /login
2. login() in auth_routes.py
3. LoginForm.validate_on_submit()
4. AuthService.authenticate_user()
5. User.check_password()
6. Database query
7. Set session, redirect to index
```

## Testing Strategy

### Unit Tests
Services can be tested independently with mocked database sessions:
```python
def test_authenticate_user():
    mock_session = Mock()
    user = AuthService.authenticate_user(mock_session, "admin", "password")
    assert user is not None
```

### Integration Tests
Routes can be tested with test database:
```python
def test_login_route(client):
    response = client.post('/login', data={'username': 'admin', 'password': 'test'})
    assert response.status_code == 302
```

## Security Considerations

### Authentication & Authorization
- Password hashing with Werkzeug
- CSRF protection via Flask-WTF
- Session-based authentication
- Optional 2FA with TOTP
- Permission checking in services

### Input Validation
- WTForms for form validation
- Password policy enforcement
- HTML sanitization with bleach
- SQL injection prevention via SQLAlchemy

### Security Best Practices
- Environment-based configuration
- Secure session cookies
- HTTPS in production (via proxy)
- Regular security updates

## Performance Optimizations

### Database
- Connection pooling (`pool_pre_ping`, `pool_recycle`)
- Strategic indexes on frequently queried columns
- Eager loading with `joinedload`/`selectinload`
- Query optimization

### Caching
- Response headers for no-cache on sensitive pages
- Theme storage in session

## Extending the Architecture

### Adding a New Feature

1. **Create Models** (if needed)
   ```python
   # models.py
   class NewFeature(Base):
       __tablename__ = "new_features"
       # Define columns
   ```

2. **Create Service**
   ```python
   # services/new_feature_service.py
   class NewFeatureService:
       @staticmethod
       def create_feature(session, user, data):
           # Business logic
   ```

3. **Create Routes**
   ```python
   # routes_modules/new_feature_routes.py
   def register_new_feature_routes(app):
       @app.route("/new-feature")
       def new_feature():
           # Use service
   ```

4. **Create Forms**
   ```python
   # forms.py
   class NewFeatureForm(FlaskForm):
       # Define fields
   ```

5. **Create Templates**
   ```html
   <!-- templates/new_feature.html -->
   ```

6. **Register Routes**
   ```python
   # routes/__init__.py
   from ..routes_modules import register_new_feature_routes
   register_new_feature_routes(app)
   ```

## Migration from Legacy Code

The codebase has been incrementally refactored:

1. **Phase 1**: Split monolithic routes file into modules ✅
2. **Phase 2**: Extract business logic into services ✅
3. **Phase 3**: Add comprehensive testing (in progress)
4. **Phase 4**: Implement repository pattern (planned)

## Best Practices

### Routes
- Keep routes thin - delegate to services
- Handle only HTTP concerns
- Use appropriate HTTP status codes
- Provide clear error messages

### Services
- Make methods static when possible
- Return clear success/error tuples
- Keep methods focused and single-purpose
- Document parameters and return values

### Models
- Use SQLAlchemy relationships appropriately
- Add indexes for frequently queried columns
- Implement helper methods for common operations
- Use proper constraints and defaults

### Testing
- Write unit tests for services
- Write integration tests for routes
- Test edge cases and error conditions
- Mock external dependencies

## Future Improvements

1. **Repository Pattern**: Explicit repository classes for data access
2. **Dependency Injection**: More formal DI container
3. **API Layer**: RESTful API endpoints
4. **Async Support**: For long-running operations
5. **Caching Layer**: Redis for session and data caching
6. **Event System**: For cross-cutting concerns
7. **Background Jobs**: Celery for async tasks

## References

- [Flask Best Practices](https://flask.palletsprojects.com/patterns/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Service Layer Pattern](https://martinfowler.com/eaaCatalog/serviceLayer.html)
