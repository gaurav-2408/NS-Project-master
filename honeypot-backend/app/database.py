# app/database.py
import os
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from .models import Honeypot, Attack, User
import hashlib


logger = logging.getLogger(__name__)

class DatabaseService:
    """Simple file-based database for honeypots and attacks"""
    
    def __init__(self, data_dir="./data"):
        self.data_dir = data_dir
        self.honeypots_file = os.path.join(data_dir, "honeypots.json")
        self.attacks_file = os.path.join(data_dir, "attacks.json")
        
        # Create data directory if needed
        os.makedirs(data_dir, exist_ok=True)
        
        # Initialize empty files if they don't exist
        if not os.path.exists(self.honeypots_file):
            self._save_data(self.honeypots_file, {})
            
        if not os.path.exists(self.attacks_file):
            self._save_data(self.attacks_file, {})
    
    def _load_data(self, file_path):
        """Load data from a JSON file"""
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            logger.error(f"Failed to load data from {file_path}: {e}")
            return {}
    
    def _save_data(self, file_path, data):
        """Save data to a JSON file"""
        try:
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            return True
        except Exception as e:
            logger.error(f"Failed to save data to {file_path}: {e}")
            return False
    def _get_attack_hash(self, attack_data):
        """Create a unique hash for an attack to prevent duplicates"""
        # Create a string with all the unique identifiers of this attack
        unique_str = (
            f"{attack_data.get('honeypot_id', '')}"
            f"{attack_data.get('source_ip', '')}"
            f"{attack_data.get('attack_type', '')}"
            f"{attack_data.get('username', '')}"
            f"{attack_data.get('password', '')}"
            f"{str(attack_data.get('details', {}))}"
        )
        # Create a hash of this string
        return hashlib.md5(unique_str.encode()).hexdigest()
    
    # Honeypot operations
    def get_all_honeypots(self) -> List[Honeypot]:
        """Get all honeypots"""
        data = self._load_data(self.honeypots_file)
        return [Honeypot.parse_obj(h) for h in data.values()]
    
    def get_honeypot(self, honeypot_id: str) -> Optional[Honeypot]:
        """Get a specific honeypot by ID"""
        data = self._load_data(self.honeypots_file)
        honeypot_data = data.get(honeypot_id)
        return Honeypot.parse_obj(honeypot_data) if honeypot_data else None
    
    def create_honeypot(self, honeypot: Honeypot) -> Honeypot:
        """Save a new honeypot"""
        data = self._load_data(self.honeypots_file)
        data[honeypot.id] = honeypot.dict()
        self._save_data(self.honeypots_file, data)
        return honeypot
    
    def update_honeypot(self, honeypot: Honeypot) -> Honeypot:
        """Update an existing honeypot"""
        data = self._load_data(self.honeypots_file)
        data[honeypot.id] = honeypot.dict()
        self._save_data(self.honeypots_file, data)
        return honeypot
    
    def delete_honeypot(self, honeypot_id: str) -> bool:
        """Delete a honeypot"""
        data = self._load_data(self.honeypots_file)
        if honeypot_id in data:
            del data[honeypot_id]
            self._save_data(self.honeypots_file, data)
            return True
        return False
    
    def increment_attack_count(self, honeypot_id: str) -> bool:
        """Increment the attack count for a honeypot"""
        data = self._load_data(self.honeypots_file)
        if honeypot_id in data:
            data[honeypot_id]["attack_count"] = data[honeypot_id].get("attack_count", 0) + 1
            self._save_data(self.honeypots_file, data)
            return True
        return False

    # Attack operations
    def attack_exists(self, attack_data):
        """Check if an attack with the same signature already exists"""
        attack_hash = self._get_attack_hash(attack_data)
        
        data = self._load_data(self.attacks_file)
        
        for attack in data.values():
            if attack.get("attack_hash") == attack_hash:
                return True
        
        return False
    def get_attacks(self, honeypot_id: Optional[str] = None, 
                   limit: int = 100, offset: int = 0) -> List[Attack]:
        """Get attacks, optionally filtered by honeypot ID"""
        data = self._load_data(self.attacks_file)
        
        attacks = []
        for attack_data in data.values():
            if honeypot_id is None or attack_data.get("honeypot_id") == honeypot_id:
                attacks.append(Attack.parse_obj(attack_data))
        
        # Sort by timestamp (newest first)
        attacks.sort(key=lambda a: a.timestamp, reverse=True)
        
        # Apply limit and offset
        return attacks[offset:offset+limit]
    
    def get_attack(self, attack_id: str) -> Optional[Attack]:
        """Get a specific attack by ID"""
        data = self._load_data(self.attacks_file)
        attack_data = data.get(attack_id)
        return Attack.parse_obj(attack_data) if attack_data else None
    
    def save_attack(self, attack):
        """Save an attack and increment honeypot attack count"""
        # First check if attack has a hash, if not generate one
        if not attack.dict().get("attack_hash"):
            attack_hash = self._get_attack_hash(attack.dict())
            # Add the hash to the attack object
            attack.attack_hash = attack_hash
        
        # Check if this attack already exists
        if self.attack_exists(attack.dict()):
            return None  # Skip saving duplicates
        
        # Save the attack
        data = self._load_data(self.attacks_file)
        data[attack.id] = attack.dict()
        self._save_data(self.attacks_file, data)
        
        # Increment the honeypot's attack count
        self.increment_attack_count(attack.honeypot_id)
        
        return attack
    
    def get_attack_stats(self, days: int = 7) -> Dict[str, Any]:
        """Get attack statistics"""
        attacks = self.get_attacks(limit=1000)  # Get a large sample
        
        # Calculate cutoff time
        cutoff = datetime.now().timestamp() - (days * 86400)
        
        # Filter to recent attacks only
        recent_attacks = [a for a in attacks if a.timestamp.timestamp() > cutoff]
        
        # Count by type
        attack_types = {}
        for attack in recent_attacks:
            attack_types[attack.attack_type] = attack_types.get(attack.attack_type, 0) + 1
        
        # Count by honeypot
        honeypot_attacks = {}
        for attack in recent_attacks:
            honeypot_attacks[attack.honeypot_id] = honeypot_attacks.get(attack.honeypot_id, 0) + 1
        
        # Group by day
        daily_attacks = {}
        for attack in recent_attacks:
            day = attack.timestamp.strftime("%Y-%m-%d")
            daily_attacks[day] = daily_attacks.get(day, 0) + 1
        
        return {
            "total": len(recent_attacks),
            "by_type": attack_types,
            "by_honeypot": honeypot_attacks,
            "daily": daily_attacks
        }
