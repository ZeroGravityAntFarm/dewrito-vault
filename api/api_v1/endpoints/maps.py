from fastapi import APIRouter, Depends, HTTPException, Response, Request, Form, File, UploadFile
from fastapi_pagination import Page, Params
from fastapi_pagination.ext.sqlalchemy import paginate as sqlalchemy_paginate
from db.schemas import schemas
from db import controller
from db.models import models
from db.session import SessionLocal
from internal.auth import get_current_user
from sqlalchemy.orm import Session
from sqlalchemy import desc
from os import listdir
from internal.limiter import limiter
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from datetime import datetime, timedelta
from internal.dewreader import mapReader, variantReader
from typing import List
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


#Returns dynamically built view for maps. Only way to get meta tags working (that I know of).
@router.get("/mapview", response_class=HTMLResponse)
async def return_map(request: Request, mapId: int, db: Session = Depends(get_db)):
    map = controller.get_map(db, map_id=mapId)


    if map:        
        return templates.TemplateResponse("map/index.html", {"request": request, "mapName": map.mapName, "id": map.id, "mapDescription": map.mapDescription})

    else:
        return templates.TemplateResponse("404/index.html", {"request": request})


#Returns dynamically built view for variants. Only way to get meta tags working (that I know of).
@router.get("/variantview", response_class=HTMLResponse)
async def return_map(request: Request, varId: int, db: Session = Depends(get_db)):
    variant = controller.get_variant_id(db, variant_id=varId)

    #Variant images are not stored via id but by variant type name. This way we only have to store as many images are there are variant types. To get the type we just split the filename.
    variantImage = variant.variantFileName.split('.')

    return templates.TemplateResponse("variant/index.html", {"request": request, "variantImage": variantImage[1], "variantName": variant.variantName, "id": variant.id, "variantDescription": variant.variantDescription})


#Featured maps and mods for the week
@router.get("/featured")
def get_featured(db: Session = Depends(get_db)):
    week_ago = datetime.utcnow() - timedelta(days=7)
    map_cols = [c for c in models.Map.__table__.c if c.name != 'mapFile']
    mod_cols = [c for c in models.Mod.__table__.c if c.name != 'modFile']

    maps = (
        db.query(*map_cols, models.User.name.label('uploader'))
        .join(models.User, models.User.id == models.Map.owner_id, isouter=True)
        .filter(models.Map.notVisible == False)
        .filter(models.Map.time_created >= week_ago)
        .order_by(desc(models.Map.map_downloads))
        .limit(3)
        .all()
    )
    if len(maps) < 3:
        maps = (
            db.query(*map_cols, models.User.name.label('uploader'))
            .join(models.User, models.User.id == models.Map.owner_id, isouter=True)
            .filter(models.Map.notVisible == False)
            .order_by(desc(models.Map.map_downloads))
            .limit(3)
            .all()
        )

    mods = (
        db.query(*mod_cols, models.User.name.label('uploader'))
        .join(models.User, models.User.id == models.Mod.owner_id, isouter=True)
        .filter(models.Mod.notVisible == False)
        .filter(models.Mod.time_created >= week_ago)
        .order_by(desc(models.Mod.mod_downloads))
        .limit(3)
        .all()
    )
    if len(mods) < 3:
        mods = (
            db.query(*mod_cols, models.User.name.label('uploader'))
            .join(models.User, models.User.id == models.Mod.owner_id, isouter=True)
            .filter(models.Mod.notVisible == False)
            .order_by(desc(models.Mod.mod_downloads))
            .limit(3)
            .all()
        )

    return {
        "maps": [dict(m._mapping) for m in maps],
        "mods": [dict(m._mapping) for m in mods],
    }


#Get all Maps
@router.get("/maps/")
@limiter.limit("60/minute")
def read_maps(request: Request, version: str = "all", tag: str = None, params: Params = Depends(), db: Session = Depends(get_db)):
    maps_q = controller.get_maps(db, version, tag=tag)
    return sqlalchemy_paginate(maps_q, params)


#Get all variants
@router.get("/variants/")
@limiter.limit("60/minute")
def read_variants(request: Request, params: Params = Depends(), db: Session = Depends(get_db)):
    variants = controller.get_variants(db)

    if variants:
        var_dict = [dict(row._mapping) for row in variants]
        return paginate(var_dict, params)

    else:
        raise HTTPException(status_code=400, detail="Variants not found")


#Get variants newest first — must be before /{variant_id}
@router.get("/variants/newest")
@limiter.limit("60/minute")
def read_variants_newest(request: Request, params: Params = Depends(), db: Session = Depends(get_db)):
    variants = controller.get_newest_variants(db)

    if variants:
        return paginate([dict(v._mapping) for v in variants], params)

    else:
        raise HTTPException(status_code=400, detail="Variants not found")


#Get variants oldest first — must be before /{variant_id}
@router.get("/variants/oldest")
@limiter.limit("60/minute")
def read_variants_oldest(request: Request, params: Params = Depends(), db: Session = Depends(get_db)):
    variants = controller.get_oldest_variants(db)

    if variants:
        return paginate([dict(v._mapping) for v in variants], params)

    else:
        raise HTTPException(status_code=400, detail="Variants not found")


#Get variant by id
@router.get("/variants/{variant_id}")
def read_variant(variant_id: int, db: Session = Depends(get_db)):
    variants = controller.get_variant_id(db, variant_id=variant_id)

    if variants:
        return variants

    else:
        raise HTTPException(status_code=400, detail="Variants not found")


#Get all Maps Newest first
@router.get("/maps/newest", response_model=Page[schemas.MapQuery])
@limiter.limit("60/minute")
def read_maps_new(request: Request, tag: str = None, version: str = None, params: Params = Depends(), db: Session = Depends(get_db)):
    maps_q = controller.get_newest(db, tag=tag, version=version)
    return sqlalchemy_paginate(maps_q, params)


#Get all Maps Most Downloads first
@router.get("/maps/downloaded", response_model=Page[schemas.MapQuery])
@limiter.limit("60/minute")
def read_maps_downloaded(request: Request, tag: str = None, version: str = None, params: Params = Depends(), db: Session = Depends(get_db)):
    maps_q = controller.get_most_downloaded(db, tag=tag, version=version)
    return sqlalchemy_paginate(maps_q, params)


#Get all Maps Oldest first
@router.get("/maps/oldest", response_model=Page[schemas.MapQuery])
@limiter.limit("60/minute")
def read_maps_oldest(request: Request, tag: str = None, version: str = None, params: Params = Depends(), db: Session = Depends(get_db)):
    maps_q = controller.get_oldest(db, tag=tag, version=version)
    return sqlalchemy_paginate(maps_q, params)


#Get all Maps by most upvoted first
@router.get("/maps/popular", response_model=Page[schemas.MapQuery])
@limiter.limit("60/minute")
def read_maps_popular(request: Request, tag: str = None, version: str = None, params: Params = Depends(), db: Session = Depends(get_db)):
    maps_q = controller.get_popular_maps(db, tag=tag, version=version)
    return sqlalchemy_paginate(maps_q, params)


#Get single map
@router.get("/maps/{map_id}")
def read_map(map_id: int, db: Session = Depends(get_db)):
    map = controller.get_map(db, map_id=map_id)

    if map:
        return map

    else:
        raise HTTPException(status_code=400, detail="Map not found")


#Delete Map entry 
@router.delete("/maps/{map_id}")
def read_map(map_id: int = 0, db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    status, msg = controller.delete_map(db, map_id=map_id, user=user)

    if status:
        return HTTPException(status_code=200, detail="Map and variant deleted successfully")

    else:
        raise HTTPException(status_code=400, detail=msg)


#Get single map file
@router.get("/maps/{map_id}/file")
@limiter.limit("60/minute")
def read_map(request: Request, map_id: int, db: Session = Depends(get_db)):
    map_file = controller.get_map_file(db, map_id=map_id, request=request)

    if map_file:
        headers = {'Content-Disposition': 'attachment; filename="sandbox.map"'}
        return Response(map_file.mapFile, headers=headers, media_type='application/octet-stream')

    else:
        raise HTTPException(status_code=400, detail="Map file not found")


#Get single variant
@router.get("/maps/{map_id}/variant")
def read_map(map_id: int = 0, db: Session = Depends(get_db)):
    variant = controller.get_variant(db, map_id=map_id)

    if variant:
        return variant

    else:
        raise HTTPException(status_code=400, detail="Variant file not found")


#Get single map variant file
@router.get("/maps/{map_id}/variant/file")
@limiter.limit("60/minute")
def read_map(request: Request, map_id: int, db: Session = Depends(get_db)):
    variant = controller.get_variant_file(db, map_id=map_id)

    if variant:
        headers = {'Content-Disposition': 'attachment; filename=' + variant.variantFileName}
        return Response(variant.variantFile, headers=headers, media_type='application/octet-stream')

    else:
        raise HTTPException(status_code=400, detail="Variant file not found")


#Get single variant file
@router.get("/variants/{var_id}/file")
@limiter.limit("60/minute")
def read_map(request: Request, var_id: int, db: Session = Depends(get_db)):
    variant = controller.get_variant_id_file(db, var_id=var_id)

    if variant:
        headers = {'Content-Disposition': 'attachment; filename=' + variant.variantFileName}
        return Response(variant.variantFile, headers=headers, media_type='application/octet-stream')

    else:
        raise HTTPException(status_code=400, detail="Variant file not found")


#Search Maps
@router.get("/maps/search/{search_text}")
def search_maps(search_text: str = 0, params: Params = Depends(), db: Session = Depends(get_db)):
    maps_q = controller.search_maps(db, search_text=search_text)
    result = sqlalchemy_paginate(maps_q, params)
    # Convert SQLAlchemy Row objects to dicts for serialization
    result.items = [dict(row._mapping) for row in result.items]
    return result


#Search Variants
@router.get("/variants/search/{search_text}")
def search_variants(search_text: str = 0, params: Params = Depends(), db: Session = Depends(get_db)):
    variants_q = controller.search_variants(db, search_text=search_text)
    return sqlalchemy_paginate(variants_q, params)


#Patch Single Map
@router.patch("/maps/{map_id}")
def patch_map(
    map_id: int,
    mapUserDesc: str = Form(" "),
    mapVisibility: bool = Form(...),
    mapTags: str = Form(...),
    db: Session = Depends(get_db),
    mapName: str = Form(...),
    gameVersion: str = Form(None),
    user: str = Depends(get_current_user),
):
    mapVisibility = not mapVisibility
    map = controller.update_map(
        db,
        map_id=map_id,
        mapUserDesc=mapUserDesc,
        mapTags=mapTags,
        mapName=mapName,
        user=user,
        mapVisibility=mapVisibility,
        gameVersion=gameVersion,
    )
    if map:
        return HTTPException(status_code=200, detail="Map updated successfully")
    else:
        raise HTTPException(status_code=400, detail="Failed to update map")


#Get map changelog
@router.get("/maps/{map_id}/changelog")
def get_map_changelog(map_id: int, db: Session = Depends(get_db)):
    return controller.get_changelog(db, "map", map_id)


#Replace map and variant files
@router.post("/update/map/{map_id}")
def update_map_file(
    map_id: int,
    changelog: str = Form(...),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    user: str = Depends(get_current_user),
):
    valid_variants = ['variant.oddball', 'variant.zombiez', 'variant.ctf', 'variant.koth', 'variant.slayer', 'variant.assault', 'variant.vip', 'variant.jugg', 'variant.terries']

    if not user:
        raise HTTPException(status_code=403, detail="Unauthorized")

    if len(changelog.strip()) == 0:
        raise HTTPException(status_code=400, detail="Changelog entry is required.")

    mapFile = None
    variantFile = None
    for file in files:
        if file.filename == "sandbox.map":
            mapFile = file
        elif file.filename in valid_variants:
            variantFile = file

    if not mapFile:
        raise HTTPException(status_code=400, detail="sandbox.map file required.")
    if not variantFile:
        raise HTTPException(status_code=400, detail="Variant file required.")

    mapContents = mapFile.file.read()
    variantContents = variantFile.file.read()
    mapFile.file.close()
    variantFile.file.close()

    try:
        mapData = mapReader(mapFile.filename, mapContents)
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to read map file.")

    if mapData in (1, 2) or mapData is None:
        raise HTTPException(status_code=400, detail="Invalid map file.")

    try:
        variantData = variantReader(variantFile.filename, variantContents)
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to read variant file.")

    if variantData in (1, 2):
        raise HTTPException(status_code=400, detail="Invalid variant file.")

    result = controller.update_map_file(db, map_id, user.id, mapContents, variantContents)
    if not result:
        raise HTTPException(status_code=403, detail="Access denied or map not found.")

    entry = _remove_html(changelog)[:2000]
    controller.create_changelog_entry(db, "map", map_id, entry, user.id)

    return HTTPException(status_code=200, detail="Map updated successfully.")
