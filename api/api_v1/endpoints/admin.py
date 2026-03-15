import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, Form
from db.session import SessionLocal
from db import controller
from db.models import models
from sqlalchemy.orm import Session
from internal.auth import get_current_admin

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _dir_size(path: str) -> int:
    total = 0
    try:
        for dirpath, _, filenames in os.walk(path):
            for f in filenames:
                try:
                    total += os.path.getsize(os.path.join(dirpath, f))
                except OSError:
                    pass
    except Exception:
        pass
    return total


@router.get("/admin/users")
def list_users(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    users = controller.get_all_users_admin(db)
    return [dict(u._mapping) for u in users]


@router.patch("/admin/users/{user_id}/toggle")
def toggle_user(user_id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot disable your own account.")
    user = controller.toggle_user_active(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"id": user.id, "is_active": user.is_active}


@router.patch("/admin/users/{user_id}/promote")
def promote_user(user_id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own admin status.")
    user = controller.toggle_user_admin(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"id": user.id, "is_admin": user.is_admin}


@router.get("/admin/settings")
def get_settings(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    settings = controller.get_or_create_settings(db)
    return {"registration_enabled": settings.registration_enabled}


@router.patch("/admin/settings")
def update_settings(
    registration_enabled: bool = Form(...),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    settings = controller.get_or_create_settings(db)
    settings.registration_enabled = registration_enabled
    db.commit()
    return {"registration_enabled": settings.registration_enabled}


@router.get("/admin/stats")
def get_stats(admin=Depends(get_current_admin)):
    static_dir = "/app/static"
    used_bytes = _dir_size(static_dir)

    try:
        disk = shutil.disk_usage(static_dir)
        disk_total = disk.total
        disk_free = disk.free
    except Exception:
        disk_total = 0
        disk_free = 0

    return {
        "static_used_bytes": used_bytes,
        "disk_total_bytes": disk_total,
        "disk_free_bytes": disk_free,
    }
