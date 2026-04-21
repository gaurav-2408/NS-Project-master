# app/models.py
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    email: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class HoneypotBase(BaseModel):
    name: str
    type: str
    ip_address: str
    port: str
    emulated_system: Optional[str] = None
    description: Optional[str] = None

class HoneypotCreate(HoneypotBase):
    pass

class Honeypot(HoneypotBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "created"  # created, active, error
    attack_count: int = 0
    created_at: datetime = Field(default_factory=datetime.now)
    container_id: Optional[str] = None
    mapped_port: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class Attack(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    honeypot_id: str
    timestamp: datetime = Field(default_factory=datetime.now)
    source_ip: str
    attack_type: str
    username: Optional[str] = None
    password: Optional[str] = None
    details: Dict[str, Any] = {}
    attack_hash: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class AttackList(BaseModel):
    attacks: List[Attack]