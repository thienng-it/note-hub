"""Task management routes."""

from __future__ import annotations

from datetime import datetime, timezone

from flask import flash, redirect, render_template, request, url_for
from sqlalchemy import case, func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from ..forms import TaskForm
from ..models import Task
from ..services.task_service import TaskService
from ..services.utils import current_user, db, login_required


def register_task_routes(app):
    """Register task-related routes."""
    
    @app.route("/tasks")
    @login_required
    def tasks():
        user = current_user()
        filter_type = request.args.get('filter', 'all')
        with db() as s:
            tasks_list = TaskService.get_tasks_for_user(s, user, filter_type)
            task_counts = TaskService.get_task_counts(s, user)
        return render_template(
            "tasks.html",
            tasks=tasks_list,
            filter_type=filter_type,
            total_tasks=task_counts['total'],
            completed_tasks=task_counts['completed'],
            active_tasks=task_counts['active']
        )

    @app.route("/task/new", methods=["GET", "POST"])
    @login_required
    def new_task():
        import logging
        logger = logging.getLogger(__name__)
        
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
            except IntegrityError as exc:
                s.rollback()
                logger.error(f"Integrity error creating task: {exc}")
                flash("Error: Database constraint violation. Please check your data.", "error")
            except SQLAlchemyError as exc:
                s.rollback()
                logger.error(f"Database error creating task: {exc}")
                flash("Error: Database error occurred. Please try again.", "error")
            except Exception as exc:
                s.rollback()
                logger.error(f"Unexpected error creating task: {exc}")
                flash("Error creating task. Please try again.", "error")
        if request.method == "GET":
            form = TaskForm()
        return render_template("edit_task.html", form=form, task=None, is_edit=False)

    @app.route("/task/<int:task_id>/edit", methods=["GET", "POST"])
    @login_required
    def edit_task(task_id: int):
        import logging
        logger = logging.getLogger(__name__)
        
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
                except IntegrityError as exc:
                    s.rollback()
                    logger.error(f"Integrity error updating task: {exc}")
                    flash("Error: Database constraint violation. Please check your data.", "error")
                except SQLAlchemyError as exc:
                    s.rollback()
                    logger.error(f"Database error updating task: {exc}")
                    flash("Error: Database error occurred. Please try again.", "error")
                except Exception as exc:
                    s.rollback()
                    logger.error(f"Unexpected error updating task: {exc}")
                    flash("Error updating task. Please try again.", "error")
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
