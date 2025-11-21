"""
✨ Beautiful Personal Notes App ✨

An elegant, secure, and feature-rich notes application for personal use.

Features:
🔐 Secure authentication with CSRF protection
📝 Rich markdown editing with live preview
🏷️ Smart tagging system with autocomplete
🔍 Powerful search with filters
📱 Beautiful responsive design
🌙 Dark/light theme support
📊 Dashboard with statistics
🎨 Modern UI with animations
"""

import os
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from flask import Flask, render_template, request, redirect, url_for, session, flash, abort, make_response
from flask_wtf import FlaskForm, CSRFProtect
from wtforms import StringField, TextAreaField, BooleanField, PasswordField, DateField, SelectField
from wtforms.validators import DataRequired, Length, Optional as OptionalValidator, EqualTo
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, Table, ForeignKey, select, func, text
from sqlalchemy.sql import case
from sqlalchemy.orm import declarative_base, relationship, sessionmaker, scoped_session, aliased, joinedload, selectinload
import markdown as md
import bleach

# Enhanced Configuration
DB_PATH = os.getenv("NOTES_DB_PATH", "notes.db")
ADMIN_USERNAME = os.getenv("NOTES_ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("NOTES_ADMIN_PASSWORD", "change-me")
SECRET_KEY = os.getenv("FLASK_SECRET", secrets.token_hex(32))

# Flask app setup with enhanced config
app = Flask(__name__)
app.config.update(
    SECRET_KEY=SECRET_KEY,
    WTF_CSRF_ENABLED=True,
    MAX_CONTENT_LENGTH=16 * 1024 * 1024  # 16MB max file size
)

csrf = CSRFProtect(app)

# Database setup
engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)
Base = declarative_base()
SessionLocal = scoped_session(sessionmaker(bind=engine))

# Models (simplified from original)
note_tag = Table(
    "note_tag", Base.metadata,
    Column("note_id", Integer, ForeignKey("notes.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True),
)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    username = Column(String(64), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    theme = Column(String(20), default="light", nullable=False)  # light/dark theme
    bio = Column(Text, nullable=True)  # User bio
    email = Column(String(255), nullable=True)  # User email
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, nullable=True)

    def set_password(self, password: str):
        if len(password) < 6:
            raise ValueError("Password must be at least 6 characters")
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", backref="reset_tokens")
    
    def is_valid(self) -> bool:
        """Check if token is valid (not expired and not used)"""
        if self.used:
            return False
        
        # Ensure both datetimes are timezone-aware for comparison
        now = datetime.now(timezone.utc)
        expires = self.expires_at
        
        # If expires_at is timezone-naive, assume it's UTC
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        
        return now < expires

class Tag(Base):
    __tablename__ = "tags"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(64), unique=True, nullable=False, index=True)
    color = Column(String(7), default="#3B82F6")  # Hex color for tag
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    notes = relationship("Note", secondary=note_tag, back_populates="tags")
    
    @property
    def note_count(self):
        return len(self.notes)

class Note(Base):
    __tablename__ = "notes"
    
    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False, default="Untitled")
    body = Column(Text, nullable=False, default="")
    pinned = Column(Boolean, default=False, nullable=False)
    archived = Column(Boolean, default=False, nullable=False)
    favorite = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), 
                       onupdate=lambda: datetime.now(timezone.utc))
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Note owner
    
    tags = relationship("Tag", secondary=note_tag, back_populates="notes")
    owner = relationship("User", foreign_keys=[owner_id], backref="owned_notes")
    shares = relationship("ShareNote", back_populates="note", cascade="all, delete-orphan")
    
    @property
    def excerpt(self) -> str:
        """Get note excerpt for preview"""
        plain_text = bleach.clean(self.body or "", tags=[], strip=True)
        return plain_text[:150] + "..." if len(plain_text) > 150 else plain_text
    
    @property  
    def reading_time(self) -> int:
        """Estimate reading time in minutes"""
        word_count = len((self.body or "").split())
        return max(1, word_count // 200)  # Average reading speed: 200 WPM

    def render_markdown(self) -> str:
        """Enhanced markdown rendering with syntax highlighting"""
        if not self.body:
            return ""
        
        # Configure markdown with enhanced features
        try:
            html = md.markdown(
                self.body, 
                extensions=[
                    "extra", "fenced_code", "tables", "toc", 
                    "nl2br", "sane_lists"
                ]
            )
        except Exception:
            # Fallback to basic markdown if extensions fail
            html = md.markdown(self.body, extensions=["extra", "fenced_code"])
        
        # Enhanced security with more allowed tags
        allowed_tags = {
            'p', 'br', 'strong', 'em', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 
            'a', 'hr', 'div', 'span', 'img', 'del', 'ins', 'sub', 'sup'
        }
        allowed_attrs = {
            'a': ['href', 'title', 'target', 'rel'],
            'img': ['src', 'alt', 'title', 'width', 'height'],
            'code': ['class'],
            'pre': ['class'],
            'div': ['class'],
            'span': ['class']
        }
        
        clean_html = bleach.clean(html, tags=allowed_tags, attributes=allowed_attrs)
        return bleach.linkify(clean_html)

class ShareNote(Base):
    __tablename__ = "share_notes"
    
    id = Column(Integer, primary_key=True)
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=False)
    shared_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    shared_with_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    can_edit = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    note = relationship("Note", back_populates="shares")
    shared_by = relationship("User", foreign_keys=[shared_by_id], backref="notes_shared")
    shared_with = relationship("User", foreign_keys=[shared_with_id], backref="notes_shared_with_me")

class Invitation(Base):
    __tablename__ = "invitations"
    
    id = Column(Integer, primary_key=True)
    token = Column(String(64), unique=True, nullable=False, index=True)
    inviter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    email = Column(String(255), nullable=True)  # Optional email for invitation
    message = Column(Text, nullable=True)  # Optional invitation message
    used = Column(Boolean, default=False, nullable=False)
    used_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    inviter = relationship("User", foreign_keys=[inviter_id], backref="sent_invitations")
    used_by = relationship("User", foreign_keys=[used_by_id], backref="received_invitations")
    
    def is_valid(self) -> bool:
        """Check if invitation is valid (not expired and not used)"""
        if self.used:
            return False
        
        now = datetime.now(timezone.utc)
        expires = self.expires_at
        
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        
        return now < expires

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    completed = Column(Boolean, default=False, nullable=False)
    due_date = Column(DateTime, nullable=True)
    priority = Column(String(20), default="medium", nullable=False)  # low, medium, high
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), 
                       onupdate=lambda: datetime.now(timezone.utc))
    
    owner = relationship("User", foreign_keys=[owner_id], backref="tasks")
    
    @property
    def is_overdue(self) -> bool:
        """Check if task is overdue"""
        if not self.due_date or self.completed:
            return False
        now = datetime.now(timezone.utc)
        due = self.due_date
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        return now > due

# Create tables
Base.metadata.create_all(engine)

# Enhanced Forms
class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired(), Length(min=3, max=64)])
    password = PasswordField('Password', validators=[DataRequired()])

class RegisterForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired(), Length(min=3, max=64)])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=6)])
    password_confirm = PasswordField('Confirm Password', validators=[DataRequired(), EqualTo('password', message='Passwords must match')])

class NoteForm(FlaskForm):
    title = StringField('Title', validators=[DataRequired(), Length(min=1, max=200)])
    body = TextAreaField('Content', validators=[OptionalValidator()])
    tags = StringField('Tags (comma separated)', validators=[OptionalValidator()])
    pinned = BooleanField('Pin this note')
    favorite = BooleanField('Mark as favorite')
    archived = BooleanField('Archive this note')

class SearchForm(FlaskForm):
    query = StringField('Search notes...', validators=[OptionalValidator()])
    tag_filter = StringField('Filter by tag', validators=[OptionalValidator()])

class ForgotPasswordForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired(), Length(min=3, max=64)])

class ResetPasswordForm(FlaskForm):
    password = PasswordField('New Password', validators=[DataRequired(), Length(min=6)])
    password_confirm = PasswordField('Confirm Password', validators=[DataRequired(), EqualTo('password', message='Passwords must match')])

class ShareNoteForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired(), Length(min=3, max=64)])
    can_edit = BooleanField('Allow editing')

class InviteForm(FlaskForm):
    email = StringField('Email (optional)', validators=[OptionalValidator()])
    message = TextAreaField('Message (optional)', validators=[OptionalValidator()])

class TaskForm(FlaskForm):
    title = StringField('Title', validators=[DataRequired(), Length(min=1, max=200)])
    description = TextAreaField('Description', validators=[OptionalValidator()])
    due_date = DateField('Due Date (optional)', validators=[OptionalValidator()], format='%Y-%m-%d')
    priority = SelectField('Priority', choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')], 
                          default='medium', validators=[DataRequired()])

class ProfileEditForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired(), Length(min=3, max=64)])
    bio = TextAreaField('Bio', validators=[OptionalValidator(), Length(max=500)])
    email = StringField('Email', validators=[OptionalValidator(), Length(max=255)])

def parse_tags(tag_string: str) -> List[str]:
    """Parse comma-separated tags."""
    if not tag_string:
        return []
    return [normalize_tag(tag.strip()) for tag in tag_string.split(',') if tag.strip()]

# Helper functions
def db():
    return SessionLocal()

def current_user() -> Optional[User]:
    user_id = session.get("user_id")
    if not user_id:
        return None
    with db() as s:
        return s.get(User, user_id)

def login_required(f):
    from functools import wraps
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not current_user():
            flash("Please log in first.", "warning")
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return wrapper

def normalize_tag(name: str) -> str:
    """Simple tag normalization"""
    if not name:
        return ""
    # Keep it simple - just lowercase and remove special chars
    normalized = ''.join(c for c in name.lower().strip() if c.isalnum() or c in '_-')
    return normalized[:64]  # Limit length

# Migration: Add missing columns to users and notes tables if they don't exist
def migrate_database():
    """Add missing columns to existing database"""
    from sqlalchemy import text
    s = SessionLocal()
    try:
        migrations_applied = []
        
        # Migrate users table
        result = s.execute(text("PRAGMA table_info(users)"))
        user_columns = {row[1]: row for row in result.fetchall()}
        
        # Add theme column if missing
        if 'theme' not in user_columns:
            s.execute(text("ALTER TABLE users ADD COLUMN theme VARCHAR(20) DEFAULT 'light'"))
            s.execute(text("UPDATE users SET theme = 'light' WHERE theme IS NULL"))
            migrations_applied.append("users.theme")
        
        # Add created_at column if missing
        if 'created_at' not in user_columns:
            s.execute(text("ALTER TABLE users ADD COLUMN created_at DATETIME"))
            s.execute(text("UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))
            migrations_applied.append("users.created_at")
        
        # Add last_login column if missing
        if 'last_login' not in user_columns:
            s.execute(text("ALTER TABLE users ADD COLUMN last_login DATETIME"))
            migrations_applied.append("users.last_login")
        
        # Add bio column if missing
        if 'bio' not in user_columns:
            s.execute(text("ALTER TABLE users ADD COLUMN bio TEXT"))
            migrations_applied.append("users.bio")
        
        # Add email column if missing
        if 'email' not in user_columns:
            s.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR(255)"))
            migrations_applied.append("users.email")
        
        # Migrate notes table
        result = s.execute(text("PRAGMA table_info(notes)"))
        note_columns = {row[1]: row for row in result.fetchall()}
        
        # Add pinned column if missing
        if 'pinned' not in note_columns:
            s.execute(text("ALTER TABLE notes ADD COLUMN pinned BOOLEAN DEFAULT 0"))
            s.execute(text("UPDATE notes SET pinned = 0 WHERE pinned IS NULL"))
            migrations_applied.append("notes.pinned")
        
        # Add archived column if missing
        if 'archived' not in note_columns:
            s.execute(text("ALTER TABLE notes ADD COLUMN archived BOOLEAN DEFAULT 0"))
            s.execute(text("UPDATE notes SET archived = 0 WHERE archived IS NULL"))
            migrations_applied.append("notes.archived")
        
        # Add favorite column if missing
        if 'favorite' not in note_columns:
            s.execute(text("ALTER TABLE notes ADD COLUMN favorite BOOLEAN DEFAULT 0"))
            s.execute(text("UPDATE notes SET favorite = 0 WHERE favorite IS NULL"))
            migrations_applied.append("notes.favorite")
        
        # Add created_at column if missing
        if 'created_at' not in note_columns:
            s.execute(text("ALTER TABLE notes ADD COLUMN created_at DATETIME"))
            s.execute(text("UPDATE notes SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))
            migrations_applied.append("notes.created_at")
        
        # Add updated_at column if missing
        if 'updated_at' not in note_columns:
            s.execute(text("ALTER TABLE notes ADD COLUMN updated_at DATETIME"))
            s.execute(text("UPDATE notes SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL"))
            migrations_applied.append("notes.updated_at")
        
        # Add owner_id column if missing
        if 'owner_id' not in note_columns:
            s.execute(text("ALTER TABLE notes ADD COLUMN owner_id INTEGER"))
            migrations_applied.append("notes.owner_id")
        
        # Migrate tags table
        result = s.execute(text("PRAGMA table_info(tags)"))
        tag_columns = {row[1]: row for row in result.fetchall()}
        
        # Add color column if missing
        if 'color' not in tag_columns:
            s.execute(text("ALTER TABLE tags ADD COLUMN color VARCHAR(7) DEFAULT '#3B82F6'"))
            s.execute(text("UPDATE tags SET color = '#3B82F6' WHERE color IS NULL"))
            migrations_applied.append("tags.color")
        
        # Add created_at column if missing
        if 'created_at' not in tag_columns:
            s.execute(text("ALTER TABLE tags ADD COLUMN created_at DATETIME"))
            s.execute(text("UPDATE tags SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))
            migrations_applied.append("tags.created_at")
        
        # Create password_reset_tokens table if it doesn't exist
        result = s.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='password_reset_tokens'"))
        if not result.fetchone():
            s.execute(text("""
                CREATE TABLE password_reset_tokens (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    token VARCHAR(64) NOT NULL UNIQUE,
                    expires_at DATETIME NOT NULL,
                    used BOOLEAN NOT NULL DEFAULT 0,
                    created_at DATETIME,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
            """))
            s.execute(text("CREATE INDEX IF NOT EXISTS idx_token ON password_reset_tokens(token)"))
            migrations_applied.append("password_reset_tokens table")
        
        # Create share_notes table if it doesn't exist
        result = s.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='share_notes'"))
        if not result.fetchone():
            s.execute(text("""
                CREATE TABLE share_notes (
                    id INTEGER PRIMARY KEY,
                    note_id INTEGER NOT NULL,
                    shared_by_id INTEGER NOT NULL,
                    shared_with_id INTEGER NOT NULL,
                    can_edit BOOLEAN NOT NULL DEFAULT 0,
                    created_at DATETIME,
                    FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE,
                    FOREIGN KEY(shared_by_id) REFERENCES users(id),
                    FOREIGN KEY(shared_with_id) REFERENCES users(id),
                    UNIQUE(note_id, shared_with_id)
                )
            """))
            migrations_applied.append("share_notes table")
        
        # Create invitations table if it doesn't exist
        result = s.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='invitations'"))
        if not result.fetchone():
            s.execute(text("""
                CREATE TABLE invitations (
                    id INTEGER PRIMARY KEY,
                    token VARCHAR(64) NOT NULL UNIQUE,
                    inviter_id INTEGER NOT NULL,
                    email VARCHAR(255),
                    message TEXT,
                    used BOOLEAN NOT NULL DEFAULT 0,
                    used_by_id INTEGER,
                    expires_at DATETIME NOT NULL,
                    created_at DATETIME,
                    FOREIGN KEY(inviter_id) REFERENCES users(id),
                    FOREIGN KEY(used_by_id) REFERENCES users(id)
                )
            """))
            s.execute(text("CREATE INDEX IF NOT EXISTS idx_invitation_token ON invitations(token)"))
            migrations_applied.append("invitations table")
        
        # Create tasks table if it doesn't exist
        result = s.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'"))
        if not result.fetchone():
            s.execute(text("""
                CREATE TABLE tasks (
                    id INTEGER PRIMARY KEY,
                    title VARCHAR(200) NOT NULL,
                    description TEXT,
                    completed BOOLEAN NOT NULL DEFAULT 0,
                    due_date DATETIME,
                    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
                    owner_id INTEGER NOT NULL,
                    created_at DATETIME,
                    updated_at DATETIME,
                    FOREIGN KEY(owner_id) REFERENCES users(id)
                )
            """))
            migrations_applied.append("tasks table")
        
        if migrations_applied:
            s.commit()
            print(f"✅ Added columns: {', '.join(migrations_applied)}")
    except Exception as e:
        print(f"⚠️  Migration error: {e}")
        s.rollback()
    finally:
        s.close()

# Run migration
migrate_database()

# Create admin user
with db() as s:
    if not s.execute(select(func.count(User.id))).scalar():
        admin = User(username=ADMIN_USERNAME)
        admin.set_password(ADMIN_PASSWORD)
        s.add(admin)
        s.commit()
        print(f"Created admin user: {ADMIN_USERNAME} / {ADMIN_PASSWORD}")

# Routes
@app.route("/")
@login_required
def index():
    form = SearchForm(request.args)
    query = form.query.data or ""
    tag_filter = form.tag_filter.data or ""
    view_type = request.args.get('view', 'all')  # all, favorites, archived, shared
    user = current_user()
    
    with db() as s:
        # Build query
        stmt = select(Note).distinct()
        
        # Filter by view type
        if view_type == 'favorites':
            # Show only non-archived favorite notes (owned by user or shared with user)
            if user:
                shared_note_ids = select(ShareNote.note_id).where(ShareNote.shared_with_id == user.id)
                stmt = stmt.where(
                    Note.favorite == True,
                    Note.archived == False,
                    ((Note.owner_id == user.id) | (Note.id.in_(shared_note_ids)))
                )
            else:
                stmt = stmt.where(False)  # No notes if not logged in
        elif view_type == 'archived':
            # Show only archived notes (owned by user only - archived notes aren't shared)
            if user:
                stmt = stmt.where(Note.archived == True, Note.owner_id == user.id)
            else:
                stmt = stmt.where(False)  # No notes if not logged in
        elif view_type == 'shared':
            # Show notes shared with current user
            if user:
                stmt = stmt.join(ShareNote).where(
                    ShareNote.shared_with_id == user.id,
                    Note.archived == False
                )
            else:
                stmt = stmt.where(False)  # No shared notes if not logged in
        else:
            # Default "All Notes": show all non-archived notes (both favorite and non-favorite)
            # Include owned notes and shared notes
            if user:
                # Get note IDs shared with user - use subquery for better performance and accuracy
                shared_note_ids = select(ShareNote.note_id).where(ShareNote.shared_with_id == user.id)
                stmt = stmt.where(
                    ((Note.owner_id == user.id) | (Note.id.in_(shared_note_ids))) & (Note.archived == False)
                )
            else:
                # If not logged in (shouldn't happen due to @login_required, but safety check)
                stmt = stmt.where(False)
        
        if query:
            like_term = f"%{query}%"
            # Use aliased Tag to avoid join conflicts
            tag_alias = aliased(Tag)
            stmt = stmt.outerjoin(note_tag).outerjoin(tag_alias).where(
                Note.title.ilike(like_term) | 
                Note.body.ilike(like_term) |
                tag_alias.name.ilike(like_term)
            )
        
        if tag_filter:
            tag_alias2 = aliased(Tag)
            stmt = stmt.join(note_tag).join(tag_alias2).where(
                tag_alias2.name.ilike(f"%{tag_filter}%")
            )
        
        # Remove any duplicate joins before adding options
        # Ensure distinct is applied and remove any duplicate joins
        stmt = stmt.options(joinedload(Note.tags)).order_by(Note.pinned.desc(), Note.updated_at.desc())
        notes = s.execute(stmt).scalars().unique().all()
        
        # Get all tags for filter (eagerly load notes relationship for note_count property)
        all_tags = s.execute(
            select(Tag).options(selectinload(Tag.notes)).order_by(Tag.name)
        ).scalars().all()
    
    # Add cache control headers to prevent stale data
    response = make_response(render_template("index.html", notes=notes, form=form, 
                         all_tags=all_tags, view_type=view_type))
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route("/login", methods=["GET", "POST"])
def login():
    if current_user():
        return redirect(url_for("index"))
    
    form = LoginForm()
    if form.validate_on_submit():
        with db() as s:
            user = s.execute(select(User).where(User.username == form.username.data)).scalar_one_or_none()
            if user and user.check_password(form.password.data):
                session["user_id"] = user.id
                # Update last_login
                user.last_login = datetime.now(timezone.utc)
                s.commit()
                flash(f"Welcome back, {user.username}!", "success")
                return redirect(url_for("index"))
        
        flash("Invalid username or password.", "error")
    
    return render_template("login.html", form=form)

@app.route("/register", methods=["GET", "POST"])
def register():
    if current_user():
        return redirect(url_for("index"))
    
    token = request.args.get('token')
    invitation = None
    
    # Check if there's a valid invitation token
    if token:
        with db() as s:
            invitation = s.execute(
                select(Invitation).where(Invitation.token == token)
            ).scalar_one_or_none()
            
            if invitation and not invitation.is_valid():
                flash("This invitation has expired or has already been used.", "error")
                invitation = None
    
    form = RegisterForm()
    if form.validate_on_submit():
        with db() as s:
            # Check if username already exists
            existing_user = s.execute(select(User).where(User.username == form.username.data)).scalar_one_or_none()
            if existing_user:
                flash("Username already exists. Please choose a different one.", "error")
            else:
                # Create new user
                new_user = User(username=form.username.data)
                new_user.set_password(form.password.data)
                s.add(new_user)
                
                # Mark invitation as used if provided
                if token and invitation and invitation.is_valid():
                    invitation.used = True
                    invitation.used_by_id = new_user.id
                
                s.commit()
                flash(f"Account created successfully! Please log in to continue.", "success")
                return redirect(url_for("login"))
    
    return render_template("register.html", form=form, invitation=invitation)

@app.route("/logout")
@login_required
def logout():
    session.clear()
    flash("Logged out", "success")
    return redirect(url_for("login"))

@app.route("/note/new", methods=["GET", "POST"])
@login_required
def new_note():
    form = NoteForm()
    if form.validate_on_submit():
        user = current_user()
        if not user:
            flash("Please log in to create notes.", "error")
            return redirect(url_for("login"))
        
        try:
            with db() as s:
                note = Note(
                    title=form.title.data.strip(),
                    body=form.body.data or "",
                    pinned=form.pinned.data or False,
                    favorite=form.favorite.data or False,
                    archived=form.archived.data or False,
                    owner_id=user.id
                )
                
                # Handle tags
                tag_names = parse_tags(form.tags.data)
                for tag_name in tag_names:
                    tag = s.execute(select(Tag).where(Tag.name == tag_name)).scalar_one_or_none()
                    if not tag:
                        tag = Tag(name=tag_name)
                        s.add(tag)
                    note.tags.append(tag)
                
                s.add(note)
                s.commit()
                note_id = note.id  # Store id before session closes
                flash("Note created!", "success")
                return redirect(url_for("view_note", note_id=note_id))
        except Exception as e:
            flash(f"Error creating note: {str(e)}", "error")
            # Return form with errors so user can fix and resubmit
    
    # Create a fresh form for GET requests or if validation failed
    if request.method == "GET":
        form = NoteForm()  # Fresh form for new note
    
    return render_template("edit_note.html", form=form, note=None, is_edit=False)

@app.route("/note/<int:note_id>")
@login_required
def view_note(note_id: int):
    user = current_user()
    with db() as s:
        note = s.execute(
            select(Note).options(joinedload(Note.tags)).where(Note.id == note_id)
        ).unique().scalar_one_or_none()
        if not note:
            abort(404)
        
        # Check if user has access (owns note or it's shared with them)
        has_access = False
        can_edit = False
        
        if note.owner_id is not None and note.owner_id == user.id:
            has_access = True
            can_edit = True
        else:
            # Check if note is shared with user
            share = s.execute(
                select(ShareNote).where(
                    ShareNote.note_id == note_id,
                    ShareNote.shared_with_id == user.id
                )
            ).scalar_one_or_none()
            if share:
                has_access = True
                can_edit = share.can_edit
        
        if not has_access:
            flash("You don't have access to this note.", "error")
            return redirect(url_for("index"))
    
    return render_template("view_note.html", note=note, can_edit=can_edit)

@app.route("/note/<int:note_id>/edit", methods=["GET", "POST"])
@login_required
def edit_note(note_id: int):
    user = current_user()
    with db() as s:
        note = s.execute(
            select(Note).options(joinedload(Note.tags)).where(Note.id == note_id)
        ).unique().scalar_one_or_none()
        if not note:
            abort(404)
        
        # Check if user can edit (owns note or has edit permission)
        can_edit = False
        if note.owner_id is not None and note.owner_id == user.id:
            can_edit = True
        else:
            share = s.execute(
                select(ShareNote).where(
                    ShareNote.note_id == note_id,
                    ShareNote.shared_with_id == user.id
                )
            ).scalar_one_or_none()
            if share and share.can_edit:
                can_edit = True
        
        if not can_edit:
            flash("You don't have permission to edit this note.", "error")
            return redirect(url_for("view_note", note_id=note_id))
        
        form = NoteForm(obj=note)
        if request.method == "GET":
            form.tags.data = ", ".join(tag.name for tag in note.tags)
        
        if form.validate_on_submit():
            try:
                note.title = form.title.data.strip()
                note.body = form.body.data or ""
                # Only note owner can change pinned/favorite/archived status
                if note.owner_id is not None and note.owner_id == user.id:
                    note.pinned = form.pinned.data
                    note.favorite = form.favorite.data
                    note.archived = form.archived.data
                
                # Update tags
                note.tags.clear()
                tag_names = parse_tags(form.tags.data)
                for tag_name in tag_names:
                    tag = s.execute(select(Tag).where(Tag.name == tag_name)).scalar_one_or_none()
                    if not tag:
                        tag = Tag(name=tag_name)
                        s.add(tag)
                    note.tags.append(tag)
                
                s.commit()
                flash("Note updated!", "success")
                return redirect(url_for("view_note", note_id=note_id))
            except Exception as e:
                flash(f"Error updating note: {str(e)}", "error")
        
        preview_html = note.render_markdown()
        return render_template("edit_note.html", form=form, note=note, 
                             preview_html=preview_html, is_edit=True)

@app.route("/note/<int:note_id>/delete", methods=["POST"])
@login_required
def delete_note(note_id: int):
    user = current_user()
    try:
        with db() as s:
            note = s.get(Note, note_id)
            if not note:
                flash("Note not found", "error")
            elif note.owner_id is None or note.owner_id != user.id:
                flash("You can only delete notes you own.", "error")
            else:
                # Delete all share records for this note first
                s.execute(
                    text("DELETE FROM share_notes WHERE note_id = :note_id"),
                    {"note_id": note_id}
                )
                # Then delete the note
                s.delete(note)
                s.commit()
                flash("Note deleted", "success")
    except Exception as e:
        flash(f"Error deleting note: {str(e)}", "error")
    
    return redirect(url_for("index"))

@app.route("/note/<int:note_id>/toggle-pin", methods=["POST"])
@login_required
def toggle_pin(note_id: int):
    user = current_user()
    with db() as s:
        note = s.get(Note, note_id)
        if not note:
            abort(404)
        # Only note owner can pin/unpin
        if note.owner_id is None or note.owner_id != user.id:
            flash("Only the note owner can pin/unpin notes.", "error")
            return redirect(url_for("view_note", note_id=note_id))
        note.pinned = not note.pinned
        is_pinned = note.pinned  # Store value before session closes
        s.commit()
    flash(f"Note {'pinned' if is_pinned else 'unpinned'}.", "success")
    return redirect(url_for("view_note", note_id=note_id))

@app.route("/note/<int:note_id>/toggle-favorite", methods=["POST"])
@login_required
def toggle_favorite(note_id: int):
    user = current_user()
    with db() as s:
        note = s.get(Note, note_id)
        if not note:
            abort(404)
        # Check if user has access to the note
        has_access = False
        if note.owner_id is not None and note.owner_id == user.id:
            has_access = True
        else:
            share = s.execute(
                select(ShareNote).where(
                    ShareNote.note_id == note_id,
                    ShareNote.shared_with_id == user.id
                )
            ).scalar_one_or_none()
            if share:
                has_access = True
        
        if not has_access:
            flash("You don't have access to this note.", "error")
            return redirect(url_for("index"))
        
        note.favorite = not note.favorite
        is_favorite = note.favorite  # Store value before session closes
        s.commit()
    flash(f"Note {'favorited' if is_favorite else 'unfavorited'}.", "success")
    return redirect(url_for("view_note", note_id=note_id))

@app.route("/toggle-theme", methods=["POST"])
@login_required
def toggle_theme():
    user = current_user()
    if user:
        with db() as s:
            db_user = s.get(User, user.id)
            db_user.theme = "dark" if db_user.theme == "light" else "light"
            s.commit()
            session["theme"] = db_user.theme
    return redirect(request.referrer or url_for("index"))

@app.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    """Request a password reset token"""
    if current_user():
        return redirect(url_for("index"))
    
    form = ForgotPasswordForm()
    if form.validate_on_submit():
        with db() as s:
            user = s.execute(select(User).where(User.username == form.username.data)).scalar_one_or_none()
            if user:
                # Generate a secure token
                token = secrets.token_urlsafe(32)
                expires_at = datetime.now(timezone.utc) + timedelta(hours=1)  # Token valid for 1 hour
                
                # Invalidate any existing tokens for this user
                s.execute(
                    text("UPDATE password_reset_tokens SET used = 1 WHERE user_id = :user_id AND used = 0"),
                    {"user_id": user.id}
                )
                
                # Create new reset token
                reset_token = PasswordResetToken(
                    user_id=user.id,
                    token=token,
                    expires_at=expires_at
                )
                s.add(reset_token)
                s.commit()
                
                # Show token on the same page (since we don't have email)
                return render_template("forgot_password.html", form=form, token=token, token_generated=True)
            else:
                # Don't reveal if username exists for security
                flash("If that username exists, a password reset token has been generated.", "success")
                return redirect(url_for("login"))
    
    return render_template("forgot_password.html", form=form, token=None, token_generated=False)

@app.route("/reset-password/<token>", methods=["GET", "POST"])
def reset_password(token: str):
    """Reset password using a token"""
    if current_user():
        return redirect(url_for("index"))
    
    form = ResetPasswordForm()
    
    # Validate token
    with db() as s:
        reset_token = s.execute(
            select(PasswordResetToken).where(PasswordResetToken.token == token)
        ).scalar_one_or_none()
        
        if not reset_token:
            flash("Invalid or expired reset token.", "error")
            return redirect(url_for("forgot_password"))
        
        if not reset_token.is_valid():
            flash("This reset token has expired or has already been used.", "error")
            return redirect(url_for("forgot_password"))
        
        if form.validate_on_submit():
            # Reset the password
            user = s.get(User, reset_token.user_id)
            if user:
                user.set_password(form.password.data)
                reset_token.used = True
                s.commit()
                flash("Password reset successfully! Please log in with your new password.", "success")
                return redirect(url_for("login"))
            else:
                flash("User not found.", "error")
                return redirect(url_for("forgot_password"))
        
        # Token is valid, render the form (GET request or form validation failed)
        return render_template("reset_password.html", form=form, token=token)

@app.route("/note/<int:note_id>/share", methods=["GET", "POST"])
@login_required
def share_note(note_id: int):
    user = current_user()
    with db() as s:
        note = s.execute(
            select(Note).options(joinedload(Note.tags)).where(Note.id == note_id)
        ).unique().scalar_one_or_none()
        if not note:
            abort(404)
        
        # Check if user owns the note
        if note.owner_id is None or note.owner_id != user.id:
            flash("You can only share notes you own.", "error")
            return redirect(url_for("view_note", note_id=note_id))
        
        form = ShareNoteForm()
        if form.validate_on_submit():
            # Find the user to share with
            shared_with_user = s.execute(
                select(User).where(User.username == form.username.data)
            ).scalar_one_or_none()
            
            if not shared_with_user:
                flash("User not found.", "error")
            elif shared_with_user.id == user.id:
                flash("You cannot share a note with yourself.", "error")
            else:
                # Check if already shared
                existing_share = s.execute(
                    select(ShareNote).where(
                        ShareNote.note_id == note_id,
                        ShareNote.shared_with_id == shared_with_user.id
                    )
                ).scalar_one_or_none()
                
                if existing_share:
                    flash(f"Note is already shared with {shared_with_user.username}.", "warning")
                else:
                    share = ShareNote(
                        note_id=note_id,
                        shared_by_id=user.id,
                        shared_with_id=shared_with_user.id,
                        can_edit=form.can_edit.data
                    )
                    s.add(share)
                    s.commit()
                    flash(f"Note shared with {shared_with_user.username}!", "success")
                    return redirect(url_for("view_note", note_id=note_id))
        
        # Get list of users this note is shared with
        shared_with = s.execute(
            select(ShareNote, User).join(User, ShareNote.shared_with_id == User.id)
            .where(ShareNote.note_id == note_id)
        ).all()
        
        return render_template("share_note.html", note=note, form=form, shared_with=shared_with)

@app.route("/note/<int:note_id>/unshare/<int:share_id>", methods=["POST"])
@login_required
def unshare_note(note_id: int, share_id: int):
    user = current_user()
    with db() as s:
        note = s.get(Note, note_id)
        if not note or note.owner_id is None or note.owner_id != user.id:
            flash("You can only unshare notes you own.", "error")
            return redirect(url_for("view_note", note_id=note_id))
        
        share = s.get(ShareNote, share_id)
        if share and share.note_id == note_id:
            s.delete(share)
            s.commit()
            flash("Note unshared successfully.", "success")
        else:
            flash("Share not found.", "error")
    
    return redirect(url_for("share_note", note_id=note_id))

@app.route("/invite", methods=["GET", "POST"])
@login_required
def invite():
    user = current_user()
    form = InviteForm()
    
    if form.validate_on_submit():
        with db() as s:
            # Generate invitation token
            token = secrets.token_urlsafe(32)
            expires_at = datetime.now(timezone.utc) + timedelta(days=7)  # Valid for 7 days
            
            invitation = Invitation(
                token=token,
                inviter_id=user.id,
                email=form.email.data or None,
                message=form.message.data or None,
                expires_at=expires_at
            )
            s.add(invitation)
            s.commit()
            
            # Generate invitation URL
            invite_url = request.url_root.rstrip('/') + url_for('register', token=token)
            flash(f"Invitation created! Share this link: {invite_url}", "success")
            return render_template("invite.html", form=form, invite_url=invite_url, token=token)
    
    # Get list of invitations sent by user
    with db() as s:
        invitations = s.execute(
            select(Invitation).where(Invitation.inviter_id == user.id)
            .order_by(Invitation.created_at.desc())
        ).scalars().all()
    
    return render_template("invite.html", form=form, invitations=invitations, invite_url=None, token=None)

@app.route("/profile")
@login_required
def profile():
    user = current_user()
    with db() as s:
        # Get user statistics
        total_notes = s.execute(
            select(func.count(Note.id)).where(Note.owner_id == user.id)
        ).scalar() or 0
        
        favorite_notes = s.execute(
            select(func.count(Note.id)).where(
                Note.owner_id == user.id,
                Note.favorite == True
            )
        ).scalar() or 0
        
        archived_notes = s.execute(
            select(func.count(Note.id)).where(
                Note.owner_id == user.id,
                Note.archived == True
            )
        ).scalar() or 0
        
        shared_notes_count = s.execute(
            select(func.count(ShareNote.id)).where(ShareNote.shared_by_id == user.id)
        ).scalar() or 0
        
        notes_shared_with_me = s.execute(
            select(func.count(ShareNote.id)).where(ShareNote.shared_with_id == user.id)
        ).scalar() or 0
        
        total_tags = s.execute(
            select(func.count(Tag.id))
        ).scalar() or 0
        
        # Get recent notes
        recent_notes = s.execute(
            select(Note).where(Note.owner_id == user.id)
            .order_by(Note.updated_at.desc())
            .limit(5)
        ).scalars().all()
        
        # Get notes shared with me
        shared_with_me = s.execute(
            select(Note, ShareNote, User).join(ShareNote, Note.id == ShareNote.note_id)
            .join(User, ShareNote.shared_by_id == User.id)
            .where(ShareNote.shared_with_id == user.id)
            .order_by(ShareNote.created_at.desc())
            .limit(5)
        ).all()
    
    return render_template("profile.html", 
                         user=user,
                         total_notes=total_notes,
                         favorite_notes=favorite_notes,
                         archived_notes=archived_notes,
                         shared_notes_count=shared_notes_count,
                         notes_shared_with_me=notes_shared_with_me,
                         total_tags=total_tags,
                         recent_notes=recent_notes,
                         shared_with_me=shared_with_me,
                         is_own_profile=True)

@app.route("/profile/edit", methods=["GET", "POST"])
@login_required
def edit_profile():
    user = current_user()
    form = ProfileEditForm(obj=user)
    
    if form.validate_on_submit():
        with db() as s:
            db_user = s.get(User, user.id)
            if not db_user:
                flash("User not found.", "error")
                return redirect(url_for("profile"))
            
            # Check if username is being changed and if it's available
            if form.username.data != db_user.username:
                existing_user = s.execute(
                    select(User).where(User.username == form.username.data)
                ).scalar_one_or_none()
                if existing_user:
                    flash("Username already exists. Please choose a different one.", "error")
                    return render_template("edit_profile.html", form=form, user=user)
            
            db_user.username = form.username.data.strip()
            db_user.bio = form.bio.data or None
            db_user.email = form.email.data or None
            s.commit()
            flash("Profile updated successfully!", "success")
            return redirect(url_for("profile"))
    
    return render_template("edit_profile.html", form=form, user=user)

@app.route("/user/<int:user_id>")
@login_required
def view_user_profile(user_id: int):
    current = current_user()
    with db() as s:
        profile_user = s.get(User, user_id)
        if not profile_user:
            flash("User not found.", "error")
            return redirect(url_for("index"))
        
        # Get user statistics (public info only)
        total_notes = s.execute(
            select(func.count(Note.id)).where(Note.owner_id == user_id)
        ).scalar() or 0
        
        # Only show if viewing own profile or if user has shared notes with current user
        is_own_profile = (current.id == user_id)
        
        return render_template("profile.html",
                             user=profile_user,
                             total_notes=total_notes,
                             favorite_notes=0,  # Don't show private stats
                             archived_notes=0,
                             shared_notes_count=0,
                             notes_shared_with_me=0,
                             total_tags=0,
                             recent_notes=[],
                             shared_with_me=[],
                             is_own_profile=is_own_profile)

@app.route("/tasks")
@login_required
def tasks():
    user = current_user()
    filter_type = request.args.get('filter', 'all')  # all, active, completed
    
    with db() as s:
        stmt = select(Task).where(Task.owner_id == user.id)
        
        if filter_type == 'active':
            stmt = stmt.where(Task.completed == False)
        elif filter_type == 'completed':
            stmt = stmt.where(Task.completed == True)
        
        # Order by priority (high first), then due date, then created date
        priority_order = case(
            (Task.priority == 'high', 1),
            (Task.priority == 'medium', 2),
            (Task.priority == 'low', 3),
            else_=2
        )
        tasks_list = s.execute(
            stmt.order_by(
                Task.completed.asc(),
                priority_order,
                Task.due_date.asc().nullslast(),
                Task.created_at.desc()
            )
        ).scalars().all()
        
        # Get statistics
        total_tasks = s.execute(
            select(func.count(Task.id)).where(Task.owner_id == user.id)
        ).scalar() or 0
        
        completed_tasks = s.execute(
            select(func.count(Task.id)).where(
                Task.owner_id == user.id,
                Task.completed == True
            )
        ).scalar() or 0
        
        active_tasks = total_tasks - completed_tasks
    
    return render_template("tasks.html", 
                         tasks=tasks_list, 
                         filter_type=filter_type,
                         total_tasks=total_tasks,
                         completed_tasks=completed_tasks,
                         active_tasks=active_tasks)

@app.route("/task/new", methods=["GET", "POST"])
@login_required
def new_task():
    user = current_user()
    form = TaskForm()
    
    if form.validate_on_submit():
        try:
            with db() as s:
                due_date = None
                if form.due_date.data:
                    # Convert date to datetime with timezone
                    due_date = datetime.combine(
                        form.due_date.data,
                        datetime.min.time()
                    ).replace(tzinfo=timezone.utc)
                
                task = Task(
                    title=form.title.data.strip(),
                    description=form.description.data or None,
                    due_date=due_date,
                    priority=form.priority.data,
                    owner_id=user.id
                )
                s.add(task)
                s.commit()
                flash("Task created!", "success")
                return redirect(url_for("tasks"))
        except Exception as e:
            flash(f"Error creating task: {str(e)}", "error")
    
    if request.method == "GET":
        form = TaskForm()
    
    return render_template("edit_task.html", form=form, task=None, is_edit=False)

@app.route("/task/<int:task_id>/edit", methods=["GET", "POST"])
@login_required
def edit_task(task_id: int):
    user = current_user()
    with db() as s:
        task = s.get(Task, task_id)
        if not task or task.owner_id != user.id:
            flash("Task not found or you don't have permission to edit it.", "error")
            return redirect(url_for("tasks"))
        
        form = TaskForm(obj=task)
        if request.method == "GET":
            if task.due_date:
                # Convert datetime to date for form
                form.due_date.data = task.due_date.date()
        
        if form.validate_on_submit():
            try:
                task.title = form.title.data.strip()
                task.description = form.description.data or None
                if form.due_date.data:
                    task.due_date = datetime.combine(
                        form.due_date.data,
                        datetime.min.time()
                    ).replace(tzinfo=timezone.utc)
                else:
                    task.due_date = None
                task.priority = form.priority.data
                s.commit()
                flash("Task updated!", "success")
                return redirect(url_for("tasks"))
            except Exception as e:
                flash(f"Error updating task: {str(e)}", "error")
        
        return render_template("edit_task.html", form=form, task=task, is_edit=True)

@app.route("/task/<int:task_id>/toggle", methods=["POST"])
@login_required
def toggle_task(task_id: int):
    user = current_user()
    with db() as s:
        task = s.get(Task, task_id)
        if not task or task.owner_id != user.id:
            flash("Task not found.", "error")
            return redirect(url_for("tasks"))
        
        task.completed = not task.completed
        s.commit()
        status = "completed" if task.completed else "marked as active"
        flash(f"Task {status}!", "success")
    
    return redirect(url_for("tasks", filter=request.args.get('filter', 'all')))

@app.route("/task/<int:task_id>/delete", methods=["POST"])
@login_required
def delete_task(task_id: int):
    user = current_user()
    try:
        with db() as s:
            task = s.get(Task, task_id)
            if not task or task.owner_id != user.id:
                flash("Task not found or you don't have permission to delete it.", "error")
            else:
                s.delete(task)
                s.commit()
                flash("Task deleted!", "success")
    except Exception as e:
        flash(f"Error deleting task: {str(e)}", "error")
    
    return redirect(url_for("tasks", filter=request.args.get('filter', 'all')))

# Template context
@app.context_processor
def inject_user():
    user = current_user()
    theme = session.get("theme", "light")
    if user and not theme:
        with db() as s:
            db_user = s.get(User, user.id)
            theme = db_user.theme if db_user else "light"
            session["theme"] = theme
    return dict(current_user=user, current_theme=theme)

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return render_template("error.html", error="Page not found", code=404), 404

@app.errorhandler(500)
def server_error(error):
    return render_template("error.html", error="Internal server error", code=500), 500

if __name__ == "__main__":
    print(f"\n🗒️  Simple Notes App Starting...")
    print(f"📂 Database: {DB_PATH}")
    print(f"👤 Admin: {ADMIN_USERNAME}")
    print(f"🌐 URL: http://127.0.0.1:5000")
    print(f"🛑 Press Ctrl+C to stop\n")
    
    app.run(debug=True, host="127.0.0.1", port=5000)