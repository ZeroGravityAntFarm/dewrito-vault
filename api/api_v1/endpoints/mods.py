from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Response, Request, Form
import re


def _remove_html(text):
    return re.sub(re.compile('<.*?>'), '', text)
from fastapi_pagination import paginate, Page, Params
from db.schemas import schemas
from db import controller
from db.session import SessionLocal
from internal.auth import get_current_user
from sqlalchemy.orm import Session
from internal.limiter import limiter 
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from internal.dewreader import *
from typing import List
from io import BytesIO
import shutil
import os

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
async def return_modview(request: Request, modId: int, db: Session = Depends(get_db)):
    mod = controller.get_mod(db, mod_id=modId)

    if mod:
        return templates.TemplateResponse("mod/index.html", {"request": request, "modName": mod.modName, "id": mod.id, "modDescription": mod.modDescription})

    else:
        return templates.TemplateResponse("404/index.html", {"request": request})


#Get all Mods
@router.get("/mods")
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


#Get all Mods Oldest first
@router.get("/mods/oldest", response_model=Page[schemas.Mod])
@limiter.limit("60/minute")
def read_mods_oldest(request: Request, tag: str = None, version: str = None, params: Params = Depends(), db: Session = Depends(get_db)):
    mods = controller.get_oldest_mods(db, tag=tag, version=version)

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


#Get all Mods by most upvoted first
@router.get("/mods/popular", response_model=Page[schemas.Mod])
@limiter.limit("60/minute")
def read_mods_popular(request: Request, tag: str = None, version: str = None, params: Params = Depends(), db: Session = Depends(get_db)):
    mods = controller.get_popular_mods(db, tag=tag, version=version)

    if mods:
        return paginate(mods, params)

    else:
        raise HTTPException(status_code=400, detail="Mods not found")


#Get mod changelog — must be before /{mod_id}
@router.get("/mods/{mod_id}/changelog")
def get_mod_changelog(mod_id: int, db: Session = Depends(get_db)):
    return controller.get_changelog(db, "mod", mod_id)


#Get mod by id
@router.get("/mods/{mod_id}")
def read_mod(mod_id: int, db: Session = Depends(get_db)):
    mod = controller.get_mod(db, mod_id=mod_id)

    if mod:
        return mod

    else:
        raise HTTPException(status_code=400, detail="mod not found")


#Delete mod entry 
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
def mod_file(request: Request, mod_id: int, db: Session = Depends(get_db)):
    mod_file = controller.get_mod_file(db, mod_id=mod_id, request=request)

    if mod_file and mod_file.modFileName:
        file_path = f"/app/static/mods/pak/{mod_id}/{mod_file.modFileName}"
        return FileResponse(file_path, filename=mod_file.modName + ".pak", media_type='application/octet-stream')

    else:
        raise HTTPException(status_code=400, detail="Mod file not found")


#Search Mods
@router.get("/mods/search/{search_text}")
def search_mods(search_text: str = 0,  params: Params = Depends(), db: Session = Depends(get_db)):
    mods = controller.search_mods(db, search_text=search_text)
    
    if mods:
        return paginate([dict(mod._mapping) for mod in mods], params)
    
    else:
        return {"No results"}


#Patch Single Mod
@router.patch("/mods/{mod_id}")
def patch_mod(mod_id: int, modDescription: str = Form(" "), modName: str = Form(...), modVisibility: bool = Form(...), modTags: str = Form(...), modGameVersion: str = Form(None), db: Session = Depends(get_db), user: str = Depends(get_current_user)):

    modVisibility = not modVisibility

    mod = controller.update_mod(db, mod_id=mod_id, modUserDesc=modDescription, modTags=modTags, user=user, modVisibility=modVisibility, modName=modName, gameVersion=modGameVersion)

    if mod:
        return HTTPException(status_code=200, detail="Mod update successfully")
    
    else:
        raise HTTPException(status_code=400, detail="Could not update mod")


#Replace mod file
@router.post("/update/mod/{mod_id}")
def update_mod(mod_id: str, changelog: str = Form(...), files: List[UploadFile] = File(...), db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    valid_files = [".pak"]

    if not user:
        raise HTTPException(status_code=403, detail="Unauthorized")

    if len(files) > 1:
        raise HTTPException(status_code=400, detail="Too many files! Expected single pak.")

    if len(files) < 1:
        raise HTTPException(status_code=400, detail="Missing files.")

    for file in files:
        if file.filename.lower().endswith(('.pak')):
            modFile = file

        elif file.filename not in valid_files:
            raise HTTPException(status_code=400, detail="Invalid file {}".format(file.filename))

    modContents = modFile.file.read()

    #Cleanup
    modFile.file.close()

    #Extract mod file data
    modData = modReader(modFile.filename, modContents)

    if modData == 2:
        raise HTTPException(status_code=400, detail="Mod file too big.")
    
    if modData == 1:
        raise HTTPException(status_code=400, detail="Mod file empty")

    #Validate ownership and grab mod file name
    mod_create = controller.validate_user_mod_file(db, user_id=user.id, mod_id=mod_id)

    if mod_create:
        with open("/app/static/mods/pak/" + str(mod_id) + "/" + str(mod_create.modFileName), "wb") as f:
            #Stream file in chunks to disk. This will free up additional memory for other threads.
            shutil.copyfileobj(BytesIO(modContents), f, 128*1024)
            f.close()
            modFile.file.close()

            #Update db with new mod size
            if controller.update_mod_size(db, mod_id=mod_id, newSize=modData.modFileSize):
                entry = _remove_html(changelog)[:2000]
                controller.create_changelog_entry(db, "mod", int(mod_id), entry, user.id)
                return HTTPException(status_code=200, detail="Success!")

            else:
                raise HTTPException(status_code=400, detail="Failed to update file size.")

    else:
        raise HTTPException(status_code=400, detail="Access Denied")
