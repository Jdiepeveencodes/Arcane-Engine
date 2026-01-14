from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["map"])

class MapGenerateReq(BaseModel):
    prompt: str = ""
    style: str | None = None
    cols: int = 20
    rows: int = 20
    cell: int = 32

class MapGenerateResp(BaseModel):
    imageUrl: str
    cols: int | None = None
    rows: int | None = None
    cell: int | None = None

# ✅ What the frontend expects:
# POST /api/rooms/{room_id}/map/generate
@router.post("/api/rooms/{room_id}/map/generate", response_model=MapGenerateResp)
def generate_room_map(room_id: str, req: MapGenerateReq):
    # MVP placeholder: return a static image URL so you can test end-to-end.
    demo = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Grid_illustration.svg/1024px-Grid_illustration.svg.png"
    return MapGenerateResp(imageUrl=demo, cols=req.cols, rows=req.rows, cell=req.cell)

# ✅ Keep backwards compatibility (optional):
# POST /api/map/generate
@router.post("/api/map/generate", response_model=MapGenerateResp)
def generate_map(req: MapGenerateReq):
    demo = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Grid_illustration.svg/1024px-Grid_illustration.svg.png"
    return MapGenerateResp(imageUrl=demo, cols=req.cols, rows=req.rows, cell=req.cell)
