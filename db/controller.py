from sqlalchemy.orm import Session
from fastapi import Request
from sqlalchemy import func
from db.models import models
from db.schemas import schemas
from internal.auth import verify_password, get_password_hash
from datetime import datetime, timedelta
from internal.auth import *
from jose import jwt
from sqlalchemy import or_, desc, asc
import shutil
import os
import json
import logging
import uvicorn
import hashlib
import pyotp
import qrcode
import qrcode.image.svg
import io
import base64

logger = logging.getLogger('uvicorn')


#Authenticate a user
def authenticate_user(db, username: str, password: str, client_host: str):
    if not username or username.isspace():
        return False
    user = get_user_auth(db, username)
    
    #Check if user exists
    if not user:
        return False
    
    #Check if account is active
    if not user.is_active:
        return False

    #Verify password against hashed password
    if not verify_password(password, user.hashed_password):
        return False
    
    user.last_login_ip = client_host
    user.last_login_time = datetime.utcnow()
    db.commit()

    return user


# --- TOTP / 2FA helpers ---

def setup_totp(db: Session, user_id: int, user_name: str):
    """Generate a new TOTP secret, store it (not yet enabled), return (secret, qr_data_uri)."""
    secret = pyotp.random_base32()
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    db_user.totp_secret = secret
    db_user.totp_enabled = False
    db.commit()

    uri = pyotp.totp.TOTP(secret).provisioning_uri(user_name, issuer_name="Dewrito Share")

    qr = qrcode.make(uri)
    buf = io.BytesIO()
    qr.save(buf, format='PNG')
    qr_b64 = base64.b64encode(buf.getvalue()).decode()

    return secret, f"data:image/png;base64,{qr_b64}"


def enable_totp(db: Session, user_id: int, totp_code: str) -> bool:
    """Verify code against pending secret and enable 2FA."""
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user or not db_user.totp_secret:
        return False
    if not pyotp.TOTP(db_user.totp_secret).verify(totp_code, valid_window=1):
        return False
    db_user.totp_enabled = True
    db.commit()
    return True


def disable_totp(db: Session, user_id: int, totp_code: str) -> bool:
    """Verify TOTP code and disable 2FA, clearing the secret."""
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user or not db_user.totp_enabled or not db_user.totp_secret:
        return False
    if not pyotp.TOTP(db_user.totp_secret).verify(totp_code, valid_window=1):
        return False
    db_user.totp_enabled = False
    db_user.totp_secret = None
    db.commit()
    return True


def verify_totp_for_user(db: Session, user_id: int, totp_code: str) -> bool:
    """Verify a TOTP code for a user by ID."""
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user or not db_user.totp_enabled or not db_user.totp_secret:
        return False
    return pyotp.TOTP(db_user.totp_secret).verify(totp_code, valid_window=1)


def get_user_totp_enabled(db: Session, user_name: str) -> bool:
    """Quick check: does this user have 2FA enabled?"""
    db_user = db.query(models.User).filter(models.User.name == user_name).first()
    return bool(db_user and db_user.totp_enabled)


def verify_totp_by_username(db: Session, user_name: str, totp_code: str) -> bool:
    """Verify a TOTP code for a user by username (used at login)."""
    db_user = db.query(models.User).filter(models.User.name == user_name).first()
    if not db_user or not db_user.totp_enabled or not db_user.totp_secret:
        return False
    return pyotp.TOTP(db_user.totp_secret).verify(totp_code, valid_window=1)


#Sync sqlalchemy models with database, creates missing tables
def sync_models():
    from db.session import Base
    from db.session import engine

    Base.metadata.create_all(engine)


#Query user profile 
def get_user_auth(db: Session, user_name: str):
    user = db.query(models.User).filter(models.User.name == user_name).first()

    return user

#Create a JWT access token
def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta

    else:
        expire = datetime.utcnow() + timedelta(minutes=15)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt


#Query user profile 
def get_user(db: Session, user_name: str, request: Request):
    user = db.query(models.User).filter(models.User.name == user_name).first()
    user_data = db.query(*[c for c in models.User.__table__.c if c.name != 'hashed_password' and c.name != 'role' and c.name != 'last_login_ip']).filter(models.User.name == user_name).first()

    requestString = bytes(str(user_name) + request.client.host, 'utf-8')
    requestHash = hashlib.sha256(requestString).hexdigest()
    requestExists = db.query(models.Tracking).filter(models.Tracking.requestHash == requestHash).first() is not None

    if not requestExists:
        if user:
            if user.prof_views != None:
                user.prof_views += 1

            else:
                user.prof_views = 1

            newRequest = models.Tracking(requestHash=requestHash)
            db.add(newRequest)
            db.commit()

    return user_data


#Query user profile
def get_userId(db: Session, user_id: int):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    user_data = db.query(*[c for c in models.User.__table__.c if c.name != 'hashed_password' and c.name != 'role' and c.name != 'last_login_ip']).filter(models.User.id == user_id).first()

    if user:
      return user_data


#Get all users
def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(*[c for c in models.User.__table__.c if c.name != 'hashed_password' and c.name != 'role' and c.name != 'last_login_ip']).offset(skip).limit(limit).all()


#Query user by email
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


#Create new user
def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = pwd_context.hash(user.password)
    db_user = models.User(name=user.name, hashed_password=hashed_password, rank="Recruit", about=" ")
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user


#Query user stats 
def get_user_stats(db: Session, user_id: int):

    map_count = db.query(models.Map).filter(models.Map.owner_id == user_id).filter(models.Map.notVisible == False).count()
    prefab_count = db.query(models.PreFab).filter(models.PreFab.owner_id == user_id).count()
    mod_count = db.query(models.Mod).filter(models.Mod.owner_id == user_id).filter(models.Mod.notVisible == False).count()


    user_stats = { 'maps': map_count, 
                   'prefabs': prefab_count,
                   'mods': mod_count }

    return user_stats


#Update user data
def update_user(db: Session, user: str, userName: str, userEmail: str, userAbout: str):
    user = db.query(models.User).filter(models.User.id == user.id).first()
    if userName and not userName.isspace():
        user.name = userName
    user.about = userAbout
    db.commit()

    return user


#Update user password
def update_user_password(db: Session, userPassword: int, user: str):
    user = db.query(models.User).filter(models.User.id == user.id).first()
    hashed_password = pwd_context.hash(userPassword)
    user.hashed_password = hashed_password
    db.commit()

    return user


def set_user_password(db: Session, user_id: int, new_password: str):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return None
    hashed_password = pwd_context.hash(new_password)
    user.hashed_password = hashed_password
    db.commit()
    return user


#Update a user's rank. Fired on any map, prefab, or mod create call. 
def update_rank(user_id: int, db: Session):

    ranks = {"Recruit": 0, 
         "Apprentice": 1,
         "Apprentice II": 2,
         "Private": 3,
         "Private II": 4,
         "Corporal": 5,
         "Corporal II": 6,
         "Sergeant": 7,
         "Sergeant II": 8,
         "Sergant III": 9,
         "Gunnery Sergeant": 10,
         "Gunnery Sergeant II": 11,
         "Gunnery Sergeant III": 12,
         "Gunnery Sergeant Master": 13,
         "Lieutenant": 14,
         "Lieutenant II": 15,
         "Lieutenant III": 16,
         "First Lieutenant": 17,
         "Captain": 18,
         "Captain II": 19,
         "Captain III": 20,
         "Staff Captain": 21,
         "Major": 22,
         "Major II": 23,
         "Major III": 24,
         "Field Major": 25,
         "Commander": 26,
         "Commander II": 27,
         "Commander III": 28,
         "Strike Commander": 29,
         "Colonel": 30,
         "Colonel II": 31,
         "Colonel III": 32,
         "Force Colonel": 33,
         "Brigadier": 34,
         "Brigadier II": 35,
         "Brigadier III": 36,
         "Brigadier General": 37,
         "General": 38,
         "General II": 39,
         "General III": 40,
         "Five Star General": 45,
         "Engineer": 50,
         "Architect": 75,
         "Precursor": 100,}

    #Get user contributions
    map_count = db.query(models.Map).filter(models.Map.owner_id == user_id).count()
    prefab_count = db.query(models.PreFab).filter(models.PreFab.owner_id == user_id).count()
    mod_count = db.query(models.Mod).filter(models.Mod.owner_id == user_id).count()

    #Get user profile from db
    user = db.query(models.User).filter(models.User.id == user_id).first()

    count = map_count + prefab_count + mod_count

    for title, level in ranks.items():
        if count >= level:
            user.rank = title
        
        else:
            break
    
    db.commit()


#Get all maps
def get_maps(db: Session, version: str, tag: str = None):
    q = db.query(*[c for c in models.Map.__table__.c if c.name != 'mapFile']).filter(models.Map.notVisible == False)
    if version and version != "all":
        q = q.filter(func.lower(models.Map.gameVersion).contains(version))
    if tag:
        q = q.filter(func.lower(models.Map.mapTags).contains(tag.lower()))
    return q


#Get all variants
def get_variants(db: Session):
    return db.query(*[c for c in models.Variant.__table__.c if c.name != 'variantFile'])


#Get all variants
def get_variant_id(db: Session, variant_id: int):
    return db.query(*[c for c in models.Variant.__table__.c if c.name != 'variantFile']).filter(models.Variant.id == variant_id).first()


#Get map data
def get_map(db: Session, map_id: int):
    return db.query(*[c for c in models.Map.__table__.c if c.name != 'mapFile']).filter(models.Map.id == map_id).first()


#Update map
def update_map(db: Session, map_id: int, user: str, mapUserDesc: str, mapTags: str, mapName: str, mapVisibility: bool, gameVersion: str = None):
    map = db.query(models.Map).filter(models.Map.id == map_id and models.Map.owner_id == user.id).first()
    map.mapName = mapName
    map.mapTags = mapTags
    map.mapUserDesc = mapUserDesc
    map.notVisible = mapVisibility
    if gameVersion is not None:
        map.gameVersion = gameVersion
    db.commit()
    return map


#Get changelog entries for a map or mod
def get_changelog(db: Session, item_type: str, item_id: int):
    return db.query(models.Changelog).filter(
        models.Changelog.item_type == item_type,
        models.Changelog.item_id == item_id,
    ).order_by(desc(models.Changelog.time_created)).all()


#Create a changelog entry; version = prior entry count + 2 (v1 = original upload)
def create_changelog_entry(db: Session, item_type: str, item_id: int, entry: str, owner_id: int):
    version = db.query(models.Changelog).filter(
        models.Changelog.item_type == item_type,
        models.Changelog.item_id == item_id,
    ).count() + 2
    record = models.Changelog(
        item_type=item_type,
        item_id=item_id,
        version=version,
        entry=entry,
        owner_id=owner_id,
    )
    db.add(record)
    db.commit()
    return record


#Update map and variant binary files
def update_map_file(db: Session, map_id: int, user_id: int, map_contents: bytes, variant_contents: bytes):
    map_obj = db.query(models.Map).filter(
        models.Map.id == map_id,
        models.Map.owner_id == user_id,
    ).first()
    if not map_obj:
        return False
    variant = db.query(models.Variant).filter(models.Variant.id == map_obj.variant_id).first()
    map_obj.mapFile = map_contents
    map_obj.time_updated = datetime.utcnow()
    if variant and variant_contents:
        variant.variantFile = variant_contents
        variant.time_updated = datetime.utcnow()
    db.commit()
    return map_obj


#Update mod
def update_mod(db: Session, mod_id: int, user: str, modUserDesc: str, modTags: str, modName: str, modVisibility: bool, gameVersion: str = None):
    mod = db.query(models.Mod).filter(models.Mod.id == mod_id and models.Mod.owner_id == user.id).first()

    mod.modName = modName
    mod.modTags = modTags
    mod.modUserDescription = modUserDesc
    mod.notVisible = modVisibility
    if gameVersion is not None:
        mod.gameVersion = gameVersion

    db.commit()

    return mod


def rename_tags_in_items(db: Session, tag_type: str, old_tag: str, new_tag: str):
    if tag_type not in ('map', 'mod'):
        return

    model = models.Map if tag_type == 'map' else models.Mod
    tag_attr = 'mapTags' if tag_type == 'map' else 'modTags'

    items = db.query(model).filter(func.lower(getattr(model, tag_attr)).contains(old_tag.lower())).all()

    old_tag_lower = old_tag.lower().strip()
    new_tag_clean = new_tag.strip()

    for item in items:
        raw = getattr(item, tag_attr) or ''
        tags = [t.strip() for t in raw.split(',') if t.strip()]
        if not tags:
            continue

        changed = False
        updated_tags = []
        for t in tags:
            if t.lower() == old_tag_lower:
                if new_tag_clean.lower() not in [x.lower() for x in updated_tags]:
                    updated_tags.append(new_tag_clean)
                changed = True
            else:
                if t.lower() == new_tag_clean.lower():
                    # preserve existing casing if same logical tag exists
                    if not any(x.lower() == t.lower() for x in updated_tags):
                        updated_tags.append(t)
                else:
                    updated_tags.append(t)

        if changed:
            setattr(item, tag_attr, ','.join(updated_tags))

    db.commit()


def remove_tag_from_items(db: Session, tag_type: str, old_tag: str):
    if tag_type not in ('map', 'mod'):
        return

    model = models.Map if tag_type == 'map' else models.Mod
    tag_attr = 'mapTags' if tag_type == 'map' else 'modTags'

    old_tag_lower = old_tag.lower().strip()

    items = db.query(model).filter(func.lower(getattr(model, tag_attr)).contains(old_tag_lower)).all()

    for item in items:
        raw = getattr(item, tag_attr) or ''
        tags = [t.strip() for t in raw.split(',') if t.strip()]
        filtered_tags = []
        for t in tags:
            if t.lower() == old_tag_lower:
                continue
            if t.lower() not in [x.lower() for x in filtered_tags]:
                filtered_tags.append(t)
        if ','.join(tags) != ','.join(filtered_tags):
            setattr(item, tag_attr, ','.join(filtered_tags))

    db.commit()


def _apply_map_filters(q, tag=None, version=None):
    if version and version != "all":
        q = q.filter(func.lower(models.Map.gameVersion).contains(version))
    if tag:
        q = q.filter(func.lower(models.Map.mapTags).contains(tag.lower()))
    return q


def _vote_subqueries(db: Session):
    up = (
        db.query(models.Vote.mapId, func.count(models.Vote.id).label('up_votes'))
        .filter(models.Vote.vote == True)
        .group_by(models.Vote.mapId)
        .subquery('up_votes')
    )
    down = (
        db.query(models.Vote.mapId, func.count(models.Vote.id).label('down_votes'))
        .filter(models.Vote.vote == False)
        .group_by(models.Vote.mapId)
        .subquery('down_votes')
    )
    return up, down


def _map_query_with_votes(db: Session):
    up, down = _vote_subqueries(db)
    map_cols = [c for c in models.Map.__table__.c if c.name != 'mapFile']
    return (
        db.query(
            *map_cols,
            func.coalesce(up.c.up_votes, 0).label('up_votes'),
            func.coalesce(down.c.down_votes, 0).label('down_votes'),
            models.User.name.label('uploader'),
        )
        .outerjoin(up, up.c.mapId == models.Map.id)
        .outerjoin(down, down.c.mapId == models.Map.id)
        .outerjoin(models.User, models.User.id == models.Map.owner_id)
    )


#Get all maps by newest first
def get_newest(db: Session, tag: str = None, version: str = None):
    q = _map_query_with_votes(db).filter(models.Map.notVisible == False).order_by(desc(models.Map.time_created))
    return _apply_map_filters(q, tag, version)


#Get all maps by most downloaded first
def get_most_downloaded(db: Session, tag: str = None, version: str = None):
    q = _map_query_with_votes(db).filter(models.Map.notVisible == False).order_by(desc(models.Map.map_downloads))
    return _apply_map_filters(q, tag, version)


#Get all maps by oldest first
def get_oldest(db: Session, tag: str = None, version: str = None):
    q = _map_query_with_votes(db).filter(models.Map.notVisible == False).order_by(asc(models.Map.time_created))
    return _apply_map_filters(q, tag, version)


#Get all maps by most upvoted first
def get_popular_maps(db: Session, tag: str = None, version: str = None):
    up, down = _vote_subqueries(db)
    map_cols = [c for c in models.Map.__table__.c if c.name != 'mapFile']
    q = (
        db.query(
            *map_cols,
            func.coalesce(up.c.up_votes, 0).label('up_votes'),
            func.coalesce(down.c.down_votes, 0).label('down_votes'),
            models.User.name.label('uploader'),
        )
        .outerjoin(up, up.c.mapId == models.Map.id)
        .outerjoin(down, down.c.mapId == models.Map.id)
        .outerjoin(models.User, models.User.id == models.Map.owner_id)
        .filter(models.Map.notVisible == False)
        .order_by(desc(func.coalesce(up.c.up_votes, 0)))
    )
    return _apply_map_filters(q, tag, version)


#Delete single map
def delete_map(db: Session, map_id: int, user: str):
    #Create a map object so we can find and delete the game variant it references
    map = db.query(models.Map).filter(models.Map.id == map_id).first()

    if map:
        #Verify authenticated user is owner or admin
        is_admin = getattr(user, 'is_admin', False)
        if not is_admin and user.id != map.owner_id:
            return False, "Unauthorized"

        #Wait for a valid map object to query its respective variant.
        variant = db.query(models.Variant).filter(models.Variant.id == map.variant_id).first()

        #Delete map and variant rows
        db.delete(map)
        if variant:
            db.delete(variant)

        #Update owner's rank
        update_rank(map.owner_id, db)

        #Commit our changes to the database
        db.commit()

        return True, "Deleted successfully"
    else:
        return False, "Map not found"
    

# --- Admin / SiteSettings helpers ---

_DEFAULT_MAP_TAGS = ['Slayer', 'Infection', 'Puzzle', 'KOTH', 'CTF', 'Assault', 'Territories', 'Oddball', 'Juggernaut', 'VIP', 'Race', 'Mini Games', 'Enhanced', '0.7', '0.5.1.1']
_DEFAULT_MOD_TAGS = ['vehicle', 'animation', 'object', 'armor', 'ui', 'hud', 'biped', 'weapon', 'campaign', 'mode', 'ability', 'map', 'ai', 'cosmetic', 'misc']
_DEFAULT_GAME_VERSIONS = ['0.7.2', '0.7.1', '0.7.0', '0.6.1', '0.5.1.1']

def get_or_create_settings(db: Session):
    settings = db.query(models.SiteSettings).filter(models.SiteSettings.id == 1).first()
    if not settings:
        settings = models.SiteSettings(
            id=1,
            registration_enabled=True,
            map_tags=json.dumps(_DEFAULT_MAP_TAGS),
            mod_tags=json.dumps(_DEFAULT_MOD_TAGS),
            game_versions=json.dumps(_DEFAULT_GAME_VERSIONS),
        )
        db.add(settings)
        db.commit()
    else:
        changed = False
        if settings.map_tags is None:
            settings.map_tags = json.dumps(_DEFAULT_MAP_TAGS)
            changed = True
        if settings.mod_tags is None:
            settings.mod_tags = json.dumps(_DEFAULT_MOD_TAGS)
            changed = True
        if settings.game_versions is None:
            settings.game_versions = json.dumps(_DEFAULT_GAME_VERSIONS)
            changed = True
        if changed:
            db.commit()
    return settings


def rename_game_version_in_items(db: Session, old_version: str, new_version: str):
    old_lower = old_version.lower().strip()
    new_clean = new_version.strip()
    for model in (models.Map, models.Mod):
        items = db.query(model).filter(func.lower(model.gameVersion) == old_lower).all()
        for item in items:
            item.gameVersion = new_clean
    db.commit()


def remove_game_version_from_items(db: Session, old_version: str):
    old_lower = old_version.lower().strip()
    for model in (models.Map, models.Mod):
        items = db.query(model).filter(func.lower(model.gameVersion) == old_lower).all()
        for item in items:
            item.gameVersion = None
    db.commit()


def get_all_users_admin(db: Session):
    return db.query(
        models.User.id,
        models.User.name,
        models.User.is_active,
        models.User.is_admin,
        models.User.totp_enabled,
        models.User.rank,
        models.User.time_created,
        models.User.last_login_time,
    ).order_by(models.User.id).all()


def toggle_user_active(db: Session, user_id: int):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return None
    user.is_active = not user.is_active
    db.commit()
    return user


def toggle_user_admin(db: Session, user_id: int):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return None
    user.is_admin = not user.is_admin
    db.commit()
    return user


#Delete user account (but not maps)
def delete_user(db: Session, user: str):
    user = db.query(models.User).filter(models.User.id == user.id).first()

    if user:
        db.delete(user)
        db.commit()

        return True, "Deleted successfully"

    else:
        return False, "User not found"


#Delete single prefab
def delete_prefab(db: Session, prefab_id: int, user: str):
    #Create a prefab object so we can find and delete
    prefab = db.query(models.PreFab).filter(models.PreFab.id == prefab_id and models.PreFab.owner_id == user.id).first()

    if prefab:
        if user:
            #Verify authenticated user is owner of requested map 
            if user.id == prefab.owner_id:
                #Delete map and variant rows
                db.delete(prefab)
                
                #Update user's rank
                update_rank(user.id, db)

                #Commit our changes to the database
                db.commit()

                return True, "Deleted successfully"

            else:
                return False, "Unauthorized"

        else:
            return False, "User not found"

    else:
        return False, "Prefab not found"


#Get prefab file
def get_prefab_file(db: Session, prefab_id: int):
    prefab = db.query(models.PreFab).filter(models.PreFab.id == prefab_id).first()

    #This is bad and will run on every download. --v
    if prefab:
        if prefab.downloads != None:
            prefab.downloads += 1

        #This condition will never be met again after the first download. 
        else:
            prefab.downloads = 1
        db.commit()

    return prefab


#Get map file
def get_map_file(db: Session, map_id: int, request: Request):
    map = db.query(models.Map).filter(models.Map.id == map_id).first()

    requestString = bytes(str(map_id) + request.client.host, 'utf-8')
    requestHash = hashlib.sha256(requestString).hexdigest()
    requestExists = db.query(models.Tracking).filter(models.Tracking.requestHash == requestHash).first() is not None

    if not requestExists:
        if map:
            if map.map_downloads != None:
                map.map_downloads += 1

            else:
                map.map_downloads = 1

            newRequest = models.Tracking(requestHash=requestHash)
            db.add(newRequest)
            db.commit()

    return map


#Get variant data
def get_variant(db: Session, map_id: int):
    map_query = db.query(models.Map).filter(models.Map.id == map_id).first()

    return db.query(*[c for c in models.Variant.__table__.c if c.name != 'variantFile']).filter(models.Variant.id == map_query.variant_id).first()


#Get variant file from map id
def get_variant_file(db: Session, map_id: int):
    map_query = db.query(models.Map).filter(models.Map.id == map_id).first()

    variant = db.query(models.Variant).filter(models.Variant.id == map_query.variant_id).first()

    if variant:
        if variant.downloads != None:
            variant.downloads += 1

        else:
            variant.downloads = 1

        db.commit()

    return variant


#Get variant file
def get_variant_id_file(db: Session, var_id: int):
    variant = db.query(models.Variant).filter(models.Variant.id == var_id).first()

    if variant:
        if variant.downloads != None:
            variant.downloads += 1

        else:
            variant.downloads = 1

        db.commit()

    return variant


#Get all maps for a specific user 
def get_user_maps(db: Session, user: str, skip: int = 0, limit: int = 100):
    return db.query(*[c for c in models.Map.__table__.c if c.name != 'mapFile']).filter(models.Map.owner_id == user.id).offset(skip).limit(limit).all()


#Get all maps for a specific user 
def get_user_maps_public(db: Session, user: str, skip: int = 0, limit: int = 100):
    return db.query(*[c for c in models.Map.__table__.c if c.name != 'mapFile']).filter(models.Map.owner_id == user.id).filter(models.Map.notVisible == False).offset(skip).limit(limit).all()


#Create new map entry
def create_user_map(db: Session, mapUserDesc: str, mapVisibility: bool, mapTags: str, map: schemas.MapCreate, user_id: int, variant_id: int):

    db_map = models.Map(mapName=map.mapName, 
                        mapAuthor=map.mapAuthor,
                        mapTags=mapTags,
                        mapDescription=map.mapDescription,
                        mapId=map.mapId,
                        mapScnrObjectCount=map.mapScnrObjectCount,
                        mapTotalObject=map.mapTotalObjectCount,
                        mapFile=bytes(map.contents),
                        notVisible=mapVisibility,
                        mapUserDesc=mapUserDesc,
                        variant_id=variant_id,
                        owner_id=user_id,
                        gameVersion=map.gameVersion,
                        map_downloads=0)
    db.add(db_map)
    db.execute("REFRESH MATERIALIZED VIEW mapdata")
    db.commit()
    db.refresh(db_map)

    #Update user's rank
    update_rank(user_id, db)

    #Get webhooks
    if not mapVisibility:
        webhooks = db.query(models.WebHook).filter(models.WebHook.webhooktype == "map" and models.WebHook.webhookenabled == True).all()
        
        return db_map, webhooks

    else:
        return db_map, None


#Get all mods for a specific user 
def get_user_mods(db: Session, user: str, skip: int = 0, limit: int = 100):
    return db.query(*[c for c in models.Mod.__table__.c if c.name != 'modFile']).filter(models.Mod.owner_id == user.id).offset(skip).limit(limit).all()


#Get all mods for a specific user 
def get_user_mods_public(db: Session, user: str, skip: int = 0, limit: int = 100):
    return db.query(*[c for c in models.Mod.__table__.c if c.name != 'modFile']).filter(models.Mod.owner_id == user.id).filter(models.Mod.notVisible == False).offset(skip).limit(limit).all()


#Case insensitive search for mod name, author, tags, or description
def search_mods(db: Session, search_text: str):
    return db.query(*[c for c in models.Mod.__table__.c]).filter(
        func.lower(models.Mod.modName).contains(search_text.lower()) |
        func.lower(models.Mod.modTags).contains(search_text.lower()) |
        func.lower(models.Mod.modAuthor).contains(search_text.lower()) |
        func.lower(models.Mod.modDescription).contains(search_text.lower())
    ).filter(models.Mod.notVisible == False)


#Create new mod entry
def create_user_mod(db: Session, modUserDescription: str, modTags: str, mod: schemas.ModCreate, user_id: int, modVisibility: bool, gameVersion: str = "0.7.1"):
    db_mod = models.Mod(modName=mod.modName,
                        modAuthor=mod.modAuthor,
                        modTags=modTags,
                        modFileName=mod.modFile,
                        modFileSize=mod.modFileSize,
                        modDescription=mod.modDescription,
                        modUserDescription=modUserDescription,
                        modVersion=1,
                        notVisible=modVisibility,
                        time_updated=datetime.utcnow(),
                        owner_id=user_id,
                        gameVersion=gameVersion,
                        mod_downloads=0)
    db.add(db_mod)
    db.commit()
    db.refresh(db_mod)

    #Update user's rank
    update_rank(user_id, db)

    #Get webhooks
    if not modVisibility:
        webhooks = db.query(models.WebHook).filter(models.WebHook.webhooktype == "mod" and models.WebHook.webhookenabled == True).all()
        
        return db_mod, webhooks

    else:
        return db_mod, None


#Validate the owner for updating a .pak file
def validate_user_mod_file(db: Session, user_id: int, mod_id: int):
    mod = db.query(*[c for c in models.Mod.__table__.c if c.name != 'modFile']).filter(models.Mod.id == mod_id).filter(models.Mod.owner_id == user_id).first()

    if mod:
        return mod

    else:
        return False


#Update mod file size and optionally filename. We don't need user ID as calling function has already auth'd.
#DO NOT USE THIS OUT OF THE ABOVE CONTEXT
def update_mod_size(db: Session, mod_id: int, newSize: int, newFilename: str = None):
    mod = db.query(models.Mod).filter(models.Mod.id == mod_id).first()

    if mod:
        old_filename = mod.modFileName
        mod.modFileSize = newSize
        mod.modVersion += 1
        mod.time_updated = datetime.utcnow()

        if newFilename and newFilename != old_filename:
            mod.modFileName = newFilename

        db.commit()

        # Return old filename when updating name, otherwise return truthy success flag
        return old_filename if newFilename else True

    else:
        return None


#Get all mods
def get_mods(db: Session, skip: int = 0, limit: int = 100, tag: str = None):
    q = db.query(*[c for c in models.Mod.__table__.c if c.name != 'modFile']).filter(models.Mod.notVisible == False)
    if tag:
        q = q.filter(func.lower(models.Mod.modTags).contains(tag.lower()))
    return q


#Get single mod
def get_mod(db: Session, mod_id: int):
    return db.query(*[c for c in models.Mod.__table__.c if c.name != 'modFile']).filter(models.Mod.id == mod_id).first()


#Delete single mod
def delete_mod(db: Session, mod_id: int, user: str):
    #Create a mod object so we can find and delete
    mod = db.query(models.Mod).filter(models.Mod.id == mod_id).first()

    if mod:
        #Verify authenticated user is owner or admin
        is_admin = getattr(user, 'is_admin', False)
        if not is_admin and user.id != mod.owner_id:
            return False, "Unauthorized"

        #Delete mod images
        if os.path.exists("/app/static/mods/" + str(mod.id)):
            shutil.rmtree("/app/static/mods/" + str(mod.id))

        #Delete mod binaries
        if os.path.exists("/app/static/mods/pak/" + str(mod.id)):
            shutil.rmtree("/app/static/mods/pak/" + str(mod.id))

        #Delete mod row
        db.delete(mod)

        #Update owner's rank
        update_rank(mod.owner_id, db)

        #Commit our changes to the database
        db.commit()

        return True, "Deleted successfully"

    else:
        return False, "Mod not found"


#Get mod file
def get_mod_file(db: Session, mod_id: int, request: Request):
    mod = db.query(models.Mod).filter(models.Mod.id == mod_id).first()

    if mod:
        if mod.mod_downloads != None:
            mod.mod_downloads += 1

        else:
            mod.mod_downloads = 1

        db.commit()

    return mod


def _mod_vote_subqueries(db: Session):
    up = (
        db.query(models.ModVote.modId, func.count(models.ModVote.id).label('up_votes'))
        .filter(models.ModVote.vote == True)
        .group_by(models.ModVote.modId)
        .subquery('mod_up_votes')
    )
    down = (
        db.query(models.ModVote.modId, func.count(models.ModVote.id).label('down_votes'))
        .filter(models.ModVote.vote == False)
        .group_by(models.ModVote.modId)
        .subquery('mod_down_votes')
    )
    return up, down


def _mod_query_with_votes(db: Session):
    up, down = _mod_vote_subqueries(db)
    mod_cols = [c for c in models.Mod.__table__.c]
    return (
        db.query(
            *mod_cols,
            func.coalesce(up.c.up_votes, 0).label('up_votes'),
            func.coalesce(down.c.down_votes, 0).label('down_votes'),
            models.User.name.label('uploader'),
        )
        .outerjoin(up, up.c.modId == models.Mod.id)
        .outerjoin(down, down.c.modId == models.Mod.id)
        .outerjoin(models.User, models.User.id == models.Mod.owner_id)
    )


#Get all mods by newest first
def get_newest_mods(db: Session, tag: str = None, version: str = None):
    q = _mod_query_with_votes(db).filter(models.Mod.notVisible == False).order_by(desc(models.Mod.time_created))
    if tag:
        q = q.filter(func.lower(models.Mod.modTags).contains(tag.lower()))
    if version:
        q = q.filter(models.Mod.gameVersion == version)
    return q


#Get all mods by oldest first
def get_oldest_mods(db: Session, tag: str = None, version: str = None):
    q = _mod_query_with_votes(db).filter(models.Mod.notVisible == False).order_by(asc(models.Mod.time_created))
    if tag:
        q = q.filter(func.lower(models.Mod.modTags).contains(tag.lower()))
    if version:
        q = q.filter(models.Mod.gameVersion == version)
    return q


#Get all mods by most downloaded first
def get_most_downloaded_mods(db: Session, tag: str = None, version: str = None):
    q = _mod_query_with_votes(db).filter(models.Mod.notVisible == False).order_by(desc(models.Mod.mod_downloads))
    if tag:
        q = q.filter(func.lower(models.Mod.modTags).contains(tag.lower()))
    if version:
        q = q.filter(models.Mod.gameVersion == version)
    return q


#Get all mods by most upvoted first
def get_popular_mods(db: Session, tag: str = None, version: str = None):
    up, down = _mod_vote_subqueries(db)
    mod_cols = [c for c in models.Mod.__table__.c]
    q = (
        db.query(
            *mod_cols,
            func.coalesce(up.c.up_votes, 0).label('up_votes'),
            func.coalesce(down.c.down_votes, 0).label('down_votes'),
            models.User.name.label('uploader'),
        )
        .outerjoin(up, up.c.modId == models.Mod.id)
        .outerjoin(down, down.c.modId == models.Mod.id)
        .outerjoin(models.User, models.User.id == models.Mod.owner_id)
        .filter(models.Mod.notVisible == False)
        .order_by(desc(func.coalesce(up.c.up_votes, 0)))
    )
    if tag:
        q = q.filter(func.lower(models.Mod.modTags).contains(tag.lower()))
    if version:
        q = q.filter(models.Mod.gameVersion == version)
    return q


#Create new variant entry
def create_user_variant(db: Session, variant: schemas.VariantCreate, user_id: int):
    db_variant = models.Variant(variantName=variant.variantName, 
                        variantAuthor=variant.variantAuthor,
                        variantDescription=variant.variantDescription,
                        variantFile=bytes(variant.contents),
                        variantFileName=variant.variantFile,
                        downloads=0,
                        owner_id=user_id)
    db.add(db_variant)
    db.commit()
    db.refresh(db_variant)

    return db_variant.id


#Create new prefab
def create_prefab(db: Session, prefab: schemas.PreFabCreate, user_id: int, prefabDesc: str, prefabTags: str):
    prefab = models.PreFab(prefabName=prefab.prefabName,
                    prefabAuthor=prefab.prefabAuthor,
                    prefabDescription=prefabDesc,
                    prefabFile=bytes(prefab.contents),
                    prefabFileName=prefab.prefabFile,
                    prefabTags=prefabTags,
                    downloads=0,
                    owner_id=user_id)

    db.add(prefab)
    db.commit()
    db.refresh(prefab)

    #Update user's rank
    update_rank(user_id, db)

    return prefab


def _prefabs_base(db: Session, tag: str = None):
    q = (
        db.query(
            *[c for c in models.PreFab.__table__.c if c.name != 'prefabFile'],
            models.User.name.label('uploader'),
        )
        .outerjoin(models.User, models.User.id == models.PreFab.owner_id)
    )
    if tag:
        q = q.filter(func.lower(models.PreFab.prefabTags).contains(tag.lower()))
    return q


#Get all prefabs
def get_prefabs(db: Session, skip: int = 0, limit: int = 100, tag: str = None):
    return _prefabs_base(db, tag)


#Get prefabs newest first
def get_newest_prefabs(db: Session, tag: str = None):
    return _prefabs_base(db, tag).order_by(desc(models.PreFab.time_created))


#Get prefabs oldest first
def get_oldest_prefabs(db: Session, tag: str = None):
    return _prefabs_base(db, tag).order_by(asc(models.PreFab.time_created))


#Get prefabs most downloaded first
def get_downloaded_prefabs(db: Session, tag: str = None):
    return _prefabs_base(db, tag).order_by(desc(models.PreFab.downloads))


#Search prefabs by name, author, description, or tag
def search_prefabs(db: Session, search_text: str):
    return db.query(*[c for c in models.PreFab.__table__.c if c.name != 'prefabFile']).filter(
        func.lower(models.PreFab.prefabName).contains(search_text.lower()) |
        func.lower(models.PreFab.prefabTags).contains(search_text.lower()) |
        func.lower(models.PreFab.prefabAuthor).contains(search_text.lower()) |
        func.lower(models.PreFab.prefabDescription).contains(search_text.lower())
    )


#Get all prefabs for a specific user 
def get_user_prefabs(db: Session, user: str, skip: int = 0, limit: int = 100):
    return db.query(*[c for c in models.PreFab.__table__.c if c.name != 'prefabFile']).filter(models.PreFab.owner_id == user.id).offset(skip).limit(limit).all()


#Get prefab data
def get_prefab(db: Session, prefab_id: int):
    return db.query(*[c for c in models.PreFab.__table__.c if c.name != 'prefabFile']).filter(models.PreFab.id == prefab_id).first()


#Get variant file
def get_prefab_file(db: Session, prefab_id: int):
    prefab = db.query(models.PreFab).filter(models.PreFab.id == prefab_id).first()

    if prefab:
        if prefab.downloads != None:
            prefab.downloads += 1

        else:
            prefab.downloads = 1

        db.commit()

    return prefab


#Case insensitive search for map name, author, or description
def search_maps(db: Session, search_text: str):
    return db.query(*[c for c in models.Map.__table__.c if c.name != 'mapFile']).filter(
        (func.lower(models.Map.mapName).contains(search_text.lower()))
        | (func.lower(models.Map.mapTags).contains(search_text.lower()))
        | (func.lower(models.Map.mapAuthor).contains(search_text.lower()))
        | (func.lower(models.Map.mapDescription).contains(search_text.lower()))
    ).filter(models.Map.notVisible == False)


#Case insensitive search for variant name, author, or description
def search_variants(db: Session, search_text: str):
    return db.query(*[c for c in models.Variant.__table__.c if c.name != 'variantFile']).filter(
        (func.lower(models.Variant.variantName).contains(search_text.lower()))
        | (func.lower(models.Variant.variantAuthor).contains(search_text.lower()))
        | (func.lower(models.Variant.variantDescription).contains(search_text.lower()))
    )


#Get all variants by newest first
def _variants_base(db: Session):
    return (
        db.query(
            *[c for c in models.Variant.__table__.c if c.name != 'variantFile'],
            models.User.name.label('uploader'),
        )
        .outerjoin(models.User, models.User.id == models.Variant.owner_id)
    )


def get_newest_variants(db: Session):
    return _variants_base(db).order_by(desc(models.Variant.time_created))


#Get all variants by oldest first
def get_oldest_variants(db: Session):
    return _variants_base(db).order_by(asc(models.Variant.time_created))


#Get all maps a user has upvoted
def get_user_upvoted_maps(db: Session, user_id: int):
    map_cols = [c for c in models.Map.__table__.c if c.name != 'mapFile']
    return (
        db.query(*map_cols)
        .join(models.Vote, models.Vote.mapId == models.Map.id)
        .filter(models.Vote.userId == user_id)
        .filter(models.Vote.vote == True)
        .filter(models.Map.notVisible == False)
        .all()
    )


#Get all mods a user has upvoted
def get_user_upvoted_mods(db: Session, user_id: int):
    mod_cols = [c for c in models.Mod.__table__.c if c.name != 'modFile']
    return (
        db.query(*mod_cols)
        .join(models.ModVote, models.ModVote.modId == models.Mod.id)
        .filter(models.ModVote.userId == user_id)
        .filter(models.ModVote.vote == True)
        .filter(models.Mod.notVisible == False)
        .all()
    )


#Returns map downvotes and upvotes
def get_vote(db: Session, map_id: int):
    mapUpVotes = db.query(*[c for c in models.Vote.__table__.c if c.name != 'id']).filter_by(mapId=map_id).filter_by(vote=True).count()
    mapDownVotes = db.query(*[c for c in models.Vote.__table__.c if c.name != 'id']).filter_by(mapId=map_id).filter_by(vote=False).count()

    if not mapUpVotes:
        mapUpVotes = 0

    if not mapDownVotes:
        mapDownVotes = 0

    return mapUpVotes, mapDownVotes


#Returns mod downvotes and upvotes
def get_mod_vote(db: Session, mod_id: int):
    up = db.query(models.ModVote).filter_by(modId=mod_id, vote=True).count()
    down = db.query(models.ModVote).filter_by(modId=mod_id, vote=False).count()
    return up or 0, down or 0


#Creates a downvote or upvote for a mod
def get_user_mod_vote(db: Session, mod_id: int, userId: int):
    vote_obj = db.query(models.ModVote).filter_by(modId=mod_id, userId=userId).first()
    if not vote_obj:
        return None
    return vote_obj.vote


def create_mod_vote(db: Session, mod_id: int, userId: int, vote: bool):
    vote_obj = db.query(models.ModVote).filter_by(modId=mod_id, userId=userId).first()
    if not vote_obj:
        voteObject = models.ModVote(userId=userId, modId=mod_id, vote=vote)
        db.add(voteObject)
        db.commit()
        db.refresh(voteObject)
        return True, voteObject

    # existing vote, toggle behavior
    if vote_obj.vote == vote:
        db.delete(vote_obj)
        db.commit()
        return True, 'Vote removed'

    # change vote
    vote_obj.vote = vote
    db.commit()
    db.refresh(vote_obj)
    return True, vote_obj


#Creates a downvote or upvote
def get_user_map_vote(db: Session, map_id: int, userId: int):
    vote_obj = db.query(models.Vote).filter_by(mapId=map_id, userId=userId).first()
    if not vote_obj:
        return None
    return vote_obj.vote


def create_vote(db: Session, map_id: int, userId: int, vote: bool):
    vote_obj = db.query(models.Vote).filter_by(mapId=map_id, userId=userId).first()

    if not vote_obj:
        voteObject = models.Vote(userId=userId, mapId=map_id, vote=vote)
        db.add(voteObject)
        db.execute("REFRESH MATERIALIZED VIEW mapdata")
        db.commit()
        db.refresh(voteObject)
        return True, voteObject

    if vote_obj.vote == vote:
        db.delete(vote_obj)
        db.execute("REFRESH MATERIALIZED VIEW mapdata")
        db.commit()
        return True, 'Vote removed'

    vote_obj.vote = vote
    db.execute("REFRESH MATERIALIZED VIEW mapdata")
    db.commit()
    db.refresh(vote_obj)
    return True, vote_obj



#Get all webhooks owned by a user
def get_user_webhooks(db: Session, user: str):
    webhooks = db.query(*[c for c in models.WebHook.__table__.c if c.name != 'webhookurl']).filter(models.WebHook.owner_id == user.id).all()

    if webhooks:
        return webhooks


#Create new webhook for user
def create_webhook(db: Session, webhookurl: str, webhookenabled: bool, webhooktype: str, webhookname: str, user: str):
    webhook = models.WebHook(webhookname=webhookname,
                owner_id=user.id,
                webhookurl=webhookurl,
                webhookenabled=webhookenabled,
                webhooktype=webhooktype)

    db.add(webhook)
    db.commit()
    db.refresh(webhook)

    if webhook:
        return webhook


#Delete Webhook
def delete_webhook(db: Session, webhook_id: int, user: str):
    webhook = db.query(models.WebHook).filter(models.WebHook.id == webhook_id and models.WebHook.owner_id == user.id).first()

    if webhook:
        db.delete(webhook)
        db.commit()

        return True, "Deleted Successfully"

    else:
        return False, "Webhook not found"


#Update webhook
def update_webhook(db: Session, webhook_id: int, webhookname: str, webhookenabled: bool, webhooktype: str, user: str):
    webhook = db.query(models.WebHook).filter(models.WebHook.id == webhook_id and models.WebHook.owner_id == user.id).first()

    webhook.webhookname = webhookname
    webhook.webhooktype = webhooktype
    webhook.webhookenabled = webhookenabled

    db.commit()

    return webhook