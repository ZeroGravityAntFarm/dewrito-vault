from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.responses import Response
from starlette.types import Scope
from starlette.staticfiles import StaticFiles
from api.api_v1.api import api_router
from db.models import models
from db.session import engine
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware
from internal.limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from fastapi_pagination import add_pagination
from db.session import SessionLocal
from db.models import models
import tempfile
import hashlib

MAX_UPLOAD_BYTES = 4_831_838_208  # 4.5 GB

models.Base.metadata.create_all(bind=engine)

# Column migrations for existing databases
with engine.begin() as _conn:
    _conn.execute(text("ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS map_tags TEXT"))
    _conn.execute(text("ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS mod_tags TEXT"))
    _conn.execute(text("ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS webhook_domain VARCHAR(256)"))

#Set tmp mount to location on a larger disk
tempfile.tempdir = "/tmp"


app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.include_router(api_router)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Serve robots.txt from project root
from fastapi.responses import FileResponse
import os

@app.get("/robots.txt", include_in_schema=False)
async def robots_txt():
    robots_path = os.path.join(os.path.dirname(__file__), "robots.txt")
    return FileResponse(robots_path, media_type="text/plain")


@app.middleware("http")
async def limit_upload_size(request: Request, call_next):
    if request.method in ("POST", "PUT", "PATCH"):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_UPLOAD_BYTES:
            return JSONResponse(
                status_code=413,
                content={"detail": "File too large. Maximum upload size is 4.5 GB."},
            )
    return await call_next(request)


async def verifyDownload(request: Request):
    m = hashlib.sha256()
    db = SessionLocal()

    split_path = request.url.path.split("/")

    if len(split_path) > 3:
        if split_path[2] == "pak":
            requestString = bytes(split_path[3] + request.client.host, 'utf-8')
            requestHash = hashlib.sha256(requestString).hexdigest()
            requestExists = db.query(models.Tracking).filter(models.Tracking.requestHash == requestHash).first() is not None

            if not requestExists:
                modId = split_path[3]
                mod = db.query(models.Mod).filter(models.Mod.id == modId).first()
                mod.mod_downloads += 1
                
                newRequest = models.Tracking(requestHash=requestHash)

                db.add(newRequest)
                db.commit()


'''
Patching Starlettes StaticFiles class. 
- get_response: Check content type and set respective content-type header. 
- __call__ adds a hook to verifyDownload. This method creates a hash for every request and checks if the requested resource is a 
pak file. We can add this hash to the database to prevent users from abusing the download counter.
'''
class CustomStaticFiles(StaticFiles):
    def __init__(self, *args, **kwargs) -> None:

        super().__init__(*args, **kwargs)

    async def get_response(self, path: str, scope: Scope) -> Response:
        response = await super().get_response(path, scope)

        if path.endswith('.pak') or path.endswith('.map'):
            response.headers["Content-Type"] = "application/octet-stream"
            response.headers["Cache-Control"] = "public, max-age=3200"

        elif path.endswith(("0", "1", "2", "3", "4")):
            response.headers["Content-Type"] = "image/png"
            response.headers["Cache-Control"] = "public, max-age=86400"

        elif path.endswith(('.js', '.css', '.html')):
            response.headers["Cache-Control"] = "no-cache"

        return response       

    async def __call__(self, scope, receive, send) -> None:
        assert scope["type"] == "http"
        request = Request(scope, receive)
        await verifyDownload(request)
        await super().__call__(scope, receive, send)


app.mount("/", CustomStaticFiles(directory="static", html = True), name="static")
add_pagination(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
