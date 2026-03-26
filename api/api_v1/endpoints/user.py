from fastapi import APIRouter, HTTPException, Depends, Request, Form
from fastapi import File, UploadFile
from PIL import Image
import io
import os
from db.schemas import schemas
from db import controller
from db.session import SessionLocal
from sqlalchemy.orm import Session
from internal.auth import get_current_user
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from internal.auth import verify_password

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


#Returns dynamically built view for a users profile.
@router.get("/profile/{username}", response_class=HTMLResponse)
async def return_map(request: Request, username: str, db: Session = Depends(get_db)):
    try:
        user = controller.get_user(db, user_name=username, request=request)
        maps = controller.get_user_maps_public(db, user=user, limit=500)
        prefabs = controller.get_user_prefabs(db, user=user, limit=500)
        mods = controller.get_user_mods_public(db, user=user, limit=500)
        stats = controller.get_user_stats(db, user_id=user.id)

    except Exception:
        return templates.TemplateResponse("404/index.html", {"request": request})

    if user:
        return templates.TemplateResponse("profile/index.html", {"request": request, "user": user, "maps": maps, "prefabs": prefabs, "mods": mods, "stats": stats})

    else:
        return templates.TemplateResponse("404/index.html", {"request": request})


#Create a new user
@router.post("/users/", response_model=schemas.User)
def create_user(request: Request, user: schemas.UserCreate, db: Session = Depends(get_db)):
    settings = controller.get_or_create_settings(db)
    if not settings.registration_enabled:
        raise HTTPException(status_code=403, detail="Registration is currently disabled.")

    if not user.name or user.name.isspace():
        raise HTTPException(status_code=400, detail="Empty username")

    #Check if username already registered
    db_user = controller.get_user(db, user_name=user.name, request=request)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    return controller.create_user(db=db, user=user)


#Delete a user
@router.delete("/users/me")
def delete_me(user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    status, msg = controller.delete_user(db, user)
    
    if status:
        return msg

    if status == False:
        return msg


#Get all users
@router.get("/users/")
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = controller.get_users(db, skip=skip, limit=limit)

    return users


#Get all maps by a user
@router.get("/usermaps/")
def read_users_maps(skip: int = 0, limit: int = 1000, db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    maps = controller.get_user_maps(db, skip=skip, limit=limit, user=user)

    return maps 


#Get all mods by a user
@router.get("/usermods/")
def read_users_mods(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    mods = controller.get_user_mods(db, skip=skip, limit=limit, user=user)

    return mods


#Get all prefabs by a user
@router.get("/userprefabs/")
def read_users_prefabs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    prefabs = controller.get_user_prefabs(db, skip=skip, limit=limit, user=user)

    return prefabs


#Get public maps by user ID
@router.get("/users/{user_id}/maps")
def read_user_maps_public(user_id: int, db: Session = Depends(get_db)):
    user = controller.get_userId(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    maps = controller.get_user_maps_public(db, user=user, limit=500)
    return [dict(row._mapping) for row in maps]


#Get public mods by user ID
@router.get("/users/{user_id}/mods")
def read_user_mods_public(user_id: int, db: Session = Depends(get_db)):
    user = controller.get_userId(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    mods = controller.get_user_mods_public(db, user=user, limit=500)
    return [dict(row._mapping) for row in mods]


#Upload profile picture
@router.post("/users/avatar")
async def upload_avatar(file: UploadFile = File(...), user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user:
        raise HTTPException(status_code=403, detail="Not authenticated")

    allowed = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Invalid file type. Use JPEG, PNG, or WebP.")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB.")

    try:
        img = Image.open(io.BytesIO(contents)).convert('RGB')
        img.thumbnail((256, 256), Image.LANCZOS)
        avatar_dir = "static/content/avatars"
        os.makedirs(avatar_dir, exist_ok=True)
        img.save(f"{avatar_dir}/{user.id}.jpg", "JPEG", quality=85)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not process image.")

    return {"avatar_url": f"/content/avatars/{user.id}.jpg"}


#Get single user by ID
@router.get("/users/{user_id}")
def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = controller.get_userId(db, user_id=user_id)

    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    return db_user


#Get single user by name
@router.get("/username/{user_name}")
def read_user_name(user_name: str, request: Request, db: Session = Depends(get_db)):
    db_user = controller.get_user(db, user_name=user_name, request=request)

    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    return db_user


#Get user that is currently authenticated
@router.get("/me", response_model=schemas.User)
def get_me(user: str = Depends(get_current_user)):
    return user


#Get single user stats
@router.get("/users/stats/{user_id}")
def read_user_stats(user_id: int, db: Session = Depends(get_db)):
    user_stats = controller.get_user_stats(db, user_id=user_id)

    if user_stats is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user_stats


#Update User Data
@router.patch("/users")
def patch_user(userName: str = Form(" "), userAbout: str = Form(" "), db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    newUser = controller.update_user(db, userName=userName, userEmail=None, userAbout=userAbout, user=user)

    if newUser:
        return HTTPException(status_code=200, detail="Profile updated successfully!")
    
    else:
        raise HTTPException(status_code=400, detail="Failed to update profile")


#Update User Password (requires TOTP code if 2FA is enabled)
@router.patch("/users/password")
def patch_user_password(
    userPassword: str = Form(...),
    currentPassword: str = Form(default=None),
    totp_code: str = Form(default=None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    has_2fa = getattr(user, 'totp_enabled', False)

    # Verify current password if provided
    current_password_ok = False
    if currentPassword:
        db_user = db.query(controller.models.User).filter(controller.models.User.id == user.id).first()
        current_password_ok = verify_password(currentPassword, db_user.hashed_password)

    # Verify TOTP if provided and 2FA is enabled
    totp_ok = False
    if totp_code and has_2fa:
        totp_ok = controller.verify_totp_for_user(db, user.id, totp_code)

    if not current_password_ok and not totp_ok:
        if has_2fa:
            raise HTTPException(status_code=403, detail="Current password or authenticator code required.")
        else:
            raise HTTPException(status_code=403, detail="Current password is required.")

    newUser = controller.update_user_password(db, userPassword=userPassword, user=user)

    if newUser:
        return HTTPException(status_code=200, detail="Password updated successfully!")
    else:
        raise HTTPException(status_code=400, detail="Failed to update password")


# --- 2FA endpoints ---

@router.get("/users/2fa/status")
def get_2fa_status(user=Depends(get_current_user)):
    return {"totp_enabled": bool(getattr(user, 'totp_enabled', False))}


@router.post("/users/2fa/setup")
def setup_2fa(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Generate a new TOTP secret and return QR code + plaintext secret for setup."""
    secret, qr_data_uri = controller.setup_totp(db, user.id, user.name)
    return {"secret": secret, "qr": qr_data_uri}


@router.post("/users/2fa/enable")
def enable_2fa(totp_code: str = Form(...), db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Confirm setup by verifying a TOTP code; marks 2FA as enabled."""
    if not controller.enable_totp(db, user.id, totp_code):
        raise HTTPException(status_code=400, detail="Invalid code. Ensure your authenticator is synced and try again.")
    return {"detail": "Two-factor authentication enabled."}


@router.post("/users/2fa/disable")
def disable_2fa(totp_code: str = Form(...), db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Disable 2FA after verifying the current TOTP code."""
    if not controller.disable_totp(db, user.id, totp_code):
        raise HTTPException(status_code=400, detail="Invalid code. Two-factor authentication was not disabled.")
    return {"detail": "Two-factor authentication disabled."}


#Create a new webhook
@router.post("/user/webhook")
def create_webhook(webhookname: str = Form(" "), webhooktype: str = Form(" "), webhookenabled: bool = Form(...), webhookurl: str = Form(...), db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    userWebhooks = controller.create_webhook(db, webhookname=webhookname, webhooktype=webhooktype, webhookenabled=webhookenabled, webhookurl=webhookurl, user=user)

    if userWebhooks:
        return "Success"

    else:
        return "Update failed"


#Update a webhook
@router.patch("/user/webhook/{webhook_id}")
def update_webhook(webhook_id: int, webhookname: str = Form(" "), webhooktype: str = Form(" "), webhookenabled: bool = Form(...), db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    userWebhooks = controller.update_webhook(db, webhookname=webhookname, webhooktype=webhooktype, webhookenabled=webhookenabled, user=user, webhook_id=webhook_id)
    
    if userWebhooks:
        return "Success"

    else:
        return "Update failed"


#Delete a webhook
@router.delete("/user/webhook/{webhook_id}")
def delete_webhook(webhook_id: int, db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    status, msg = controller.delete_webhook(db, user=user, webhook_id=webhook_id)

    return msg


#Get my webhooks
@router.get("/user/webhook/")
def read_user_webhooks(db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    user_webhooks = controller.get_user_webhooks(db, user=user)

    if user_webhooks is None:
        raise HTTPException(status_code=404, detail="No webhooks found")
    
    return user_webhooks