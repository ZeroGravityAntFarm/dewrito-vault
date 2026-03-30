import os
import json
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


@router.patch("/admin/users/{user_id}/password")
def set_user_password(user_id: int, password: str = Form(None), db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    # Generate a random password if none supplied
    if not password:
        import secrets
        import string
        alphabet = string.ascii_letters + string.digits
        password = ''.join(secrets.choice(alphabet) for _ in range(12))

    user = controller.set_user_password(db, user_id, password)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Return assigned temporary password in response so admin can convey it
    return {"id": user.id, "temp_password": password}


@router.patch("/admin/users/{user_id}/rename")
def rename_user(user_id: int, new_name: str = Form(...), db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    new_name = new_name.strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="Username cannot be empty.")
    if db.query(models.User).filter(models.User.name == new_name).first():
        raise HTTPException(status_code=400, detail="Username already taken.")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.name = new_name
    db.commit()
    return {"id": user.id, "name": user.name}


@router.get("/tags")
def get_tags_public(db: Session = Depends(get_db)):
    settings = controller.get_or_create_settings(db)
    return {
        "map_tags": json.loads(settings.map_tags or "[]"),
        "mod_tags": json.loads(settings.mod_tags or "[]"),
        "game_versions": json.loads(settings.game_versions or "[]"),
    }


@router.get("/admin/settings")
def get_settings(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    settings = controller.get_or_create_settings(db)
    return {
        "registration_enabled": settings.registration_enabled,
        "map_tags": json.loads(settings.map_tags or "[]"),
        "mod_tags": json.loads(settings.mod_tags or "[]"),
        "webhook_domain": settings.webhook_domain or "",
        "game_versions": json.loads(settings.game_versions or "[]"),
    }


@router.patch("/admin/settings")
def update_settings(
    registration_enabled: bool = Form(...),
    webhook_domain: str = Form(default=""),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    settings = controller.get_or_create_settings(db)
    settings.registration_enabled = registration_enabled
    settings.webhook_domain = webhook_domain.strip().rstrip("/") or None
    db.commit()
    return {
        "registration_enabled": settings.registration_enabled,
        "webhook_domain": settings.webhook_domain or "",
    }


@router.post("/admin/settings/tags/{tag_type}")
def add_tag(
    tag_type: str,
    tag: str = Form(...),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    if tag_type not in ("map", "mod"):
        raise HTTPException(status_code=400, detail="tag_type must be 'map' or 'mod'")
    tag = tag.strip()
    if not tag:
        raise HTTPException(status_code=400, detail="Tag cannot be empty")
    settings = controller.get_or_create_settings(db)
    col = f"{tag_type}_tags"
    tags = json.loads(getattr(settings, col) or "[]")
    if tag not in tags:
        tags.append(tag)
        setattr(settings, col, json.dumps(tags))
        db.commit()
    return {"map_tags": json.loads(settings.map_tags or "[]"), "mod_tags": json.loads(settings.mod_tags or "[]")}


@router.delete("/admin/settings/tags/{tag_type}")
def remove_tag(
    tag_type: str,
    tag: str = Form(...),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    if tag_type not in ("map", "mod"):
        raise HTTPException(status_code=400, detail="tag_type must be 'map' or 'mod'")
    tag_clean = tag.strip()
    settings = controller.get_or_create_settings(db)
    col = f"{tag_type}_tags"
    current_tags = [t for t in json.loads(getattr(settings, col) or "[]") if t.strip()]
    filtered = [t for t in current_tags if t.lower() != tag_clean.lower()]
    setattr(settings, col, json.dumps(filtered))
    db.commit()

    # Remove tag from existing map/mod items too
    controller.remove_tag_from_items(db, tag_type, tag_clean)

    return {"map_tags": json.loads(settings.map_tags or "[]"), "mod_tags": json.loads(settings.mod_tags or "[]")}


@router.patch("/admin/settings/tags/{tag_type}/rename")
def rename_tag(
    tag_type: str,
    old_tag: str = Form(...),
    new_tag: str = Form(...),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    if tag_type not in ("map", "mod"):
        raise HTTPException(status_code=400, detail="tag_type must be 'map' or 'mod'")

    old_tag = old_tag.strip()
    new_tag = new_tag.strip()

    if not old_tag or not new_tag:
        raise HTTPException(status_code=400, detail="Tags cannot be empty")

    if old_tag == new_tag:
        raise HTTPException(status_code=400, detail="New tag must be different")

    settings = controller.get_or_create_settings(db)
    col = f"{tag_type}_tags"
    tags = [t for t in json.loads(getattr(settings, col) or "[]")]

    if old_tag not in tags:
        raise HTTPException(status_code=404, detail="Tag not found")

    if new_tag in tags:
        raise HTTPException(status_code=400, detail="Tag already exists")

    tags = [new_tag if t == old_tag else t for t in tags]
    setattr(settings, col, json.dumps(tags))
    db.commit()

    # Update existing map/mod rows that had this tag
    controller.rename_tags_in_items(db, tag_type, old_tag, new_tag)

    return {"map_tags": json.loads(settings.map_tags or "[]"), "mod_tags": json.loads(settings.mod_tags or "[]")}


@router.post("/admin/settings/game-versions")
def add_game_version(
    version: str = Form(...),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    version = version.strip()
    if not version:
        raise HTTPException(status_code=400, detail="Version cannot be empty")
    settings = controller.get_or_create_settings(db)
    versions = json.loads(settings.game_versions or "[]")
    if version not in versions:
        versions.append(version)
        settings.game_versions = json.dumps(versions)
        db.commit()
    return {"game_versions": json.loads(settings.game_versions)}


@router.delete("/admin/settings/game-versions")
def remove_game_version(
    version: str = Form(...),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    version_clean = version.strip()
    settings = controller.get_or_create_settings(db)
    versions = [v for v in json.loads(settings.game_versions or "[]") if v.strip() != version_clean]
    settings.game_versions = json.dumps(versions)
    db.commit()
    controller.remove_game_version_from_items(db, version_clean)
    return {"game_versions": json.loads(settings.game_versions)}


@router.patch("/admin/settings/game-versions/rename")
def rename_game_version(
    old_version: str = Form(...),
    new_version: str = Form(...),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    old_version = old_version.strip()
    new_version = new_version.strip()
    if not old_version or not new_version:
        raise HTTPException(status_code=400, detail="Versions cannot be empty")
    if old_version == new_version:
        raise HTTPException(status_code=400, detail="New version must be different")
    settings = controller.get_or_create_settings(db)
    versions = json.loads(settings.game_versions or "[]")
    if old_version not in versions:
        raise HTTPException(status_code=404, detail="Version not found")
    if new_version in versions:
        raise HTTPException(status_code=400, detail="Version already exists")
    versions = [new_version if v == old_version else v for v in versions]
    settings.game_versions = json.dumps(versions)
    db.commit()
    controller.rename_game_version_in_items(db, old_version, new_version)
    return {"game_versions": json.loads(settings.game_versions)}


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
