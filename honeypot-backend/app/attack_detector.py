# app/attack_detector.py
import os
import re
import json
import time
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable
import threading
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileModifiedEvent

logger = logging.getLogger(__name__)

class AttackEvent:
    def __init__(self, honeypot_id, source_ip, attack_type, details):
        self.honeypot_id = honeypot_id
        self.source_ip = source_ip
        self.attack_type = attack_type
        self.timestamp = datetime.now()
        self.details = details
        
    def to_dict(self):
        return {
            "honeypot_id": self.honeypot_id,
            "source_ip": self.source_ip,
            "attack_type": self.attack_type,
            "timestamp": self.timestamp.isoformat(),
            "details": self.details
        }

class LogWatcher(FileSystemEventHandler):
    def __init__(self, log_path: str, honeypot_id: str, honeypot_type: str, callback: Callable):
        self.log_path = log_path
        self.honeypot_id = honeypot_id
        self.honeypot_type = honeypot_type.lower()
        self.callback = callback
        self.file_positions: Dict[str, int] = {}
        
        # Initialize detector based on honeypot type
        if self.honeypot_type == "ssh":
            self.detector = SSHAttackDetector(self.honeypot_id)
        elif self.honeypot_type == "ftp":
            self.detector = FTPAttackDetector(self.honeypot_id)
        elif self.honeypot_type == "web":
            self.detector = WebAttackDetector(self.honeypot_id)
        else:
            self.detector = GenericAttackDetector(self.honeypot_id)
    
    def on_modified(self, event):
        if not isinstance(event, FileModifiedEvent):
            return
            
        if not os.path.isfile(event.src_path):
            return
            
        # Process the modified file
        self._process_file(event.src_path)
    
    def _process_file(self, file_path):
        try:
            # Get the last position we read from or start at 0
            position = self.file_positions.get(file_path, 0)
            
            with open(file_path, 'r') as f:
                # Seek to the last position
                f.seek(position)
                
                # Read new lines
                new_lines = f.readlines()
                
                # Update position
                self.file_positions[file_path] = f.tell()
                
                # Process each new line
                for line in new_lines:
                    attack = self.detector.process_line(line)
                    if attack:
                        # Call the callback with the attack event
                        self.callback(attack)
        except Exception as e:
            logger.error(f"Error processing log file {file_path}: {e}")
    
    def scan_existing_logs(self):
        """Scan existing log files on startup"""
        log_dir = Path(self.log_path)
        if log_dir.exists() and log_dir.is_dir():
            for file_path in log_dir.glob('**/*.log'):
                if file_path.is_file():
                    self._process_file(str(file_path))
            for file_path in log_dir.glob('**/*.json'):
                if file_path.is_file():
                    self._process_file(str(file_path))

class SSHAttackDetector:
    def __init__(self, honeypot_id):
        self.honeypot_id = honeypot_id
        self.patterns = [
            # Login attempts
            (r"login attempt \[(.+?)/(.+?)\] failed", "login_attempt"),
            (r"login attempt \[(.+?)/(.+?)\] succeeded", "login_success"),
            # JSON log format (Cowrie)
            (r'"username": "([^"]+)".*"password": "([^"]+)"', "login_attempt"), 
            # SSH connection
            (r"New connection: ([0-9.]+):(\d+)", "connection")
        ]
    
    def process_line(self, line):
        try:
            # For JSON log files (Cowrie produces these)
            if line.strip().startswith('{') and line.strip().endswith('}'):
                try:
                    data = json.loads(line)
                    if data.get('eventid') == 'cowrie.login.failed':
                        return AttackEvent(
                            self.honeypot_id,
                            data.get('src_ip', 'unknown'),
                            'login_attempt',
                            {
                                'username': data.get('username', ''),
                                'password': data.get('password', ''),
                                'protocol': data.get('protocol', 'ssh')
                            }
                        )
                    elif data.get('eventid') == 'cowrie.session.connect':
                        return AttackEvent(
                            self.honeypot_id,
                            data.get('src_ip', 'unknown'),
                            'connection',
                            {'protocol': data.get('protocol', 'ssh')}
                        )
                except json.JSONDecodeError:
                    pass
            
            # Regular expressions for text log files
            for pattern, attack_type in self.patterns:
                match = re.search(pattern, line)
                if match:
                    if attack_type == "login_attempt" and len(match.groups()) >= 2:
                        username, password = match.groups()[:2]
                        return AttackEvent(
                            self.honeypot_id,
                            self._extract_ip(line),
                            attack_type,
                            {'username': username, 'password': password}
                        )
                    else:
                        return AttackEvent(
                            self.honeypot_id,
                            self._extract_ip(line),
                            attack_type,
                            {'raw_log': line.strip()}
                        )
        except Exception as e:
            logger.error(f"Error processing line for SSH honeypot: {e}")
        
        return None
    
    def _extract_ip(self, line):
        # Try to extract IP address from the line
        ip_match = re.search(r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})', line)
        return ip_match.group(1) if ip_match else "unknown"

class FTPAttackDetector:
    def __init__(self, honeypot_id):
        self.honeypot_id = honeypot_id
        self.patterns = [
            (r"Authentication failed for user \"([^\"]+)\"", "login_attempt"),
            (r"Client \"([0-9.]+)\".*logged in", "login_success"),
            (r"Connection from ([0-9.]+)", "connection")
        ]
    
    def process_line(self, line):
        try:
            for pattern, attack_type in self.patterns:
                match = re.search(pattern, line)
                if match:
                    if attack_type == "login_attempt":
                        username = match.group(1)
                        return AttackEvent(
                            self.honeypot_id,
                            self._extract_ip(line),
                            attack_type,
                            {'username': username, 'protocol': 'ftp'}
                        )
                    else:
                        return AttackEvent(
                            self.honeypot_id,
                            self._extract_ip(line),
                            attack_type,
                            {'raw_log': line.strip(), 'protocol': 'ftp'}
                        )
        except Exception as e:
            logger.error(f"Error processing line for FTP honeypot: {e}")
        
        return None
    
    def _extract_ip(self, line):
        # Try to extract IP address from the line
        ip_match = re.search(r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})', line)
        return ip_match.group(1) if ip_match else "unknown"

class WebAttackDetector:
    def __init__(self, honeypot_id):
        self.honeypot_id = honeypot_id
        self.patterns = [
            (r"\"(?:GET|POST|PUT|DELETE) ([^ ]*) HTTP", "http_request"),
            (r"SQL injection attempt: ([^\"]+)", "sql_injection"),
            (r"XSS attempt: ([^\"]+)", "xss_attempt")
        ]
    
    def process_line(self, line):
        try:
            for pattern, attack_type in self.patterns:
                match = re.search(pattern, line)
                if match:
                    url_path = match.group(1)
                    return AttackEvent(
                        self.honeypot_id,
                        self._extract_ip(line),
                        attack_type,
                        {'path': url_path, 'raw_log': line.strip(), 'protocol': 'http'}
                    )
                    
            # Check for common web attack patterns in URLs
            if "SELECT" in line.upper() and "FROM" in line.upper():
                return AttackEvent(
                    self.honeypot_id,
                    self._extract_ip(line),
                    "sql_injection",
                    {'raw_log': line.strip(), 'protocol': 'http'}
                )
            
            if "<script>" in line.lower():
                return AttackEvent(
                    self.honeypot_id,
                    self._extract_ip(line),
                    "xss_attempt",
                    {'raw_log': line.strip(), 'protocol': 'http'}
                )
                
        except Exception as e:
            logger.error(f"Error processing line for Web honeypot: {e}")
        
        return None
    
    def _extract_ip(self, line):
        # Try to extract IP address from the line
        ip_match = re.search(r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})', line)
        return ip_match.group(1) if ip_match else "unknown"

class GenericAttackDetector:
    def __init__(self, honeypot_id):
        self.honeypot_id = honeypot_id
    
    def process_line(self, line):
        try:
            # Just capture any connection or activity as an "activity" event
            if re.search(r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})', line):
                return AttackEvent(
                    self.honeypot_id,
                    self._extract_ip(line),
                    "activity",
                    {'raw_log': line.strip()}
                )
        except Exception as e:
            logger.error(f"Error processing line for Generic honeypot: {e}")
        
        return None
    
    def _extract_ip(self, line):
        # Try to extract IP address from the line
        ip_match = re.search(r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})', line)
        return ip_match.group(1) if ip_match else "unknown"

class AttackDetector:
    def __init__(self, attack_callback=None):
        self.observers = {}
        self.honeypots = {}
        self.attack_callback = attack_callback
        self._running = False
        self._thread = None
    
    def handle_attack(self, attack):
        """Handle detected attacks"""
        if attack and self.attack_callback:
            try:
                self.attack_callback(attack)
            except Exception as e:
                logger.error(f"Error in attack callback: {e}")

    def add_honeypot(self, honeypot_id, honeypot_type, log_path):
        """Add a honeypot to monitor"""
        try:
            if honeypot_id in self.observers:
                # Already monitoring this honeypot
                return
                
            # Ensure log directory exists
            os.makedirs(log_path, exist_ok=True)
            
            logger.info(f"Setting up attack detection for honeypot {honeypot_id} ({honeypot_type})")
            
            # Create and configure log watcher
            event_handler = LogWatcher(log_path, honeypot_id, honeypot_type, self.handle_attack)
            
            # Scan existing logs
            event_handler.scan_existing_logs()
            
            # Set up watchdog observer
            observer = Observer()
            observer.schedule(event_handler, log_path, recursive=True)
            
            # Store references
            self.observers[honeypot_id] = observer
            self.honeypots[honeypot_id] = {
                "type": honeypot_type,
                "log_path": log_path
            }
            
            # Start observer if detector is running
            if self._running:
                observer.start()
                
            logger.info(f"Attack detector configured for honeypot {honeypot_id}")
            
        except Exception as e:
            logger.error(f"Failed to add honeypot to attack detector: {e}")
    
    def remove_honeypot(self, honeypot_id):
        """Remove a honeypot from monitoring"""
        try:
            if honeypot_id in self.observers:
                observer = self.observers[honeypot_id]
                observer.stop()
                observer.join()
                del self.observers[honeypot_id]
                del self.honeypots[honeypot_id]
                logger.info(f"Stopped monitoring honeypot {honeypot_id}")
        except Exception as e:
            logger.error(f"Error removing honeypot from monitoring: {e}")
    
    def start(self):
        """Start all observers"""
        if self._running:
            return
            
        self._running = True
        
        def run():
            for honeypot_id, observer in self.observers.items():
                try:
                    observer.start()
                except Exception as e:
                    logger.error(f"Failed to start observer for honeypot {honeypot_id}: {e}")
            
            # Keep the thread alive
            while self._running:
                time.sleep(1)
                
            # Stop all observers when thread stops
            for observer in list(self.observers.values()):
                observer.stop()
            
            for observer in list(self.observers.values()):
                observer.join()
        
        # Start in a separate thread
        self._thread = threading.Thread(target=run)
        self._thread.daemon = True
        self._thread.start()
        
        logger.info("Attack detector started")
    
    def stop(self):
        """Stop all observers"""
        if not self._running:
            return
            
        self._running = False
        
        if self._thread:
            self._thread.join(timeout=5.0)
            self._thread = None
            
        logger.info("Attack detector stopped")