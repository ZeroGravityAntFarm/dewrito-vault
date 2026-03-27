from pydantic import BaseModel
from datetime import datetime


#Map models
class MapBase(BaseModel):
    mapName: str
    mapDescription: str | None = None
    mapAuthor: str
    mapFile: bytes
    mapScnrObjectCount: int
    mapTotalObject: int
    mapBudgetCount:int | None = None


#Inherits from MapBase
class MapCreate(MapBase):
    variantId: int | None = None
    mapTags: str  | None = None
    mapUserDesc: str | None = None
    mapVisibility: bool
    gameVersion: str
    pass


#Inherits from MapBase
class Map(MapBase):
    mapId: int
    owner_id: int

    class Config:
        orm_mode = True

#Map query without file
class MapQuery(BaseModel):
    id: int
    mapName: str
    mapDescription: str | None = None
    mapAuthor: str
    uploader: str | None = None
    mapScnrObjectCount: int | None = None
    mapTotalObject: int | None = None
    map_downloads: int | None = None
    mapBudgetCount:int | None = None
    variant_id:int | None = None
    mapTags: str
    gameVersion: str
    time_created: datetime = None
    up_votes: int = 0
    down_votes: int = 0

    class Config:
        orm_mode = True

class Mod(BaseModel):
    id: int
    modName: str
    modDescription: str | None = None
    modAuthor: str
    uploader: str | None = None
    mod_downloads: int | None = None
    modFileSize: int | None = None
    modFileName: str | None = None
    gameVersion: str | None = None
    owner_id: int | None = None
    modId: int | None = None
    modTags: str | None = None
    time_created: datetime = None
    up_votes: int = 0
    down_votes: int = 0

    class Config:
        orm_mode = True


#Inherits from Mod
class ModCreate(Mod):
    pass


class VariantQuery(BaseModel):
    id: int
    variantName: str
    variantDescription: str | None = None
    variantAuthor: str
    uploader: str | None = None
    time_created: str | None = None
    time_updated: str | None = None
    owner_id: int
    downloads: int
    gameVersion: str
    variantFileName: str


#Variant models
class VariantBase(BaseModel):
    variantName: str
    variantDescription: str | None = None
    variantAuthor: str
    variantFile: bytes
    variantFile: str
    gameVersion: str


#Inherits from VariantBase
class VariantCreate(VariantBase):
    pass


#Inherits from VariantBase
class Variant(VariantBase):
    variantId: int
    owner_id: int

    class Config:
        orm_mode = True


#User models
class UserBase(BaseModel):
    name: str


#Inherits from UserBase
class UserCreate(UserBase):
    password: str


#Inherits from UserBase
class User(UserBase):
    id: int
    rank: str
    about: str
    is_active: bool
    is_admin: bool = False
    totp_enabled: bool = False
    maps: list[Map] = []

    class Config:
        orm_mode = True


class PrefBase(BaseModel):
    prefabName: str
    prefabDescription: str
    prefabAuthor: str
    prefabFile: bytes
    gameVersion: str


class PreFabCreate(PrefBase):
    pass


class PrefabQuery(PrefBase):
    uploader: str | None = None
    downloads: int
    prefabTags: str
    gameVersion: str
    

class WebHookBase(BaseModel):
    owner_id: int
    webhookname: str
    webhooktype: str
    webhookurl: str
    webhookenabled: bool


class WebHookCreate(WebHookBase):
    pass


#Auth token
class Token(BaseModel):
    access_token: str
    token_type: str = None


#Token data
class TokenData(BaseModel):
    sub: str = None
    exp: int = None


#Tracking models
class TrackingBase(BaseModel):
    id: int
    requestHash: str