from fastapi import APIRouter, Depends, HTTPException, status, Header, Form
from db.schemas import schemas
from db.controller import authenticate_user, create_access_token, verify_totp_by_username
from db.session import SessionLocal
from datetime import timedelta
from sqlalchemy.orm import Session
from internal.auth import ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/login")
async def login_for_access_token(
    real_ip: str = Header(None, alias='X-Forwarded-For'),
    db: Session = Depends(get_db),
    username: str = Form(...),
    password: str = Form(...),
    totp_code: str = Form(default=None),
):
    user = authenticate_user(db, username, password, real_ip)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username, password or account deactivated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # If 2FA is enabled, validate the TOTP code
    if user.totp_enabled:
        if not totp_code:
            # Tell the client 2FA is required — do not issue a token yet
            return {"requires_2fa": True}
        if not verify_totp_by_username(db, username, totp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authenticator code.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.name}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
