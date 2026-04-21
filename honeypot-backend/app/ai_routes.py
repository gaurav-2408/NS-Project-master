# app/ai_routes.py
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, Dict, Any

from .ai_intelligence import AIThreatIntelligence
from .database import DatabaseService

router = APIRouter()
db_service = DatabaseService()
ai_intelligence = AIThreatIntelligence(db_service)

@router.get("/analysis")
async def get_attack_analysis(days: int = 7, honeypot_id: Optional[str] = None) -> Dict[str, Any]:
    """Get AI analysis of recent attacks"""
    if days <= 0 or days > 90:
        raise HTTPException(status_code=400, detail="Days parameter must be between 1 and 90")
        
    analysis = await ai_intelligence.analyze_recent_attacks(days=days, honeypot_id=honeypot_id)
    
    if "error" in analysis:
        raise HTTPException(status_code=500, detail=analysis["error"])
        
    return analysis

@router.get("/recommendations")
async def get_security_recommendations(honeypot_id: Optional[str] = None) -> Dict[str, Any]:
    """Get AI-powered security recommendations"""
    recommendations = await ai_intelligence.get_recommendations(honeypot_id=honeypot_id)
    
    if "error" in recommendations:
        raise HTTPException(status_code=500, detail=recommendations["error"])
        
    return recommendations