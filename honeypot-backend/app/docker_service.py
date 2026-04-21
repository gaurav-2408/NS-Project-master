# app/docker_service.py
import docker
import logging
import os
import re
from typing import Dict, Any, Optional, List, Tuple
import time
from datetime import datetime

logger = logging.getLogger(__name__)

class DockerService:
    def __init__(self):
        try:
            self.client = docker.from_env()
            logger.info("Docker client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Docker client: {e}")
            raise

    def deploy_honeypot(self, honeypot_id: str, honeypot_type: str, port: str) -> Dict[str, Any]:
        """
        Deploy a honeypot container based on its type
        """
        try:
            # Select appropriate image and configuration based on type
            image, volumes, ports, environment = self._get_honeypot_config(honeypot_id, honeypot_type)
            
            # Create and start the container
            container = self.client.containers.run(
                image=image,
                name=f"honeypot-{honeypot_id}",
                ports=ports,
                environment=environment,
                volumes=volumes,
                detach=True,
                restart_policy={"Name": "unless-stopped"},
                labels={
                    "honeypot.id": honeypot_id,
                    "honeypot.type": honeypot_type
                }
            )
            
            # Wait briefly for container to start
            time.sleep(1)
            
            # Get container details
            container_info = self.client.api.inspect_container(container.id)
            
            # Get the mapped port
            mapped_port = None
            if container_info['NetworkSettings']['Ports']:
                for port_key, bindings in container_info['NetworkSettings']['Ports'].items():
                    if bindings:  # If port is bound
                        mapped_port = bindings[0]['HostPort']
                        break
            
            logger.info(f"Deployed honeypot container {container.id[:12]} for honeypot {honeypot_id}")
            
            return {
                "container_id": container.id,
                "mapped_port": mapped_port,
                "status": "active"
            }
            
        except Exception as e:
            logger.error(f"Failed to deploy honeypot container: {e}")
            return {
                "container_id": None,
                "mapped_port": None,
                "status": "error",
                "error": str(e)
            }
    
    def _get_honeypot_config(self, honeypot_id: str, honeypot_type: str) -> Tuple[str, Dict, Dict, Dict]:
        """Get honeypot container configuration based on type"""
        honeypot_type = honeypot_type.lower()
        
        if honeypot_type == "ssh":
            return (
                "cowrie/cowrie",
                {},  # No need for volume mounts as we'll extract logs directly
                {"2222/tcp": None},  # Will be mapped to a random port
                {
                    "COWRIE_TELNET_ENABLED": "yes",
                    "COWRIE_OUTPUT_JSONLOG_ENABLED": "yes"
                }
            )
        elif honeypot_type == "web":
            return (
                "vulnerables/web-dvwa",
                {},
                {"80/tcp": None},
                {
                    "MYSQL_PASS": "p@ssw0rd"
                }
            )
        elif honeypot_type == "ftp":
            return (
                "stilliard/pure-ftpd",
                {},
                {"21/tcp": None},
                {
                    "PUBLICHOST": "localhost",
                    "FTP_USER_NAME": "anonymous",
                    "FTP_USER_PASS": "anonymous",
                }
            )
        else:
            # Default to a simple Alpine container
            return (
                "alpine:latest",
                {},
                {f"{honeypot_type}/tcp": None},
                {}
            )

    def stop_honeypot(self, container_id: str) -> bool:
        """
        Stop and remove a honeypot container
        """
        try:
            container = self.client.containers.get(container_id)
            container.stop()
            container.remove()
            logger.info(f"Stopped and removed container {container_id[:12]}")
            return True
        except docker.errors.NotFound:
            logger.warning(f"Container {container_id[:12] if container_id else 'unknown'} not found")
            return True  # Consider it success if container doesn't exist
        except Exception as e:
            logger.error(f"Failed to stop container {container_id[:12] if container_id else 'unknown'}: {e}")
            return False

    def get_container_status(self, container_id: str) -> str:
        """
        Get the current status of a container
        """
        try:
            container = self.client.containers.get(container_id)
            return container.status
        except docker.errors.NotFound:
            return "not_found"
        except Exception as e:
            logger.error(f"Failed to get container status: {e}")
            return "unknown"

    def recover_containers(self) -> Dict[str, Dict[str, Any]]:
        """
        Find all honeypot containers and return their status
        Used after server restart to recover state
        """
        honeypot_containers = {}
        
        try:
            containers = self.client.containers.list(
                all=True,
                filters={"label": "honeypot.id"}
            )
            
            for container in containers:
                honeypot_id = container.labels.get("honeypot.id")
                if honeypot_id:
                    # Get mapped port
                    container_info = self.client.api.inspect_container(container.id)
                    mapped_port = None
                    
                    if container_info['NetworkSettings']['Ports']:
                        for port_key, bindings in container_info['NetworkSettings']['Ports'].items():
                            if bindings:
                                mapped_port = bindings[0]['HostPort']
                                break
                    
                    # Create entry for this honeypot
                    honeypot_containers[honeypot_id] = {
                        "container_id": container.id,
                        "status": "active" if container.status == "running" else "error",
                        "mapped_port": mapped_port,
                        "type": container.labels.get("honeypot.type", "unknown")
                    }
            
            logger.info(f"Recovered {len(honeypot_containers)} honeypot containers")
            return honeypot_containers
        
        except Exception as e:
            logger.error(f"Failed to recover honeypot containers: {e}")
            return {}

    def get_container_logs(self, container_id: str, tail: int = 200) -> str:
        """Get logs from a container"""
        try:
            container = self.client.containers.get(container_id)
            return container.logs(tail=tail).decode('utf-8', errors='ignore')
        except Exception as e:
            logger.error(f"Failed to get logs for container {container_id[:12]}: {e}")
            return ""

    def get_attacks_from_container(self, container_id: str, honeypot_id: str, honeypot_type: str) -> List[Dict[str, Any]]:
        """Extract attack information from container logs"""
        attacks = []
        
        try:
            logs = self.get_container_logs(container_id)
            
            
            if honeypot_type.lower() == "ssh":
                # Parse SSH honeypot logs (Cowrie)
                for line in logs.splitlines():
                    # Look for login attempts
                    login_match = re.search(r"login attempt \[b'([^']*)'/b'([^']*)'\] failed", line)
                    if login_match:
                        username, password = login_match.groups()
                        
                        # Extract source IP 
                        ip_match = re.search(r"HoneyPotSSHTransport,\d+,(\S+)", line)
                        source_ip = ip_match.group(1) if ip_match else "unknown"
                        
                        # Extract timestamp
                        time_match = re.search(r"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})", line)
                        timestamp = time_match.group(1) if time_match else datetime.now().isoformat()
                        
                        attacks.append({
                            "honeypot_id": honeypot_id,
                            "source_ip": source_ip,
                            "attack_type": "login_attempt",
                            "username": username,
                            "password": password,
                            "timestamp": timestamp,
                            "details": {"raw_log": line}
                        })
            
            elif honeypot_type.lower() == "web":
                # Parse Web honeypot logs
                for line in logs.splitlines():
                    # Look for HTTP requests
                    http_match = re.search(r'(\d+\.\d+\.\d+\.\d+).*"(GET|POST|PUT|DELETE) ([^ ]+)', line)
                    if http_match:
                        source_ip, method, path = http_match.groups()
                        
                        # Consider certain paths as attacks
                        is_attack = any(x in path.lower() for x in ['/admin', '/wp-login', '.php', 'script', 'eval'])
                        
                        if is_attack:
                            attacks.append({
                                "honeypot_id": honeypot_id,
                                "source_ip": source_ip,
                                "attack_type": "web_scan",
                                "timestamp": datetime.now().isoformat(),
                                "details": {"method": method, "path": path, "raw_log": line}
                            })
            
            elif honeypot_type.lower() == "ftp":
                # Parse FTP honeypot logs
                # First, try to extract info from the logs directly
                
                for line in logs.splitlines():
                    # Debug the actual log content to see what's available
                    logger.debug(f"FTP log line: {line}")
                    
                    
                    # Look for various FTP authentication patterns
                    if any(pattern in line.lower() for pattern in [
                        "authentication failed",
                        "user", 
                        "password required",
                        "unable to read",
                        "indexed puredb"
                    ]):
                        # Extract username - try various patterns
                        username = "unknown"
                        user_patterns = [
                            r'User\s+(\S+)\s+OK',   # Matches "User devraj OK"
                            r'User\s+(\S+)',        # Matches "User: username"
                            r'user\[([^\]]+)\]',    # Matches "user[username]"
                            r'username[=:\s]+(\S+)', # Matches "username: value"
                        ]
                        
                        for pattern in user_patterns:
                            user_match = re.search(pattern, line, re.IGNORECASE)
                            if user_match:
                                username = user_match.group(1)
                                break
                        
                        # Since actual connection IPs may not be in logs, create a fake "attack"
                        # This simulates someone trying to connect to your honeypot
                        attacks.append({
                            "honeypot_id": honeypot_id,
                            "source_ip": "127.0.0.1",  # Local connection
                            "attack_type": "ftp_login_attempt",
                            "username": username,
                            "timestamp": datetime.now().isoformat(),
                            "details": {"raw_log": line}
                        })
            
            logger.info(f"Extracted {len(attacks)} attacks from container {container_id[:12]}")
            return attacks
        
        except Exception as e:
            logger.error(f"Failed to extract attacks from container {container_id[:12]}: {e}")
            return []