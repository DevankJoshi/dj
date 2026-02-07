from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: Optional[str] = None

class CameraCreate(BaseModel):
    name: str
    source_url: str = ""
    location: Optional[str] = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_active: bool = True

class CameraOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    camera_id: str
    user_id: str
    name: str
    source_url: str = ""
    location: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_active: bool = True
    created_at: str

class DetectionOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    detection_id: str
    camera_id: str
    camera_name: Optional[str] = ""
    detection_type: str  # pothole, billboard, railing, barrier
    confidence: float
    lat: Optional[float] = None
    lng: Optional[float] = None
    location: Optional[str] = ""
    severity: str = "medium"  # low, medium, high, critical
    timestamp: str
    user_id: str

class DetectionCreate(BaseModel):
    camera_id: str
    detection_type: str
    confidence: float
    lat: Optional[float] = None
    lng: Optional[float] = None
    location: Optional[str] = ""
    severity: str = "medium"

class AlertOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    alert_id: str
    detection_id: Optional[str] = None
    alert_type: str
    message: str
    severity: str
    acknowledged: bool = False
    user_id: str
    timestamp: str

class StatsOut(BaseModel):
    total_detections: int = 0
    potholes: int = 0
    billboards: int = 0
    railings: int = 0
    barriers: int = 0
    active_cameras: int = 0
    critical_alerts: int = 0

class ModelStatusOut(BaseModel):
    connected: bool = False
    model_name: str = "Not Connected"
    model_version: str = "N/A"
    last_inference: Optional[str] = None
    status: str = "disconnected"

# ==================== AUTH HELPERS ====================

async def get_current_user(request: Request) -> dict:
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    async with httpx.AsyncClient() as http_client:
        resp = await http_client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        data = resp.json()
    
    email = data.get("email")
    name = data.get("name")
    picture = data.get("picture")
    session_token = data.get("session_token")
    
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"email": email}, {"$set": {"name": name, "picture": picture}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return {"message": "Logged out"}

# ==================== CAMERA ENDPOINTS ====================

@api_router.get("/cameras", response_model=List[CameraOut])
async def list_cameras(request: Request):
    user = await get_current_user(request)
    cameras = await db.cameras.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    return cameras

@api_router.post("/cameras", response_model=CameraOut)
async def create_camera(camera: CameraCreate, request: Request):
    user = await get_current_user(request)
    doc = {
        "camera_id": f"cam_{uuid.uuid4().hex[:8]}",
        "user_id": user["user_id"],
        "name": camera.name,
        "source_url": camera.source_url,
        "location": camera.location or "",
        "lat": camera.lat,
        "lng": camera.lng,
        "is_active": camera.is_active,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.cameras.insert_one(doc)
    result = await db.cameras.find_one({"camera_id": doc["camera_id"]}, {"_id": 0})
    return result

@api_router.put("/cameras/{camera_id}", response_model=CameraOut)
async def update_camera(camera_id: str, camera: CameraCreate, request: Request):
    user = await get_current_user(request)
    update_data = {
        "name": camera.name,
        "source_url": camera.source_url,
        "location": camera.location or "",
        "lat": camera.lat,
        "lng": camera.lng,
        "is_active": camera.is_active
    }
    result = await db.cameras.find_one_and_update(
        {"camera_id": camera_id, "user_id": user["user_id"]},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Camera not found")
    result.pop("_id", None)
    return result

@api_router.delete("/cameras/{camera_id}")
async def delete_camera(camera_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.cameras.delete_one({"camera_id": camera_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Camera not found")
    return {"message": "Camera deleted"}

# ==================== DETECTION ENDPOINTS ====================

@api_router.get("/detections", response_model=List[DetectionOut])
async def list_detections(
    request: Request,
    detection_type: Optional[str] = None,
    severity: Optional[str] = None,
    camera_id: Optional[str] = None,
    limit: int = Query(default=50, le=500),
    skip: int = 0
):
    user = await get_current_user(request)
    query = {"user_id": user["user_id"]}
    if detection_type:
        query["detection_type"] = detection_type
    if severity:
        query["severity"] = severity
    if camera_id:
        query["camera_id"] = camera_id
    
    detections = await db.detections.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    return detections

@api_router.post("/detections", response_model=DetectionOut)
async def create_detection(detection: DetectionCreate, request: Request):
    user = await get_current_user(request)
    
    camera = await db.cameras.find_one({"camera_id": detection.camera_id}, {"_id": 0})
    camera_name = camera["name"] if camera else "Unknown"
    
    doc = {
        "detection_id": f"det_{uuid.uuid4().hex[:8]}",
        "camera_id": detection.camera_id,
        "camera_name": camera_name,
        "detection_type": detection.detection_type,
        "confidence": detection.confidence,
        "lat": detection.lat or (camera.get("lat") if camera else None),
        "lng": detection.lng or (camera.get("lng") if camera else None),
        "location": detection.location or (camera.get("location", "") if camera else ""),
        "severity": detection.severity,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_id": user["user_id"]
    }
    await db.detections.insert_one(doc)
    
    # Create alert for high/critical severity
    if detection.severity in ["high", "critical"]:
        alert_doc = {
            "alert_id": f"alert_{uuid.uuid4().hex[:8]}",
            "detection_id": doc["detection_id"],
            "alert_type": detection.detection_type,
            "message": f"{detection.severity.upper()} {detection.detection_type} detected on {camera_name} (confidence: {detection.confidence:.0%})",
            "severity": detection.severity,
            "acknowledged": False,
            "user_id": user["user_id"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.alerts.insert_one(alert_doc)
    
    result = await db.detections.find_one({"detection_id": doc["detection_id"]}, {"_id": 0})
    return result

@api_router.get("/detections/stats", response_model=StatsOut)
async def get_detection_stats(request: Request):
    user = await get_current_user(request)
    uid = user["user_id"]
    
    total = await db.detections.count_documents({"user_id": uid})
    potholes = await db.detections.count_documents({"user_id": uid, "detection_type": "pothole"})
    billboards = await db.detections.count_documents({"user_id": uid, "detection_type": "billboard"})
    railings = await db.detections.count_documents({"user_id": uid, "detection_type": "railing"})
    barriers = await db.detections.count_documents({"user_id": uid, "detection_type": "barrier"})
    active_cameras = await db.cameras.count_documents({"user_id": uid, "is_active": True})
    critical_alerts = await db.alerts.count_documents({"user_id": uid, "severity": "critical", "acknowledged": False})
    
    return StatsOut(
        total_detections=total,
        potholes=potholes,
        billboards=billboards,
        railings=railings,
        barriers=barriers,
        active_cameras=active_cameras,
        critical_alerts=critical_alerts
    )

@api_router.get("/detections/timeline")
async def get_detection_timeline(request: Request, days: int = 7):
    user = await get_current_user(request)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    detections = await db.detections.find(
        {"user_id": user["user_id"], "timestamp": {"$gte": cutoff}},
        {"_id": 0, "detection_type": 1, "timestamp": 1}
    ).to_list(5000)
    
    # Group by day
    timeline = {}
    for d in detections:
        day = d["timestamp"][:10]
        if day not in timeline:
            timeline[day] = {"date": day, "pothole": 0, "billboard": 0, "railing": 0, "barrier": 0}
        dt = d["detection_type"]
        if dt in timeline[day]:
            timeline[day][dt] += 1
    
    sorted_data = sorted(timeline.values(), key=lambda x: x["date"])
    return sorted_data

# ==================== ALERT ENDPOINTS ====================

@api_router.get("/alerts", response_model=List[AlertOut])
async def list_alerts(request: Request, acknowledged: Optional[bool] = None, limit: int = 50):
    user = await get_current_user(request)
    query = {"user_id": user["user_id"]}
    if acknowledged is not None:
        query["acknowledged"] = acknowledged
    alerts = await db.alerts.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return alerts

@api_router.put("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.alerts.update_one(
        {"alert_id": alert_id, "user_id": user["user_id"]},
        {"$set": {"acknowledged": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert acknowledged"}

@api_router.get("/alerts/unread-count")
async def unread_alert_count(request: Request):
    user = await get_current_user(request)
    count = await db.alerts.count_documents({"user_id": user["user_id"], "acknowledged": False})
    return {"count": count}

# ==================== MODEL PLACEHOLDER ====================

# MODEL INTEGRATION PLACEHOLDER
# Replace the logic in this endpoint with your actual YOLO/PyTorch model inference
# The endpoint expects an image/frame and returns detections

@api_router.get("/model/status", response_model=ModelStatusOut)
async def model_status(request: Request):
    await get_current_user(request)
    # TODO: Replace with actual model status check
    return ModelStatusOut(
        connected=False,
        model_name="YOLO v8 (Placeholder)",
        model_version="N/A",
        last_inference=None,
        status="disconnected"
    )

@api_router.post("/model/detect")
async def model_detect(request: Request):
    """
    MODEL INTEGRATION PLACEHOLDER
    
    This endpoint is where you integrate your pretrained YOLO/PyTorch model.
    
    Expected flow:
    1. Receive image/frame data (base64 or multipart)
    2. Run inference through your model
    3. Return detections with bounding boxes, classes, confidence scores
    
    Example response format:
    {
        "detections": [
            {
                "class": "pothole",
                "confidence": 0.92,
                "bbox": [x1, y1, x2, y2],
                "severity": "high"
            }
        ],
        "inference_time_ms": 45,
        "model_name": "yolov8_road_detection"
    }
    """
    await get_current_user(request)
    # TODO: Implement actual model inference here
    return {
        "detections": [],
        "inference_time_ms": 0,
        "model_name": "placeholder",
        "message": "Model not connected. Replace this endpoint with your YOLO/PyTorch model inference."
    }

# ==================== SEED DATA ENDPOINT ====================

@api_router.post("/seed-demo-data")
async def seed_demo_data(request: Request):
    """Seed demo data for testing purposes"""
    user = await get_current_user(request)
    uid = user["user_id"]
    
    # Create demo cameras
    cameras = [
        {"camera_id": f"cam_demo_{i}", "user_id": uid, "name": f"CAM-{str(i).zfill(2)}", 
         "source_url": "", "location": loc, "lat": lat, "lng": lng, "is_active": True,
         "created_at": datetime.now(timezone.utc).isoformat()}
        for i, (loc, lat, lng) in enumerate([
            ("Highway NH-48 KM 52", 28.4595, 77.0266),
            ("Ring Road Sector 14", 28.4700, 77.0400),
            ("MG Road Intersection", 28.4800, 77.0500),
            ("Expressway Exit 7", 28.4900, 77.0600),
        ], 1)
    ]
    
    for cam in cameras:
        existing = await db.cameras.find_one({"camera_id": cam["camera_id"]})
        if not existing:
            await db.cameras.insert_one(cam)
    
    # Create demo detections
    import random
    detection_types = ["pothole", "billboard", "railing", "barrier"]
    severities = ["low", "medium", "high", "critical"]
    
    for _ in range(30):
        cam = random.choice(cameras)
        dt = random.choice(detection_types)
        sev = random.choice(severities)
        conf = round(random.uniform(0.65, 0.99), 2)
        ts = (datetime.now(timezone.utc) - timedelta(hours=random.randint(0, 168))).isoformat()
        
        det = {
            "detection_id": f"det_{uuid.uuid4().hex[:8]}",
            "camera_id": cam["camera_id"],
            "camera_name": cam["name"],
            "detection_type": dt,
            "confidence": conf,
            "lat": cam["lat"] + random.uniform(-0.01, 0.01),
            "lng": cam["lng"] + random.uniform(-0.01, 0.01),
            "location": cam["location"],
            "severity": sev,
            "timestamp": ts,
            "user_id": uid
        }
        await db.detections.insert_one(det)
        
        if sev in ["high", "critical"]:
            alert = {
                "alert_id": f"alert_{uuid.uuid4().hex[:8]}",
                "detection_id": det["detection_id"],
                "alert_type": dt,
                "message": f"{sev.upper()} {dt} detected on {cam['name']} (confidence: {conf:.0%})",
                "severity": sev,
                "acknowledged": random.choice([True, False]),
                "user_id": uid,
                "timestamp": ts
            }
            await db.alerts.insert_one(alert)
    
    return {"message": "Demo data seeded successfully"}

# Root health check
@api_router.get("/")
async def root():
    return {"message": "RoadSentinel AI API", "status": "running"}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
