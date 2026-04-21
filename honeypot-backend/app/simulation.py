# app/simulation.py
import asyncio
import random
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
from .models import Attack, Honeypot

class AttackSimulation:
    """Attack simulation manager that integrates with your database"""
    
    def __init__(self, db_service):
        self.db_service = db_service
        self.active_simulations = {}
        
    async def simulate_login_attack(self, honeypot_id: str, count: int = 1, delay: float = 1.0, complexity: str = "basic"):
        """Simulate SSH login attempts"""
        
        # User/password pools of increasing complexity
        user_pools = {
            "basic": ["admin", "root", "user", "guest", "test"],
            "moderate": ["admin", "root", "user", "guest", "test", "oracle", "support", "ubuntu"],
            "advanced": ["admin", "root", "user", "guest", "test", "oracle", "support", "ubuntu", 
                       "administrator", "postgres", "mysql", "ftpuser", "webadmin"]
        }
        
        password_pools = {
            "basic": ["password", "123456", "admin", "root", "qwerty"],
            "moderate": ["password", "123456", "admin", "root", "qwerty", "welcome", "password123"],
            "advanced": ["password", "123456", "admin", "root", "qwerty", "welcome", "password123", 
                       "changeme", "P@ssw0rd", "admin@123", "Admin2023", "r00tme"]
        }
        
        # Select the appropriate complexity pools
        usernames = user_pools.get(complexity, user_pools["basic"])
        passwords = password_pools.get(complexity, password_pools["basic"])
        
        attacks_sent = 0
        
        for _ in range(count):
            username = random.choice(usernames)
            password = random.choice(passwords)
            source_ip = f"{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}]"
            
            # Create attack record using your model
            attack_id = str(uuid.uuid4())
            timestamp = datetime.now()
            
            # Format raw log similar to your existing format
            raw_log = f"{timestamp.isoformat()} [HoneyPotSSHTransport,0,{source_ip}] login attempt [b'{username}'/b'{password}'] failed"
            
            # Generate attack hash
            attack_data = {
                "id": attack_id,
                "honeypot_id": honeypot_id,
                "timestamp": timestamp,
                "source_ip": source_ip,
                "attack_type": "login_attempt",
                "username": username,
                "password": password,
                "details": {
                    "raw_log": raw_log,
                    "simulated": True
                }
            }
            
            # Add attack hash
            attack_hash = self.db_service._get_attack_hash(attack_data)
            attack_data["attack_hash"] = attack_hash
            
            # Create Attack object using your Pydantic model
            try:
                attack = Attack(**attack_data)
                
                # Save attack if it doesn't exist already
                if not self.db_service.attack_exists(attack_data):
                    self.db_service.save_attack(attack)
                    attacks_sent += 1
            except Exception as e:
                print(f"Failed to save simulated attack: {str(e)}")
            
            # Delay between attacks
            await asyncio.sleep(delay)
        
        return attacks_sent
                
    async def run_attack_simulation(self, honeypot_id: str, attack_rate: int, duration_minutes: int, complexity: str = "basic"):
        """Run a complete attack simulation"""
        
        # Validate honeypot exists
        honeypot = self.db_service.get_honeypot(honeypot_id)
        if not honeypot:
            return {"success": False, "error": "Honeypot not found"}
        
        # Calculate parameters
        delay_between_attacks = 60 / max(1, attack_rate)  # In seconds
        total_attacks = int(attack_rate * duration_minutes)
        
        # Run simulation
        start_time = datetime.now()
        
        simulation_id = str(uuid.uuid4())
        self.active_simulations[simulation_id] = {
            "id": simulation_id,
            "honeypot_id": honeypot_id,
            "honeypot_name": honeypot.name,
            "start_time": start_time.isoformat(),
            "status": "running",
            "attack_count": 0,
            "target_count": total_attacks,
        }
        
        # Start simulation in background
        asyncio.create_task(self._run_simulation_task(
            simulation_id=simulation_id,
            honeypot_id=honeypot_id, 
            total_attacks=total_attacks,
            delay=delay_between_attacks,
            complexity=complexity
        ))
        
        return {
            "success": True,
            "simulation_id": simulation_id,
            "start_time": start_time.isoformat(),
            "estimated_duration_seconds": total_attacks * delay_between_attacks,
            "target_attacks": total_attacks
        }
    
    async def _run_simulation_task(self, simulation_id: str, honeypot_id: str, 
                                 total_attacks: int, delay: float, complexity: str = "basic"):
        """Background task to run simulation"""
        attack_count = 0
        
        try:
            for i in range(total_attacks):
                # Generate an attack
                attack_sent = await self.simulate_login_attack(
                    honeypot_id=honeypot_id, 
                    count=1, 
                    delay=0, 
                    complexity=complexity
                )
                
                if attack_sent > 0:
                    attack_count += 1
                
                # Update simulation status
                if simulation_id in self.active_simulations:
                    self.active_simulations[simulation_id]["attack_count"] = attack_count
                
                # Sleep between attacks
                await asyncio.sleep(delay)
                
                # Break if we've been canceled
                if simulation_id in self.active_simulations and \
                   self.active_simulations[simulation_id].get("status") == "canceled":
                    break
                
            # Mark simulation as complete
            if simulation_id in self.active_simulations:
                self.active_simulations[simulation_id]["status"] = "completed"
                self.active_simulations[simulation_id]["end_time"] = datetime.now().isoformat()
                
        except Exception as e:
            # Handle errors
            if simulation_id in self.active_simulations:
                self.active_simulations[simulation_id]["status"] = "failed"
                self.active_simulations[simulation_id]["error"] = str(e)
            print(f"Simulation error: {str(e)}")
    
    def get_simulation_status(self, simulation_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a simulation by ID"""
        return self.active_simulations.get(simulation_id)
    
    def get_all_simulations(self) -> List[Dict[str, Any]]:
        """Get all simulations"""
        return list(self.active_simulations.values())