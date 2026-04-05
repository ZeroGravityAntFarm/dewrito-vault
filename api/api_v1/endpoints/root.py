from fastapi import APIRouter, Request, Depends
from fastapi.responses import FileResponse, HTMLResponse, Response
from fastapi.templating import Jinja2Templates
from db.session import SessionLocal
from db.models import models
from db import controller
from sqlalchemy.orm import Session

router = APIRouter()

SPA = "static/index.html"
templates = Jinja2Templates(directory="templates")

BOT_AGENTS = (
    "facebookexternalhit",
    "twitterbot",
    "discordbot",
    "slackbot",
    "linkedinbot",
    "whatsapp",
    "telegrambot",
    "googlebot",
    "bingbot",
    "applebot",
    "embedly",
    "outbrain",
    "pinterest",
    "quora link preview",
    "rogerbot",
    "showyoubot",
    "skypeuripreview",
    "vkshare",
    "w3c_validator",
    "xing-contenttabreceiver",
)


def _is_bot(request: Request) -> bool:
    ua = request.headers.get("user-agent", "").lower()
    return any(bot in ua for bot in BOT_AGENTS)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- dynamic sitemap for crawlers ---
@router.get("/sitemap.xml", response_class=Response)
def sitemap(request: Request):
    base_url = f"{request.url.scheme}://{request.url.netloc}"

    static_paths = [
        "/",
        "/maps",
        "/maps/newest",
        "/maps/downloaded",
        "/maps/oldest",
        "/variants",
        "/mods",
        "/mods/newest",
        "/mods/oldest",
        "/login",
        "/register",
        "/about",
    ]

    dynamic_paths = []
    with SessionLocal() as db:
        for m in db.query(models.Map).filter(models.Map.notVisible == False).all():
            dynamic_paths.append(f"/maps/{m.id}")

        for v in db.query(models.Variant).all():
            dynamic_paths.append(f"/variants/{v.id}")

        for m in db.query(models.Mod).filter(models.Mod.notVisible == False).all():
            dynamic_paths.append(f"/mods/{m.id}")

    urls = static_paths + dynamic_paths

    xml_items = [
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
        "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">",
    ]

    for path in urls:
        full_url = f"{base_url}{path}"
        xml_items.append("  <url>")
        xml_items.append(f"    <loc>{full_url}</loc>")
        xml_items.append("    <changefreq>weekly</changefreq>")
        xml_items.append("    <priority>0.5</priority>")
        xml_items.append("  </url>")

    xml_items.append("</urlset>")
    sitemap_xml = "\n".join(xml_items)

    return Response(content=sitemap_xml, media_type="application/xml")


# --- SPA shell for all client-side routes ---

@router.get("/", response_class=HTMLResponse)
def root(request: Request):
    return FileResponse(SPA)

@router.get("/maps", response_class=HTMLResponse)
def maps_root(request: Request):
    return FileResponse(SPA)

@router.get("/maps/newest", response_class=HTMLResponse)
def maps_newest(request: Request):
    return FileResponse(SPA)

@router.get("/maps/downloaded", response_class=HTMLResponse)
def maps_downloaded(request: Request):
    return FileResponse(SPA)

@router.get("/maps/oldest", response_class=HTMLResponse)
def maps_oldest(request: Request):
    return FileResponse(SPA)

@router.get("/maps/{map_id}", response_class=HTMLResponse)
def map_detail(request: Request, map_id: str, db: Session = Depends(get_db)):
    if _is_bot(request):
        try:
            map_id_int = int(map_id)
            item = controller.get_map(db, map_id=map_id_int)
            if item:
                return templates.TemplateResponse("map/index.html", {
                    "request": request,
                    "mapName": item.mapName,
                    "id": item.id,
                    "mapDescription": item.mapDescription,
                })
        except (ValueError, Exception):
            pass
    return FileResponse(SPA)

@router.get("/variants", response_class=HTMLResponse)
def variants_root(request: Request):
    return FileResponse(SPA)

@router.get("/variants/{variant_id}", response_class=HTMLResponse)
def variant_detail(request: Request, variant_id: str, db: Session = Depends(get_db)):
    if _is_bot(request):
        try:
            variant_id_int = int(variant_id)
            item = controller.get_variant_id(db, variant_id=variant_id_int)
            if item:
                variant_image = item.variantFileName.split('.')[1] if '.' in item.variantFileName else ""
                return templates.TemplateResponse("variant/index.html", {
                    "request": request,
                    "variantName": item.variantName,
                    "id": item.id,
                    "variantDescription": item.variantDescription,
                    "variantImage": variant_image,
                })
        except (ValueError, Exception):
            pass
    return FileResponse(SPA)

@router.get("/prefabs", response_class=HTMLResponse)
def prefabs_root(request: Request):
    return FileResponse(SPA)

@router.get("/prefabs/newest", response_class=HTMLResponse)
def prefabs_newest(request: Request):
    return FileResponse(SPA)

@router.get("/prefabs/downloaded", response_class=HTMLResponse)
def prefabs_downloaded(request: Request):
    return FileResponse(SPA)

@router.get("/prefabs/oldest", response_class=HTMLResponse)
def prefabs_oldest(request: Request):
    return FileResponse(SPA)

@router.get("/prefabs/{prefab_id}", response_class=HTMLResponse)
def prefab_detail(request: Request, prefab_id: str, db: Session = Depends(get_db)):
    if _is_bot(request):
        try:
            prefab_id_int = int(prefab_id)
            item = controller.get_prefab(db, prefab_id=prefab_id_int)
            if item:
                return templates.TemplateResponse("prefab/index.html", {
                    "request": request,
                    "prefabName": item.prefabName,
                    "id": item.id,
                    "prefabDescription": item.prefabDescription,
                })
        except (ValueError, Exception):
            pass
    return FileResponse(SPA)

@router.get("/mods", response_class=HTMLResponse)
def mods_root(request: Request):
    return FileResponse(SPA)

@router.get("/mods/newest", response_class=HTMLResponse)
def mods_newest(request: Request):
    return FileResponse(SPA)

@router.get("/mods/oldest", response_class=HTMLResponse)
def mods_oldest(request: Request):
    return FileResponse(SPA)

@router.get("/mods/{mod_id}", response_class=HTMLResponse)
def mod_detail(request: Request, mod_id: str, db: Session = Depends(get_db)):
    if _is_bot(request):
        try:
            mod_id_int = int(mod_id)
            item = controller.get_mod(db, mod_id=mod_id_int)
            if item:
                return templates.TemplateResponse("mod/index.html", {
                    "request": request,
                    "modName": item.modName,
                    "id": item.id,
                    "modDescription": item.modDescription,
                })
        except (ValueError, Exception):
            pass
    return FileResponse(SPA)

@router.get("/login", response_class=HTMLResponse)
def login(request: Request):
    return FileResponse(SPA)

@router.get("/register", response_class=HTMLResponse)
def register(request: Request):
    return FileResponse(SPA)

@router.get("/profile", response_class=HTMLResponse)
def profile(request: Request):
    return FileResponse(SPA)

@router.get("/u/{username}", response_class=HTMLResponse)
def user_profile(request: Request, username: str):
    return FileResponse(SPA)

@router.get("/about", response_class=HTMLResponse)
def about(request: Request):
    return FileResponse(SPA)

@router.get("/admin", response_class=HTMLResponse)
def admin(request: Request):
    return FileResponse(SPA)
