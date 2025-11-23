"""Note management routes (CRUD operations, sharing, search)."""

from __future__ import annotations

from flask import abort, flash, make_response, redirect, render_template, request, url_for
from sqlalchemy import select, text
from sqlalchemy.orm import aliased, joinedload, selectinload

from ..forms import NoteForm, SearchForm, ShareNoteForm
from ..models import Note, ShareNote, Tag, User, note_tag
from ..services.note_service import NoteService
from ..services.utils import current_user, db, login_required, parse_tags


def register_note_routes(app):
    """Register note-related routes."""
    
    @app.route("/")
    @login_required
    def index():
        form = SearchForm(request.args)
        query = form.query.data or ""
        tag_filter = form.tag_filter.data or ""
        view_type = request.args.get('view', 'all')
        user = current_user()

        with db() as s:
            notes, all_tags = NoteService.get_notes_for_user(
                s, user, view_type, query, tag_filter
            )

        response = make_response(render_template(
            "index.html",
            notes=notes,
            form=form,
            all_tags=all_tags,
            view_type=view_type
        ))
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return response

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
            note, has_access, can_edit = NoteService.check_note_access(s, note_id, user)
            if not note:
                abort(404)
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
