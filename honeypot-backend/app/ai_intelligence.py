# app/ai_intelligence.py
import os
import json
import random
import time
from typing import Dict, List, Any, Optional
import google.generativeai as genai
from datetime import datetime, timedelta
import logging

from .database import DatabaseService

logger = logging.getLogger(__name__)

# Custom JSON encoder for datetime objects
class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

class AIThreatIntelligence:
    """AI-powered threat intelligence with smart rate limiting"""
    
    def __init__(self, db_service: DatabaseService):
        self.db_service = db_service
        self.api_key = os.environ.get("GEMINI_API_KEY")
        
        # Smart caching with expiration
        self._cache = {}
        
        # Rate limiting
        self.call_history = []
        self.backoff_until = 0
        self.max_calls_per_minute = 2
        
        # Configure Gemini
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')  # Less expensive model
            logger.info("Initialized Gemini API")
        else:
            logger.warning("GEMINI_API_KEY not found")
            self.model = None
    
    def _check_rate_limit(self):
        """Smart rate limiting with exponential backoff"""
        current_time = time.time()
        
        # If in backoff period, respect it
        if current_time < self.backoff_until:
            wait_time = round(self.backoff_until - current_time)
            return False, f"Rate limited. Try again in {wait_time} seconds"
        
        # Clean old calls from history
        self.call_history = [t for t in self.call_history if (current_time - t) < 60]
        
        # Check if we've exceeded our rate limit
        if len(self.call_history) >= self.max_calls_per_minute:
            # Implement exponential backoff
            backoff_time = min(30 * (2 ** (len(self.call_history) - self.max_calls_per_minute)), 1800)
            self.backoff_until = current_time + backoff_time
            return False, f"Rate limit exceeded. Try again in {backoff_time} seconds"
        
        # Record this call attempt
        self.call_history.append(current_time)
        return True, "OK"
    
    def _get_cached_response(self, cache_key):
        """Get cached response if available and not expired"""
        if cache_key in self._cache:
            item = self._cache[cache_key]
            if time.time() < item['expires']:
                return item['data']
        return None
    
    def _cache_response(self, cache_key, data, ttl=3600):
        """Cache a response with expiration"""
        self._cache[cache_key] = {
            'data': data,
            'expires': time.time() + ttl
        }
    
    async def analyze_recent_attacks(self, days: int = 7, honeypot_id: Optional[str] = None) -> Dict[str, Any]:
        """Analyze recent attacks with smart caching and rate limiting"""
        # Create cache key based on parameters
        cache_key = f"analysis_{days}_{honeypot_id if honeypot_id else 'all'}"
        
        # Check cache first
        
        cached = self._get_cached_response(cache_key)
        if cached:
            return cached
        
        # Check rate limits
        can_proceed, message = self._check_rate_limit()
        if not can_proceed:
            return {"error": message, "try_again": True}
            
        try:
            # Get attack data
            attacks = self.db_service.get_attacks(limit=30)
            
            if not attacks:
                return {"error": "No attacks to analyze"}
                
            # Process only a sample to reduce data size
            attack_sample = attacks[:15]  
            attack_data = []
            
            # Prepare simplified data for the AI
            attack_types = {}
            source_ips = {}
            timestamps = []
            
            for attack in attack_sample:
                # Track stats instead of sending full objects
                attack_type = attack.attack_type
                attack_types[attack_type] = attack_types.get(attack_type, 0) + 1
                
                source_ip = attack.source_ip
                source_ips[source_ip] = source_ips.get(source_ip, 0) + 1
                
                timestamps.append(attack.timestamp.isoformat())
            
            # Simplified data structure
            analysis_data = {
                "total_attacks": len(attacks),
                "sample_size": len(attack_sample),
                "attack_type_distribution": attack_types,
                "source_ip_frequency": dict(list(source_ips.items())[:10]),  # Top 10 sources
                "time_range": {
                    "oldest": min(timestamps) if timestamps else None,
                    "newest": max(timestamps) if timestamps else None
                }
            }
            
            # Create prompt
            prompt = f"""As a cybersecurity analyst, provide a brief analysis of honeypot attack data:

{json.dumps(analysis_data, indent=2)}

Focus on identifying patterns, potential threats, and providing 3-5 key insights.
Keep your analysis concise (under 250 words) and focused on actionable information."""
            
            # Call Gemini API
            response = self.model.generate_content(prompt)
            analysis = response.text
            
            # Prepare result
            result = {
                "analysis": analysis,
                "attack_count": len(attacks),
                "time_period_days": days,
                "timestamp": datetime.now().isoformat()
            }
            
            # Cache the result (24 hours)
            self._cache_response(cache_key, result, ttl=86400)
            
            return result
            
        except Exception as e:
            logger.error(f"Error in analysis: {str(e)}")
            return {"error": f"AI analysis failed: {str(e)}"}
    
    # app/ai_intelligence.py
    async def get_recommendations(self, honeypot_id: Optional[str] = None) -> Dict[str, Any]:
        """Get security recommendations with safe honeypot data access"""
        try:
            honeypot_data = {}
            
            if honeypot_id:
                honeypot = self.db_service.get_honeypot(honeypot_id)
                if not honeypot:
                    return {"error": "Honeypot not found"}
                
                # Safe attribute extraction with multiple fallbacks
                # Try converting to dict first if available
                if hasattr(honeypot, "dict") and callable(getattr(honeypot, "dict")):
                    honeypot_dict = honeypot.dict()
                    honeypot_data = {
                        "name": honeypot_dict.get("name", "unknown"),
                        # Try different field names for type
                        "type": honeypot_dict.get("type", 
                            honeypot_dict.get("honeypot_type", 
                            honeypot_dict.get("service_type", "unknown"))),
                        "port": honeypot_dict.get("port", "unknown")
                    }
                else:
                    # Direct attribute access with safe fallbacks
                    honeypot_data = {
                        "name": getattr(honeypot, "name", "unknown"),
                        "port": getattr(honeypot, "port", "unknown")
                    }
                    
                    # Try different possible attributes for honeypot type
                    for attr in ["type", "honeypot_type", "pot_type", "service_type"]:
                        if hasattr(honeypot, attr):
                            honeypot_data["type"] = getattr(honeypot, attr)
                            break
                    if "type" not in honeypot_data:
                        honeypot_data["type"] = "unknown"
            else:
                honeypot_data = {"type": "general"}
            
            # Create prompt with available honeypot info
            prompt = f"""As a security expert, provide 3-4 specific recommendations for this honeypot:
            {json.dumps(honeypot_data, cls=DateTimeEncoder)}
            
            Focus on practical security enhancements for this specific honeypot type.
            Format as bullet points and keep under 200 words."""
            
            response = self.model.generate_content(prompt)
            
            return {
                "recommendations": response.text,
                "honeypot_id": honeypot_id,
                "honeypot_info": honeypot_data,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error generating recommendations: {str(e)}")
            return {"error": f"Failed to generate recommendations: {str(e)}"}