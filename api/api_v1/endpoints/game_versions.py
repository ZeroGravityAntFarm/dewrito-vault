from fastapi import APIRouter, Depends
from db.session import SessionLocal
from db import controller
import json

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/game-versions")
def get_game_versions(db=Depends(get_db)):
    settings = controller.get_or_create_settings(db)
    return {"game_versions": json.loads(settings.game_versions or "[]")}
