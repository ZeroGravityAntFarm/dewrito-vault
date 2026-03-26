from fastapi import APIRouter, HTTPException, Depends
from db.schemas import schemas
from db import controller
from db.session import SessionLocal
from sqlalchemy.orm import Session
from internal.auth import get_current_user

router = APIRouter()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/votes/me/maps")
def get_my_upvoted_maps(user=Depends(get_current_user), db: Session = Depends(get_db)):
    maps = controller.get_user_upvoted_maps(db, user.id)
    return [dict(row._mapping) for row in maps]


@router.get("/votes/me/mods")
def get_my_upvoted_mods(user=Depends(get_current_user), db: Session = Depends(get_db)):
    mods = controller.get_user_upvoted_mods(db, user.id)
    return [dict(row._mapping) for row in mods]


@router.get("/vote/mod/{mod_id}/")
def get_mod_vote(mod_id: int, db: Session = Depends(get_db)):
    if not mod_id:
        raise HTTPException(status_code=400, detail="Missing mod ID")
    up, down = controller.get_mod_vote(db, mod_id)
    return {"up_votes": up, "down_votes": down}


@router.post("/vote/mod/{mod_id}/{vote}")
def create_mod_vote(mod_id: int, vote: int, user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user:
        raise HTTPException(status_code=400, detail="Not Authenticated")
    if not mod_id:
        raise HTTPException(status_code=400, detail="Missing mod ID")
    if vote == 1:
        vote = True
    elif vote == 0:
        vote = False
    else:
        raise HTTPException(status_code=400, detail="Expected 1 or 0")

    status, msg = controller.create_mod_vote(db, mod_id, user.id, vote)
    if status:
        return "Success!"
    return msg


@router.get("/vote/{map_id}/")
def get_vote(map_id: int, db: Session = Depends(get_db)):
    if not map_id:
        raise HTTPException(status_code=400, detail="Missing map ID")

    mapUpVotes, mapDownVotes = controller.get_vote(db, map_id)

    return {"up_votes": mapUpVotes, "down_votes": mapDownVotes}

@router.post("/vote/{map_id}/{vote}")
def create_vote(map_id: int, vote: int, user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user:
        raise HTTPException(status_code=400, detail="Not Authenticated")

    if not map_id:
        raise HTTPException(status_code=400, detail="Missing map ID")
    
    if vote == 1:
        vote = True

    elif vote == 0:
        vote = False

    else: 
        raise HTTPException(status_code=400, detail="Expected 1 or 0")


    status, msg = controller.create_vote(db, map_id, user.id, vote)

    if status:
        return "Success!"

    if not status:
        return msg

