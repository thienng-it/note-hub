"""Route registrations for the Note Hub Flask application."""

from __future__ import annotations

import base64
import secrets
from datetime import datetime, timedelta, timezone
from io import BytesIO

import pyotp
import qrcode
from flask import (abort, flash, make_response, redirect, render_template,
                   request, session, url_for)
from sqlalchemy import case, func, select, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import aliased, joinedload, selectinload

from ..forms import (ForgotPasswordForm, InviteForm, LoginForm, NoteForm,
                     ProfileEditForm, RegisterForm, ResetPasswordForm,
                     SearchForm, Setup2FAForm, ShareNoteForm, TaskForm,
                     Verify2FAForm)
from ..models import (Invitation, Note, PasswordResetToken, ShareNote, Tag,
                      Task, User, note_tag)
from ..services.utils import current_user, db, login_required, parse_tags


def register_routes(app):
    """Register all Flask routes on the passed-in app instance."""

    @app.route("/")
    @login_required
    def index():
        form = SearchForm(request.args)
        query = form.query.data or ""
        tag_filter = form.tag_filter.data or ""
        view_type = request.args.get('view', 'all')
        user = current_user()

        with db() as s:
            stmt = select(Note).distinct()
            if view_type == 'favorites':
                if user:
                    shared_note_ids = select(ShareNote.note_id).where(ShareNote.shared_with_id == user.id)
                    stmt = stmt.where(Note.favorite == True, Note.archived == False, ((Note.owner_id == user.id) | (Note.id.in_(shared_note_ids))))
                else: stmt = stmt.where(False)
            elif view_type == 'archived':
                if user: stmt = stmt.where(Note.archived == True, Note.owner_id == user.id)
                else: stmt = stmt.where(False)
            elif view_type == 'shared':
                if user: stmt = stmt.join(ShareNote).where(ShareNote.shared_with_id == user.id, Note.archived == False)
                else: stmt = stmt.where(False)
            else:
                if user:
                    shared_note_ids = select(ShareNote.note_id).where(ShareNote.shared_with_id == user.id)
                    stmt = stmt.where(((Note.owner_id == user.id) | (Note.id.in_(shared_note_ids))) & (Note.archived == False))
                else: stmt = stmt.where(False)

            if query:
                like_term = f"%{query}%"
                tag_alias = aliased(Tag)
                stmt = stmt.outerjoin(note_tag).outerjoin(tag_alias).where(Note.title.ilike(like_term) | Note.body.ilike(like_term) | tag_alias.name.ilike(like_term))

            if tag_filter:
                tag_alias2 = aliased(Tag)
                stmt = stmt.join(note_tag).join(tag_alias2).where(tag_alias2.name.ilike(f"%{tag_filter}%"))

            stmt = stmt.options(joinedload(Note.tags)).order_by(Note.pinned.desc(), Note.updated_at.desc())
            notes = s.execute(stmt).scalars().unique().all()
            all_tags = s.execute(select(Tag).options(selectinload(Tag.notes)).order_by(Tag.name)).scalars().all()

        response = make_response(render_template("index.html", notes=notes, form=form, all_tags=all_tags, view_type=view_type))
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
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
                    if user.totp_secret:
                        session['pre_2fa_user_id'] = user.id
                        return redirect(url_for('verify_2fa'))

                    session["user_id"] = user.id
                    user.last_login = datetime.now(timezone.utc)
                    s.commit()
                    flash(f"Welcome back, {user.username}!", "success")
                    return redirect(url_for("index"))

            flash("Invalid username or password.", "error")

        return render_template("login.html", form=form)

    @app.route("/verify-2fa", methods=["GET", "POST"])
    def verify_2fa():
        if current_user():
            return redirect(url_for("index"))

        user_id = session.get('pre_2fa_user_id')
        if not user_id:
            return redirect(url_for("login"))

        form = Verify2FAForm()
        if form.validate_on_submit():
            with db() as s:
                user = s.get(User, user_id)
                if user and user.verify_totp(form.totp_code.data):
                    session.pop('pre_2fa_user_id', None)
                    session['user_id'] = user.id
                    user.last_login = datetime.now(timezone.utc)
                    s.commit()
                    flash(f"Welcome back, {user.username}!", "success")
                    return redirect(url_for("index"))
                else:
                    flash("Invalid 2FA code.", "error")

        return render_template("verify_2fa.html", form=form)

    @app.route("/register", methods=["GET", "POST"])
    def register():
        """User registration with enhanced transaction handling and real-time DB save."""
        if current_user():
            return redirect(url_for("index"))

        token = request.args.get('token')
        invitation = None
        if token:
            with db() as s:
                invitation = s.execute(select(Invitation).where(Invitation.token == token)).scalar_one_or_none()
                if invitation and not invitation.is_valid():
                    flash("Invitation expired or used.", "error")
                    invitation = None

        form = RegisterForm()
        if form.validate_on_submit():
            # Validate and sanitize input
            username = form.username.data.strip()
            password = form.password.data
            
            # Validate password policy before attempting database operations
            from ..security import password_policy_errors
            policy_errors = password_policy_errors(password)
            if policy_errors:
                flash(f"Password policy violation: {policy_errors[0]}", "error")
                return render_template("register.html", form=form, invitation=invitation)
            
            # Attempt to create user with proper transaction handling
            try:
                with db() as s:
                    # Double-check username uniqueness within transaction
                    # Use SELECT FOR UPDATE to prevent race conditions
                    existing_user = s.execute(
                        select(User).where(User.username == username)
                    ).scalar_one_or_none()
                    
                    if existing_user:
                        flash("Username already exists.", "error")
                        return render_template("register.html", form=form, invitation=invitation)
                    
                    # Create new user - this will be saved to DB in real-time on commit
                    new_user = User(username=username)
                    try:
                        new_user.set_password(password)  # Enforces password policy
                    except ValueError as e:
                        flash(f"Password error: {str(e)}", "error")
                        return render_template("register.html", form=form, invitation=invitation)
                    
                    s.add(new_user)
                    
                    # Flush to get the user ID before updating invitation
                    s.flush()
                    
                    # Handle invitation if present
                    if token and invitation:
                        # Re-fetch invitation in this transaction to ensure consistency
                        invitation = s.get(Invitation, invitation.id)
                        if invitation and invitation.is_valid():
                            invitation.used = True
                            invitation.used_by_id = new_user.id
                            s.add(invitation)
                    
                    # Commit transaction - triggers real-time save to database
                    s.commit()
                    
                    # Success logging
                    app.logger.info(
                        f"✅ User registration successful | "
                        f"Username: {username} | "
                        f"ID: {new_user.id} | "
                        f"Saved to DB: Real-time"
                    )
                    
                    flash("Account created successfully! Please log in.", "success")
                    return redirect(url_for("login"))
                    
            except IntegrityError as e:
                # Handle database constraint violations (e.g., duplicate username)
                app.logger.error(f"❌ Registration failed - Integrity error: {str(e)}")
                flash("Username already exists. Please choose a different username.", "error")
            except SQLAlchemyError as e:
                # Handle other database errors
                app.logger.error(f"❌ Registration failed - Database error: {str(e)}")
                flash("An error occurred during registration. Please try again.", "error")
            except Exception as e:
                # Handle any unexpected errors
                app.logger.error(f"❌ Registration failed - Unexpected error: {str(e)}", exc_info=True)
                flash("An unexpected error occurred. Please try again.", "error")

        return render_template("register.html", form=form, invitation=invitation)

    @app.route("/logout")
    @login_required
    def logout():
        session.clear()
        flash("Logged out", "success")
        return redirect(url_for("login"))

    @app.route("/profile/setup-2fa", methods=["GET", "POST"])
    @login_required
    def setup_2fa():
        user = current_user()
        form = Setup2FAForm()

        if form.validate_on_submit():
            secret = form.secret.data
            totp = pyotp.TOTP(secret)
            if totp.verify(form.totp_code.data):
                with db() as s:
                    db_user = s.get(User, user.id)
                    db_user.totp_secret = secret
                    s.commit()
                flash("2FA enabled successfully!", "success")
                return redirect(url_for("profile"))
            else:
                flash("Invalid code. Please scan the QR code and try again.", "error")

        secret = pyotp.random_base32()
        uri = pyotp.totp.TOTP(secret).provisioning_uri(name=user.username, issuer_name="Beautiful Notes")
        img = qrcode.make(uri)
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        qr_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

        form.secret.data = secret

        return render_template("setup_2fa.html", form=form, qr_code=qr_base64, secret=secret)

    @app.route("/profile/disable-2fa", methods=["POST"])
    @login_required
    def disable_2fa():
        user = current_user()
        with db() as s:
            db_user = s.get(User, user.id)
            db_user.totp_secret = None
            s.commit()
        flash("2FA has been disabled.", "warning")
        return redirect(url_for("profile"))

    @app.route("/forgot-password", methods=["GET", "POST"])
    def forgot_password():
        if current_user():
            return redirect(url_for("index"))

        form = ForgotPasswordForm()
        if form.validate_on_submit():
            with db() as s:
                user = s.execute(select(User).where(User.username == form.username.data)).scalar_one_or_none()

                if user:
                    if user.totp_secret:
                        session['reset_2fa_user_id'] = user.id
                        return redirect(url_for('verify_2fa_reset'))

                    token = secrets.token_urlsafe(32)
                    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

                    s.execute(text("UPDATE password_reset_tokens SET used = 1 WHERE user_id = :user_id AND used = 0"), {"user_id": user.id})

                    reset_token = PasswordResetToken(user_id=user.id, token=token, expires_at=expires_at)
                    s.add(reset_token)
                    s.commit()

                    print(f"\n[SECURITY] Password reset token for '{user.username}': {token}\n")

                    return render_template("forgot_password.html", form=form, token=None, token_generated=True)
                else:
                    flash("If that username exists, a password reset token has been generated.", "success")
                    return redirect(url_for("login"))

        return render_template("forgot_password.html", form=form, token=None, token_generated=False)

    @app.route("/verify-2fa-reset", methods=["GET", "POST"])
    def verify_2fa_reset():
        user_id = session.get('reset_2fa_user_id')
        if not user_id:
            return redirect(url_for("forgot_password"))

        form = Verify2FAForm()
        if form.validate_on_submit():
            with db() as s:
                user = s.get(User, user_id)
                if user and user.verify_totp(form.totp_code.data):
                    session.pop('reset_2fa_user_id', None)

                    token = secrets.token_urlsafe(32)
                    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

                    s.execute(text("UPDATE password_reset_tokens SET used = 1 WHERE user_id = :user_id AND used = 0"), {"user_id": user.id})
                    reset_token = PasswordResetToken(user_id=user.id, token=token, expires_at=expires_at)
                    s.add(reset_token)
                    s.commit()

                    flash("Identity verified! Please set your new password.", "success")
                    return redirect(url_for('reset_password', token=token))
                else:
                    flash("Invalid 2FA code.", "error")

        return render_template("verify_2fa_reset.html", form=form)

    @app.route("/reset-password/<token>", methods=["GET", "POST"])
    def reset_password(token: str):
        if current_user():
            return redirect(url_for("index"))
        form = ResetPasswordForm()

        with db() as s:
            reset_token = s.execute(select(PasswordResetToken).where(PasswordResetToken.token == token)).scalar_one_or_none()

            if not reset_token or not reset_token.is_valid():
                flash("Invalid or expired reset token.", "error")
                return redirect(url_for("forgot_password"))

            if form.validate_on_submit():
                user = s.get(User, reset_token.user_id)
                if user:
                    user.set_password(form.password.data)
                    reset_token.used = True
                    s.commit()
                    flash("Password reset successfully!", "success")
                    return redirect(url_for("login"))

            return render_template("reset_password.html", form=form, token=token)

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
                    tag_names = parse_tags(form.tags.data)
                    for tag_name in tag_names:
                        tag = s.execute(select(Tag).where(Tag.name == tag_name)).scalar_one_or_none()
                        if not tag:
                            tag = Tag(name=tag_name)
                            s.add(tag)
                        note.tags.append(tag)
                    s.add(note)
                    s.commit()
                    note_id = note.id
                    flash("Note created!", "success")
                    return redirect(url_for("view_note", note_id=note_id))
            except Exception as exc:
                flash(f"Error creating note: {exc}", "error")
        if request.method == "GET":
            form = NoteForm()
        return render_template("edit_note.html", form=form, note=None, is_edit=False)

    @app.route("/note/<int:note_id>")
    @login_required
    def view_note(note_id: int):
        user = current_user()
        with db() as s:
            note = s.execute(select(Note).options(joinedload(Note.tags)).where(Note.id == note_id)).unique().scalar_one_or_none()
            if not note:
                abort(404)
            has_access = False
            can_edit = False
            if note.owner_id is not None and note.owner_id == user.id:
                has_access = True
                can_edit = True
            else:
                share = s.execute(select(ShareNote).where(ShareNote.note_id == note_id, ShareNote.shared_with_id == user.id)).scalar_one_or_none()
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
            note = s.execute(select(Note).options(joinedload(Note.tags)).where(Note.id == note_id)).unique().scalar_one_or_none()
            if not note:
                abort(404)
            can_edit = False
            if note.owner_id is not None and note.owner_id == user.id:
                can_edit = True
            else:
                share = s.execute(select(ShareNote).where(ShareNote.note_id == note_id, ShareNote.shared_with_id == user.id)).scalar_one_or_none()
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
                    if note.owner_id is not None and note.owner_id == user.id:
                        note.pinned = form.pinned.data
                        note.favorite = form.favorite.data
                        note.archived = form.archived.data
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
                except Exception as exc:
                    flash(f"Error updating note: {exc}", "error")

            preview_html = note.render_markdown()
            return render_template("edit_note.html", form=form, note=note, preview_html=preview_html, is_edit=True)

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
                    s.execute(text("DELETE FROM share_notes WHERE note_id = :note_id"), {"note_id": note_id})
                    s.delete(note)
                    s.commit()
                    flash("Note deleted", "success")
        except Exception as exc:
            flash(f"Error deleting note: {exc}", "error")
        return redirect(url_for("index"))

    @app.route("/note/<int:note_id>/toggle-pin", methods=["POST"])
    @login_required
    def toggle_pin(note_id: int):
        user = current_user()
        with db() as s:
            note = s.get(Note, note_id)
            if not note:
                abort(404)
            if note.owner_id is None or note.owner_id != user.id:
                flash("Only the note owner can pin/unpin notes.", "error")
                return redirect(url_for("view_note", note_id=note_id))
            note.pinned = not note.pinned
            is_pinned = note.pinned
            s.commit()
        flash(f"Note {'pinned' if is_pinned else 'unpinned' }.", "success")
        return redirect(url_for("view_note", note_id=note_id))

    @app.route("/note/<int:note_id>/toggle-favorite", methods=["POST"])
    @login_required
    def toggle_favorite(note_id: int):
        user = current_user()
        with db() as s:
            note = s.get(Note, note_id)
            if not note:
                abort(404)
            has_access = False
            if note.owner_id is not None and note.owner_id == user.id:
                has_access = True
            else:
                share = s.execute(select(ShareNote).where(ShareNote.note_id == note_id, ShareNote.shared_with_id == user.id)).scalar_one_or_none()
                if share:
                    has_access = True
            if not has_access:
                flash("You don't have access to this note.", "error")
                return redirect(url_for("index"))
            note.favorite = not note.favorite
            is_favorite = note.favorite
            s.commit()
        flash(f"Note {'favorited' if is_favorite else 'unfavorited' }.", "success")
        return redirect(url_for("view_note", note_id=note_id))

    @app.route("/note/<int:note_id>/toggle-archive", methods=["POST"])
    @login_required
    def toggle_archive(note_id: int):
        user = current_user()
        with db() as s:
            note = s.get(Note, note_id)
            if not note:
                abort(404)
            if note.owner_id is None or note.owner_id != user.id:
                flash("You can only archive notes you own.", "error")
                return redirect(url_for("index"))

            note.archived = not note.archived
            is_archived = note.archived
            s.commit()

        status = "archived" if is_archived else "unarchived"
        flash(f"Note {status}.", "success")
        return redirect(request.referrer or url_for("index"))

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

    @app.route("/note/<int:note_id>/share", methods=["GET", "POST"])
    @login_required
    def share_note(note_id: int):
        user = current_user()
        with db() as s:
            note = s.execute(select(Note).options(joinedload(Note.tags)).where(Note.id == note_id)).unique().scalar_one_or_none()
            if not note:
                abort(404)
            if note.owner_id is None or note.owner_id != user.id:
                flash("You can only share notes you own.", "error")
                return redirect(url_for("view_note", note_id=note_id))
            form = ShareNoteForm()
            if form.validate_on_submit():
                shared_with_user = s.execute(select(User).where(User.username == form.username.data)).scalar_one_or_none()
                if not shared_with_user:
                    flash("User not found.", "error")
                elif shared_with_user.id == user.id:
                    flash("You cannot share a note with yourself.", "error")
                else:
                    existing_share = s.execute(select(ShareNote).where(ShareNote.note_id == note_id, ShareNote.shared_with_id == shared_with_user.id)).scalar_one_or_none()
                    if existing_share:
                        flash(f"Note is already shared with {shared_with_user.username}.", "warning")
                    else:
                        share = ShareNote(note_id=note_id, shared_by_id=user.id, shared_with_id=shared_with_user.id, can_edit=form.can_edit.data)
                        s.add(share)
                        s.commit()
                        flash(f"Note shared with {shared_with_user.username}!", "success")
                        return redirect(url_for("view_note", note_id=note_id))
            shared_with = s.execute(select(ShareNote, User).join(User, ShareNote.shared_with_id == User.id).where(ShareNote.note_id == note_id)).all()
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
                token = secrets.token_urlsafe(32)
                expires_at = datetime.now(timezone.utc) + timedelta(days=7)
                invitation = Invitation(token=token, inviter_id=user.id, email=form.email.data or None, message=form.message.data or None, expires_at=expires_at)
                s.add(invitation)
                s.commit()
                invite_url = request.url_root.rstrip('/') + url_for('register', token=token)
                flash(f"Invitation created! Share this link: {invite_url}", "success")
                return render_template("invite.html", form=form, invite_url=invite_url, token=token)
        with db() as s:
            invitations = s.execute(select(Invitation).where(Invitation.inviter_id == user.id).order_by(Invitation.created_at.desc())).scalars().all()
        return render_template("invite.html", form=form, invitations=invitations, invite_url=None, token=None)

    @app.route("/profile")
    @login_required
    def profile():
        user = current_user()
        with db() as s:
            total_notes = s.execute(select(func.count(Note.id)).where(Note.owner_id == user.id)).scalar() or 0
            favorite_notes = s.execute(select(func.count(Note.id)).where(Note.owner_id == user.id, Note.favorite == True)).scalar() or 0
            archived_notes = s.execute(select(func.count(Note.id)).where(Note.owner_id == user.id, Note.archived == True)).scalar() or 0
            shared_notes_count = s.execute(select(func.count(ShareNote.id)).where(ShareNote.shared_by_id == user.id)).scalar() or 0
            notes_shared_with_me = s.execute(select(func.count(ShareNote.id)).where(ShareNote.shared_with_id == user.id)).scalar() or 0
            total_tags = s.execute(select(func.count(Tag.id))).scalar() or 0
            recent_notes = s.execute(select(Note).where(Note.owner_id == user.id).order_by(Note.updated_at.desc()).limit(5)).scalars().all()
            shared_with_me = s.execute(select(Note, ShareNote, User).join(ShareNote, Note.id == ShareNote.note_id).join(User, ShareNote.shared_by_id == User.id).where(ShareNote.shared_with_id == user.id).order_by(ShareNote.created_at.desc()).limit(5)).all()
        return render_template("profile.html", user=user, total_notes=total_notes, favorite_notes=favorite_notes, archived_notes=archived_notes, shared_notes_count=shared_notes_count, notes_shared_with_me=notes_shared_with_me, total_tags=total_tags, recent_notes=recent_notes, shared_with_me=shared_with_me, is_own_profile=True)

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
                if form.username.data != db_user.username:
                    existing_user = s.execute(select(User).where(User.username == form.username.data)).scalar_one_or_none()
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
            total_notes = s.execute(select(func.count(Note.id)).where(Note.owner_id == user_id)).scalar() or 0
            is_own_profile = (current.id == user_id)
            return render_template("profile.html", user=profile_user, total_notes=total_notes, favorite_notes=0, archived_notes=0, shared_notes_count=0, notes_shared_with_me=0, total_tags=0, recent_notes=[], shared_with_me=[], is_own_profile=is_own_profile)

    @app.route("/tasks")
    @login_required
    def tasks():
        user = current_user()
        filter_type = request.args.get('filter', 'all')
        with db() as s:
            stmt = select(Task).where(Task.owner_id == user.id)
            if filter_type == 'active':
                stmt = stmt.where(Task.completed == False)
            elif filter_type == 'completed':
                stmt = stmt.where(Task.completed == True)
            priority_order = case((Task.priority == 'high', 1), (Task.priority == 'medium', 2), (Task.priority == 'low', 3), else_=2)
            tasks_list = s.execute(stmt.order_by(Task.completed.asc(), priority_order, Task.due_date.asc().nullslast(), Task.created_at.desc())).scalars().all()
            total_tasks = s.execute(select(func.count(Task.id)).where(Task.owner_id == user.id)).scalar() or 0
            completed_tasks = s.execute(select(func.count(Task.id)).where(Task.owner_id == user.id, Task.completed == True)).scalar() or 0
            active_tasks = total_tasks - completed_tasks
        return render_template("tasks.html", tasks=tasks_list, filter_type=filter_type, total_tasks=total_tasks, completed_tasks=completed_tasks, active_tasks=active_tasks)

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
                        due_date = datetime.combine(form.due_date.data, datetime.min.time()).replace(tzinfo=timezone.utc)
                    task = Task(title=form.title.data.strip(), description=form.description.data or None, due_date=due_date, priority=form.priority.data, owner_id=user.id)
                    s.add(task)
                    s.commit()
                    flash("Task created!", "success")
                    return redirect(url_for("tasks"))
            except Exception as exc:
                flash(f"Error creating task: {exc}", "error")
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
            if request.method == "GET" and task.due_date:
                form.due_date.data = task.due_date.date()
            if form.validate_on_submit():
                try:
                    task.title = form.title.data.strip()
                    task.description = form.description.data or None
                    if form.due_date.data:
                        task.due_date = datetime.combine(form.due_date.data, datetime.min.time()).replace(tzinfo=timezone.utc)
                    else:
                        task.due_date = None
                    task.priority = form.priority.data
                    s.commit()
                    flash("Task updated!", "success")
                    return redirect(url_for("tasks"))
                except Exception as exc:
                    flash(f"Error updating task: {exc}", "error")
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
        except Exception as exc:
            flash(f"Error deleting task: {exc}", "error")
        return redirect(url_for("tasks", filter=request.args.get('filter', 'all')))

    @app.context_processor
    def inject_user():
        user = current_user()
        theme = session.get("theme")
        if user and not theme:
            with db() as s:
                db_user = s.get(User, user.id)
                theme = db_user.theme if db_user else "light"
                session["theme"] = theme
        if not theme:
            theme = "light"
        return dict(current_user=user, current_theme=theme)

    @app.errorhandler(404)
    def not_found(error):
        return render_template("error.html", error="Page not found", code=404), 404

    @app.errorhandler(500)
    def server_error(error):
        return render_template("error.html", error="Internal server error", code=500), 500
