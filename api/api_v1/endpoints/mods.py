from fastapi import APIRouter, Depends, HTTPException, Response, Request, Form, File, UploadFile
from fastapi_pagination import paginate, Page, Params
from db.schemas import schemas
from db import controller
from db.models import models
from db.session import SessionLocal
from internal.auth import get_current_user
from sqlalchemy.orm import Session
from sqlalchemy import desc
from internal.limiter import limiter
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from typing import List
from pathlib import Path
import re


def _remove_html(text):
    return re.sub(re.compile('<.*?>'), '', text)

router = APIRouter()


# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db

    finally:
        db.close()


#Set our Jinja template dir
templates = Jinja2Templates(directory="templates")


#Returns dynamically built view for mods. Only way to get meta tags working (that I know of).
@router.get("/modview", response_class=HTMLResponse)
async def return_mod(request: Request, modId: int, db: Session = Depends(get_db)):
    mod = controller.get_mod(db, mod_id=modId)

    if mod:
        return templates.TemplateResponse("mod/index.html", {"request": request, "modName": mod.modName, "id": mod.id, "modDescription": mod.modDescription})

    else:
        return templates.TemplateResponse("404/index.html", {"request": request})


#Get all Mods
@router.get("/mods/")
@limiter.limit("60/minute")
def read_mods(request: Request, tag: str = None, params: Params = Depends(), db: Session = Depends(get_db)):
    mods = controller.get_mods(db, tag=tag)

    if mods:
        return paginate(mods, params)

    else:
        raise HTTPException(status_code=400, detail="Mods not found")


#Get all Mods Newest first
@router.get("/mods/newest", response_model=Page[schemas.Mod])
@limiter.limit("60/minute")
def read_mods_new(request: Request, tag: str = None, version: str = None, params: Params = Depends(), db: Session = Depends(get_db)):
    mods = controller.get_newest_mods(db, tag=tag, version=version)

    if mods:
        return paginate(mods, params)

    else:
        raise HTTPException(status_code=400, detail="Mods not found")


#Get all Mods Most Downloads first
@router.get("/mods/downloaded", response_model=Page[schemas.Mod])
@limiter.limit("60/minute")
def read_mods_downloaded(request: Request, tag: str = None, version: str = None, params: Params = Depends(), db: Session = Depends(get_db)):
    mods = controller.get_most_downloaded_mods(db, tag=tag, version=version)

    if mods:
        return paginate(mods, params)

    else:
        raise HTTPException(status_code=400, detail="Mods not found")


#Get all Mods Oldest first
@router.get("/mods/oldest", response_model=Page[schemas.Mod])
@limiter.limit("60/minute")
def read_mods_oldest(request: Request, tag: str = None, version: str = None, params: Params = Depends(), db: Session = Depends(get_db)):
    mods = controller.get_oldest_mods(db, tag=tag, version=version)

    if mods:
        return paginate(mods, params)

    else:
        raise HTTPException(status_code=400, detail="Mods not found")


#Get all Mods by most upvoted first
@router.get("/mods/popular", response_model=Page[schemas.Mod])
@limiter.limit("60/minute")
def read_mods_popular(request: Request, tag: str = None, version: str = None, params: Params = Depends(), db: Session = Depends(get_db)):
    mods = controller.get_popular_mods(db, tag=tag, version=version)

    if mods:
        return paginate(mods, params)

    else:
        raise HTTPException(status_code=400, detail="Mods not found")


#Search Mods
@router.get("/mods/search/{search_text}")
def search_mods(search_text: str = 0, params: Params = Depends(), db: Session = Depends(get_db)):
    mods = controller.search_mods(db, search_text=search_text)

    if mods:
        return paginate([dict(modx._mapping) for modx in mods], params)

    else:
        return paginate([], params)


#Get single mod
@router.get("/mods/{mod_id}")
def read_mod(mod_id: int, db: Session = Depends(get_db)):
    mod = controller.get_mod(db, mod_id=mod_id)

    if mod:
        return mod

    else:
        raise HTTPException(status_code=400, detail="Mod not found")


#Delete Mod entry
@router.delete("/mods/{mod_id}")
def delete_mod(mod_id: int = 0, db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    status, msg = controller.delete_mod(db, mod_id=mod_id, user=user)

    if status:
        return HTTPException(status_code=200, detail="Mod deleted successfully")

    else:
        raise HTTPException(status_code=400, detail=msg)


#Get single mod file
@router.get("/mods/{mod_id}/file")
@limiter.limit("60/minute")
def read_mod_file(request: Request, mod_id: int, db: Session = Depends(get_db)):
    mod = controller.get_mod_file(db, mod_id=mod_id, request=request)

    if mod:
        mod_dir = Path("/app/static/mods/pak/" + str(mod.id))
        pak_file = mod_dir / mod.modFileName
        if not pak_file.exists():
            raise HTTPException(status_code=404, detail="Mod file not found on disk")
        file_data = pak_file.read_bytes()
        headers = {'Content-Disposition': 'attachment; filename="{}"'.format(mod.modFileName)}
        return Response(file_data, headers=headers, media_type='application/octet-stream')

    else:
        raise HTTPException(status_code=400, detail="Mod file not found")


#Patch Single Mod
@router.patch("/mods/{mod_id}")
def patch_mod(mod_id: int, modUserDesc: str = Form(" "), modVisibility: bool = Form(...), modTags: str = Form(...), modName: str = Form(...), gameVersion: str = Form(None), db: Session = Depends(get_db), user: str = Depends(get_current_user)):

    modVisibility = not modVisibility

    mod = controller.update_mod(db, mod_id=mod_id, modUserDesc=modUserDesc, modTags=modTags, modName=modName, user=user, modVisibility=modVisibility, gameVersion=gameVersion)

    if mod:
        return HTTPException(status_code=200, detail="Mod updated successfully")

    else:
        raise HTTPException(status_code=400, detail="Failed to update mod")


#Get mod changelog
@router.get("/mods/{mod_id}/changelog")
def get_mod_changelog(mod_id: int, db: Session = Depends(get_db)):
    return controller.get_changelog(db, "mod", mod_id)


#Replace mod file
@router.post("/update/mod/{mod_id}")
def update_mod_file(
    mod_id: int,
    changelog: str = Form(...),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    user: str = Depends(get_current_user),
):
    if not user:
        raise HTTPException(status_code=403, detail="Unauthorized")

    if len(changelog.strip()) == 0:
        raise HTTPException(status_code=400, detail="Changelog entry is required.")

    # Validate ownership
    valid = controller.validate_user_mod_file(db, user.id, mod_id)
    if not valid and not getattr(user, 'is_admin', False):
        raise HTTPException(status_code=403, detail="Access denied or mod not found.")

    modFile = None
    for file in files:
        if file.filename.endswith('.zip'):
            modFile = file
            break

    if not modFile:
        raise HTTPException(status_code=400, detail="Mod .zip file required.")

    modContents = modFile.file.read()
    modFile.file.close()

    newSize = len(modContents)
    controller.update_mod_size(db, mod_id, newSize)

    entry = _remove_html(changelog)[:2000]
    controller.create_changelog_entry(db, "mod", mod_id, entry, user.id)

    return HTTPException(status_code=200, detail="Mod updated successfully.")
