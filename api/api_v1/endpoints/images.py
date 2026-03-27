from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from pydantic import BaseModel
from typing import List
from db.models import models
from db.session import SessionLocal
from sqlalchemy.orm import Session
from internal.auth import get_current_user
from PIL import Image
from io import BytesIO
from pathlib import Path

router = APIRouter()

VALID_TYPES = {'maps', 'mods', 'prefabs'}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _owner_id(db: Session, t: str, item_id: int):
    if t == 'maps':
        item = db.query(models.Map).filter(models.Map.id == item_id).first()
    elif t == 'mods':
        item = db.query(models.Mod).filter(models.Mod.id == item_id).first()
    elif t == 'prefabs':
        item = db.query(models.PreFab).filter(models.PreFab.id == item_id).first()
    else:
        return None
    return item.owner_id if item else None


def _img_dir(t: str, item_id: int) -> Path:
    return Path(f"/app/static/{t}/{item_id}")


def _tb_dir(t: str, item_id: int) -> Path:
    return Path(f"/app/static/{t}/tb/{item_id}")


def _count(t: str, item_id: int) -> int:
    d = _img_dir(t, item_id)
    if not d.exists():
        return 0
    return sum(1 for i in range(5) if (d / str(i)).exists())


def _write(t: str, item_id: int, idx: int, data: bytes):
    idir = _img_dir(t, item_id)
    tdir = _tb_dir(t, item_id)
    idir.mkdir(parents=True, exist_ok=True)
    tdir.mkdir(parents=True, exist_ok=True)
    (idir / str(idx)).write_bytes(data)
    img = Image.open(BytesIO(data))
    img.thumbnail((450, 300))
    img = img.convert('RGB')
    img.save(str(tdir / str(idx)), 'JPEG')
    img.close()


class ReorderBody(BaseModel):
    order: List[int]


def _check_type(t: str):
    if t not in VALID_TYPES:
        raise HTTPException(status_code=400, detail="Invalid content type")


def _check_owner(db: Session, t: str, item_id: int, user):
    oid = _owner_id(db, t, item_id)
    if oid is None:
        raise HTTPException(status_code=404, detail="Item not found")

    is_admin = getattr(user, 'is_admin', False)
    if not is_admin and oid != user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")


@router.get("/images/{t}/{item_id}")
def image_count(t: str, item_id: int):
    _check_type(t)
    return {"count": _count(t, item_id)}


@router.post("/images/{t}/{item_id}")
def add_images(
    t: str,
    item_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    _check_type(t)
    _check_owner(db, t, item_id, user)
    current = _count(t, item_id)
    if current + len(files) > 5:
        raise HTTPException(status_code=400, detail=f"Only {5 - current} image slot(s) remaining")
    for file in files:
        if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif', '.webp')):
            raise HTTPException(status_code=400, detail=f"Invalid file: {file.filename}")
    for file in files:
        _write(t, item_id, current, file.file.read())
        current += 1
    return {"count": current}


@router.delete("/images/{t}/{item_id}/{index}")
def delete_image(
    t: str,
    item_id: int,
    index: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    _check_type(t)
    _check_owner(db, t, item_id, user)
    current = _count(t, item_id)
    if index < 0 or index >= current:
        raise HTTPException(status_code=400, detail="Invalid index")
    idir = _img_dir(t, item_id)
    tdir = _tb_dir(t, item_id)
    (idir / str(index)).unlink(missing_ok=True)
    tb = tdir / str(index)
    if tb.exists():
        tb.unlink()
    for i in range(index + 1, current):
        (idir / str(i)).rename(idir / str(i - 1))
        tb = tdir / str(i)
        if tb.exists():
            tb.rename(tdir / str(i - 1))
    return {"count": current - 1}


@router.post("/images/{t}/{item_id}/reorder")
def reorder_images(
    t: str,
    item_id: int,
    body: ReorderBody,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    _check_type(t)
    _check_owner(db, t, item_id, user)
    current = _count(t, item_id)
    if sorted(body.order) != list(range(current)):
        raise HTTPException(status_code=400, detail="Invalid order array")
    idir = _img_dir(t, item_id)
    tdir = _tb_dir(t, item_id)
    for i in range(current):
        (idir / str(i)).rename(idir / f"_tmp_{i}")
        tb = tdir / str(i)
        if tb.exists():
            tb.rename(tdir / f"_tmp_{i}")
    for new_pos, old_pos in enumerate(body.order):
        (idir / f"_tmp_{old_pos}").rename(idir / str(new_pos))
        tb = tdir / f"_tmp_{old_pos}"
        if tb.exists():
            tb.rename(tdir / str(new_pos))
    return {"count": current}
