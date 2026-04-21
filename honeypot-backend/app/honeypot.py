# app/honeypot.py
from fastapi import APIRouter, HTTPException, Depends, Query, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any, Optional
import logging
import asyncio
import uuid
from datetime import datetime

from .models import Honeypot, HoneypotCreate, Attack, AttackList
from .docker_service import DockerService
from .database import DatabaseService
from .auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize services
docker_service = DockerService()
db_service = DatabaseService()

# WebSocket connections for real-time attack notifications
active_connections: set = set()

@router.post("/honeypots", response_model=Honeypot)
async def create_honeypot(honeypot: HoneypotCreate):
    """
    Create a new honeypot configuration
    """
    new_honeypot = Honeypot(**honeypot.dict())
    db_service.create_honeypot(new_honeypot)
    logger.info(f"Created honeypot: {new_honeypot.id}")
    return new_honeypot

@router.get("/honeypots", response_model=List[Honeypot])
async def get_honeypots():
    """
    Get all honeypots
    """
    return db_service.get_all_honeypots()

@router.get("/honeypots/{honeypot_id}", response_model=Honeypot)
async def get_honeypot(honeypot_id: str):
    """
    Get a specific honeypot by ID
    """
    honeypot = db_service.get_honeypot(honeypot_id)
    if not honeypot:
        raise HTTPException(status_code=404, detail="Honeypot not found")
    return honeypot

@router.post("/honeypots/{honeypot_id}/deploy", response_model=Honeypot)
async def deploy_honeypot(honeypot_id: str):
    """
    Deploy a honeypot as a Docker container
    """
    honeypot = db_service.get_honeypot(honeypot_id)
    if not honeypot:
        raise HTTPException(status_code=404, detail="Honeypot not found")
    
    # Skip if already active
    if honeypot.status == "active":
        return honeypot
    
    # Deploy the container
    result = docker_service.deploy_honeypot(
        honeypot_id=honeypot.id,
        honeypot_type=honeypot.type,
        port=honeypot.port
    )
    
    # Update honeypot with container info
    honeypot.status = result["status"]
    honeypot.container_id = result.get("container_id")
    honeypot.mapped_port = result.get("mapped_port")
    
    # Update in database
    db_service.update_honeypot(honeypot)
    
    logger.info(f"Deployed honeypot {honeypot_id} with status {honeypot.status}")
    return honeypot

@router.delete("/honeypots/{honeypot_id}")
async def delete_honeypot(honeypot_id: str):
    """
    Delete a honeypot and stop its container if running
    """
    honeypot = db_service.get_honeypot(honeypot_id)
    if not honeypot:
        raise HTTPException(status_code=404, detail="Honeypot not found")
    
    # Stop the container if it exists
    if honeypot.container_id:
        docker_service.stop_honeypot(honeypot.container_id)
    
    # Remove from database
    db_service.delete_honeypot(honeypot_id)
    
    return {"success": True}

@router.get("/honeypots/{honeypot_id}/attacks", response_model=AttackList)
async def get_honeypot_attacks(
        honeypot_id: str, 
        limit: int = Query(50, ge=1, le=1000),
        offset: int = Query(0, ge=0)
    ):
        """
        Get attacks for a specific honeypot
        """
        logger.info(f"Retrieving attacks for honeypot {honeypot_id}, limit={limit}, offset={offset}")
        
        # Check if honeypot exists
        honeypot = db_service.get_honeypot(honeypot_id)
        if not honeypot:
            logger.warning(f"Honeypot {honeypot_id} not found")
            raise HTTPException(status_code=404, detail="Honeypot not found")
        
        # Get attacks from database
        attacks = db_service.get_attacks(honeypot_id=honeypot_id, limit=limit, offset=offset)
        logger.info(f"Retrieved {len(attacks)} attacks for honeypot {honeypot_id}")
        
        # Create the response with both attacks and total count
        return AttackList(attacks=attacks, total=len(attacks))
    
@router.post("/honeypots/{honeypot_id}/sync-attacks")
async def sync_attacks(honeypot_id: str):
    """
    Sync attacks from container logs to database
    """
    # Check if honeypot exists
    honeypot = db_service.get_honeypot(honeypot_id)
    if not honeypot:
        raise HTTPException(status_code=404, detail="Honeypot not found")
    
    # Check if honeypot is active and has a container
    if honeypot.status != "active" or not honeypot.container_id:
        raise HTTPException(status_code=400, detail="Honeypot is not active")
    
    # Get attacks from container logs
    attacks_data = docker_service.get_attacks_from_container(
        honeypot.container_id, 
        honeypot_id,
        honeypot.type
    )
    
    # Save attacks to database
    new_attacks = 0
    for attack_data in attacks_data:
        # Create attack object
        attack = Attack(
            id=str(uuid.uuid4()),
            honeypot_id=attack_data["honeypot_id"],
            source_ip=attack_data["source_ip"],
            attack_type=attack_data["attack_type"],
            username=attack_data.get("username"),
            password=attack_data.get("password"),
            timestamp=datetime.fromisoformat(attack_data["timestamp"]) 
                if isinstance(attack_data["timestamp"], str) else attack_data["timestamp"],
            details=attack_data.get("details", {})
        )
        
        # Save to database
        db_service.save_attack(attack)
        new_attacks += 1
        
        # Notify WebSocket clients
        if active_connections:
            for connection in list(active_connections):
                try:
                    await connection.send_json(attack.dict())
                except Exception:
                    active_connections.discard(connection)
    
    # Update honeypot count
    honeypot = db_service.get_honeypot(honeypot_id)
    
    return {
        "success": True,
        "new_attacks": new_attacks,
        "total_attacks": honeypot.attack_count
    }

@router.get("/attacks", response_model=AttackList)
async def get_all_attacks(
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """
    Get all attacks
    """
    attacks = db_service.get_attacks(limit=limit, offset=offset)
    return AttackList(attacks=attacks)

@router.get("/attacks/stats")
async def get_attack_statistics(days: int = Query(7, ge=1, le=30)):
    """
    Get attack statistics
    """
    return db_service.get_attack_stats(days=days)

@router.post("/recover")
async def recover_honeypots():
    """
    Recover honeypot states from Docker after server restart
    """
    try:
        # Get running containers
        containers = docker_service.recover_containers()
        
        # Get all honeypots from database
        honeypots = db_service.get_all_honeypots()
        
        updated_count = 0
        for honeypot in honeypots:
            if honeypot.id in containers:
                # Update honeypot with container info
                container_info = containers[honeypot.id]
                honeypot.container_id = container_info["container_id"]
                honeypot.status = container_info["status"]
                honeypot.mapped_port = container_info["mapped_port"]
                
                # Update in database
                db_service.update_honeypot(honeypot)
                updated_count += 1
            elif honeypot.status == "active":
                # Honeypot was active but container is gone
                honeypot.status = "error"
                honeypot.container_id = None
                honeypot.mapped_port = None
                
                # Update in database
                db_service.update_honeypot(honeypot)
        
        return {
            "recovered": updated_count,
            "total": len(honeypots)
        }
    except Exception as e:
        logger.error(f"Failed to recover honeypots: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to recover honeypots: {str(e)}")

@router.websocket("/ws/attacks")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket for real-time attack notifications
    """
    await websocket.accept()
    active_connections.add(websocket)
    
    try:
        while True:
            # Keep connection alive with ping/pong
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.discard(websocket)

@router.post("/test/add-attack", response_model=Attack)
async def add_test_attack(honeypot_id: str):
    """
    Add a test attack for development purposes
    """
    # Check if honeypot exists
    honeypot = db_service.get_honeypot(honeypot_id)
    if not honeypot:
        raise HTTPException(status_code=404, detail="Honeypot not found")
    
    # Create a test attack
    attack = Attack(
        honeypot_id=honeypot_id,
        source_ip="192.168.1.100",
        attack_type="test_attack",
        username="test_user",
        password="test_password",
        details={"note": "This is a test attack"}
    )
    
    # Save to database
    db_service.save_attack(attack)
    
    # Notify WebSocket clients
    if active_connections:
        for connection in list(active_connections):
            try:
                await connection.send_json(attack.dict())
            except Exception:
                active_connections.discard(connection)
    
    return attack

@router.get("/honeypots/{honeypot_id}/attack-stats")
async def get_honeypot_attack_stats(honeypot_id: str, days: int = Query(7, ge=1, le=30)):
    """
    Get attack statistics for a specific honeypot
    """
    # Check if honeypot exists
    honeypot = db_service.get_honeypot(honeypot_id)
    if not honeypot:
        raise HTTPException(status_code=404, detail="Honeypot not found")
    
    # Get attacks for this honeypot
    all_attacks = db_service.get_attacks(honeypot_id=honeypot_id, limit=1000)
    
    # Calculate cutoff time (days ago)
    cutoff = datetime.now().timestamp() - (days * 86400)
    
    # Filter to recent attacks only
    recent_attacks = [a for a in all_attacks if a.timestamp.timestamp() > cutoff]
    
    # Group by day
    attacks_by_day = {}
    for attack in recent_attacks:
        day = attack.timestamp.strftime("%Y-%m-%d")
        if day not in attacks_by_day:
            attacks_by_day[day] = 0
        attacks_by_day[day] += 1
    
    # Group by hour (for last 24 hours)
    hourly_cutoff = datetime.now().timestamp() - 86400
    recent_hourly = [a for a in all_attacks if a.timestamp.timestamp() > hourly_cutoff]
    attacks_by_hour = {}
    for attack in recent_hourly:
        hour = attack.timestamp.strftime("%Y-%m-%d %H:00")
        if hour not in attacks_by_hour:
            attacks_by_hour[hour] = 0
        attacks_by_hour[hour] += 1
    
    return {
        "total": len(recent_attacks),
        "by_day": attacks_by_day,
        "by_hour": attacks_by_hour
    }
    
@router.get("/attacks", response_model=AttackList)
async def get_all_attacks(
        limit: int = Query(50, ge=1, le=1000),
        offset: int = Query(0, ge=0),
        honeypot_id: Optional[str] = None
    ):
        """
        Get all attacks or filter by honeypot_id
        """
        attacks = db_service.get_attacks(
            honeypot_id=honeypot_id, 
            limit=limit, 
            offset=offset
        )
        
        return AttackList(attacks=attacks, total=len(attacks))
    

@router.post("/simulate-attack")
async def simulate_attack(request):
    """
    Simulate an attack against a honeypot for testing purposes
    """
    honeypot = db_service.get_honeypot(request.honeypot_id)
    if not honeypot:
        raise HTTPException(status_code=404, detail="Honeypot not found")
        
    # Generate a unique ID for the attack
    attack_id = str(uuid.uuid4())
    
    # Set timestamp if not provided
    timestamp = request.timestamp if request.timestamp else datetime.now().isoformat()
    
    # Generate random source IP if not provided
    source_ip = request.source_ip
    if not source_ip:
        import random
        source_ip = f"{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
    
    # Generate username and password for login_attempt if not provided
    username = request.username
    password = request.password
    if request.attack_type == "login_attempt" and not username:
        usernames = ["admin", "root", "user", "guest", "administrator", "test"]
        passwords = ["password", "123456", "admin", "root", "qwerty", "letmein"]
        username = username or usernames[random.randint(0, len(usernames) - 1)]
        password = password or passwords[random.randint(0, len(passwords) - 1)]
    
    # Create raw log for login attempts
    raw_log = None
    if request.attack_type == "login_attempt":
        raw_log = f"{timestamp} [HoneyPotSSHTransport,0,{source_ip}] login attempt [b'{username}'/b'{password}'] failed"
    
    # Create the attack record
    attack_record = {
        "id": attack_id,
        "honeypot_id": request.honeypot_id,
        "timestamp": timestamp,
        "source_ip": source_ip,
        "attack_type": request.attack_type,
        "username": username,
        "password": password,
        "details": {
            "raw_log": raw_log,
            "simulated": True
        },
        "attack_hash": db_service._get_attack_hash({
            "honeypot_id": request.honeypot_id,
            "source_ip": source_ip,
            "attack_type": request.attack_type,
            "username": username,
            "password": password,
            "timestamp": timestamp
        })
    }
    
    # Save the attack
    db_service.save_attack_raw(attack_record)
    
    # Broadcast via WebSocket if applicable
    if websocket_manager:
        await websocket_manager.broadcast_json({
            "type": "attack",
            "data": attack_record
        })
    
    return {"success": True, "attack_id": attack_id}