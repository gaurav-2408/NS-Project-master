# app/main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import logging
import asyncio
import os
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

from .honeypot import router as honeypot_router
from .simulation_api import router as simulation_router
from .ai_routes import router as ai_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Honeypot Orchestrator API",
    description="API for managing honeypot deployments and tracking attacks",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, limit this to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(honeypot_router, tags=["honeypots"])
app.include_router(simulation_router, tags=["simulations"])
app.include_router(ai_router, prefix="/ai", tags=["ai"])


# Sync task for background attack detection
async def periodic_attack_sync():
    """Periodically sync attacks from all active honeypots"""
    from .docker_service import DockerService
    from .database import DatabaseService
    from .models import Attack
    import uuid
    
    docker_service = DockerService()
    db_service = DatabaseService()
    
    while True:
        try:
            # Get all active honeypots
            honeypots = db_service.get_all_honeypots()
            active_honeypots = [h for h in honeypots if h.status == "active" and h.container_id]
            
            for honeypot in active_honeypots:
                try:
                    # Extract attacks from container logs
                    attacks_data = docker_service.get_attacks_from_container(
                        honeypot.container_id, 
                        honeypot.id,
                        honeypot.type
                    )
                    
                    # Save new attacks to database (with deduplication)
                    new_attack_count = 0
                    for attack_data in attacks_data:
                        # Skip if this attack already exists
                        if db_service.attack_exists(attack_data):
                            continue
                        
                        # Parse the timestamp correctly
                        try:
                            attack_timestamp = datetime.fromisoformat(attack_data["timestamp"])
                        except (ValueError, TypeError):
                            attack_timestamp = datetime.now()
                        
                        # Create a hash for this attack
                        attack_hash = db_service._get_attack_hash(attack_data)
                        
                        attack = Attack(
                            id=str(uuid.uuid4()),
                            honeypot_id=attack_data["honeypot_id"],
                            source_ip=attack_data["source_ip"],
                            attack_type=attack_data["attack_type"],
                            username=attack_data.get("username"),
                            password=attack_data.get("password"),
                            timestamp=attack_timestamp,
                            details=attack_data.get("details", {}),
                            attack_hash=attack_hash  # Add the hash
                        )
                        
                        # Save to database (will skip if duplicate)
                        saved_attack = db_service.save_attack(attack)
                        if saved_attack:
                            new_attack_count += 1
                            
                            # Notify WebSocket clients
                            from .honeypot import active_connections
                            if active_connections:
                                for connection in list(active_connections):
                                    try:
                                        await connection.send_json(attack.dict())
                                    except Exception:
                                        pass
                    
                    if new_attack_count > 0:
                        logger.info(f"Added {new_attack_count} new attacks for honeypot {honeypot.id}")
                    else:
                        logger.debug(f"No new attacks for honeypot {honeypot.id}")
                        
                except Exception as e:
                    logger.error(f"Error syncing attacks for honeypot {honeypot.id}: {e}")
            
            # Wait before next sync
            await asyncio.sleep(30)
            
        except Exception as e:
            logger.error(f"Error in periodic attack sync: {e}")
            await asyncio.sleep(60)

@app.on_event("startup")
async def startup_event():
    """Run when the application starts"""
    logger.info("Starting Honeypot Orchestrator API")
    
    # Create required directories
    os.makedirs("./data", exist_ok=True)
    
    # Recover honeypot states
    try:
        from .honeypot import recover_honeypots
        await recover_honeypots()
    except Exception as e:
        logger.error(f"Failed to recover honeypots on startup: {e}")
    
    # Start background attack sync
    asyncio.create_task(periodic_attack_sync())

@app.on_event("shutdown")
async def shutdown_event():
    """Run when the application shuts down"""
    logger.info("Shutting down Honeypot Orchestrator API")

@app.get("/", tags=["health"])
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "time": datetime.now().isoformat()}