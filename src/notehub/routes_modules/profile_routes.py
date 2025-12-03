"""User profile and invitation routes."""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from flask import flash, redirect, render_template, request, session, url_for
from sqlalchemy import func, select

from ..forms import ChangePasswordForm, InviteForm, ProfileEditForm
from ..models import Invitation, Note, ShareNote, Tag, User
from ..services.utils import current_user, db, invalidate_user_cache, login_required


def register_profile_routes(app):
    """Register profile-related routes."""
    
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
                # Invalidate user cache after profile update
                invalidate_user_cache()
                flash("Profile updated successfully!", "success")
                return redirect(url_for("profile"))
        return render_template("edit_profile.html", form=form, user=user)

    @app.route("/profile/change-password", methods=["GET", "POST"])
    @login_required
    def change_password():
        user = current_user()
        form = ChangePasswordForm()
        if form.validate_on_submit():
            with db() as s:
                db_user = s.get(User, user.id)
                if not db_user:
                    flash("User not found.", "error")
                    return redirect(url_for("profile"))
                
                # Verify current password
                if not db_user.check_password(form.current_password.data):
                    flash("Current password is incorrect.", "error")
                    return render_template("change_password.html", form=form, user=user)
                
                # Update password
                db_user.set_password(form.new_password.data)
                s.commit()
                flash("Password changed successfully!", "success")
                return redirect(url_for("profile"))
        return render_template("change_password.html", form=form, user=user)

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
                # Invalidate user cache after theme toggle
                invalidate_user_cache()
        return redirect(request.referrer or url_for("index"))
