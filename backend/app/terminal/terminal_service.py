import asyncio
import logging
import threading
from typing import Optional
from fastapi import WebSocket, WebSocketDisconnect
import docker
from backend.app.docker.docker_service import docker_service

logger = logging.getLogger("dvem.terminal")

class TerminalSession:
    def __init__(self, container_id: str, websocket: WebSocket):
        self.container_id = container_id
        self.websocket = websocket
        self.client = docker_service.get_client()
        self.exec_id: Optional[str] = None
        self.sock = None
        self.running = False
        self.reader_thread: Optional[threading.Thread] = None

    async def start(self):
        container = docker_service.get_container(self.container_id)
        if not container or container.status != "running":
            await self.websocket.send_text("\r\n\x1b[31m[Error]: Container is not running.\x1b[0m\r\n")
            await self.websocket.close()
            return

        # Prefer /bin/bash, fall back to /bin/sh
        check_bash = container.exec_run("which bash")
        shell_cmd = "/bin/bash" if check_bash.exit_code == 0 else "/bin/sh"

        try:
            # 1. Create exec instance with tty and stdin
            exec_instance = self.client.api.exec_create(
                self.container_id,
                cmd=[shell_cmd],
                stdin=True,
                stdout=True,
                stderr=True,
                tty=True,
                environment={"TERM": "xterm-256color", "COLORTERM": "truecolor"}
            )
            self.exec_id = exec_instance["Id"]

            # 2. Start exec and obtain raw duplex stream/socket
            raw_socket_resp = self.client.api.exec_start(
                self.exec_id,
                detach=False,
                tty=True,
                stream=True,
                socket=True
            )
            
            # Extract underlying socket (NpipeSocket on Windows, socket on Linux)
            if hasattr(raw_socket_resp, "_sock"):
                self.sock = raw_socket_resp._sock
            elif hasattr(raw_socket_resp, "raw") and hasattr(raw_socket_resp.raw, "_sock"):
                self.sock = raw_socket_resp.raw._sock
            else:
                self.sock = raw_socket_resp

            self.running = True

            # Send welcome banner
            image_name = container.image.tags[0] if container.image.tags else 'Linux'
            banner = (
                f"\r\n\x1b[36m========================================================\x1b[0m\r\n"
                f"\x1b[1;32m Connected to DVEM Linux Container: {container.name}\x1b[0m\r\n"
                f"\x1b[90m Shell: {shell_cmd} | OS: Linux ({image_name})\x1b[0m\r\n"
                f"\x1b[36m========================================================\x1b[0m\r\n\r\n"
            )
            await self.websocket.send_text(banner)

            loop = asyncio.get_running_loop()

            # 3. Start dedicated background thread to read from Docker socket
            self.reader_thread = threading.Thread(
                target=self._container_reader_worker,
                args=(loop,),
                daemon=True
            )
            self.reader_thread.start()

            # 4. Listen for user input / keystrokes from WebSocket on the asyncio loop
            await self._read_from_websocket()

        except Exception as e:
            logger.error(f"Terminal session error: {e}")
            try:
                await self.websocket.send_text(f"\r\n\x1b[31m[Session error]: {e}\x1b[0m\r\n")
            except Exception:
                pass
        finally:
            self.cleanup()

    def _container_reader_worker(self, loop):
        """Dedicated thread reading from Docker socket/pipe and dispatching to websocket."""
        while self.running and self.sock:
            try:
                data = self.sock.recv(4096)
                if not data:
                    break
                # Safely send binary bytes across the async event loop to the browser
                asyncio.run_coroutine_threadsafe(self.websocket.send_bytes(data), loop)
            except Exception as e:
                logger.debug(f"Socket reader worker ended: {e}")
                break
        
        self.running = False
        # Notify websocket that container shell terminated
        try:
            asyncio.run_coroutine_threadsafe(
                self.websocket.send_text("\r\n\x1b[33m[DVEM]: Container shell exited.\x1b[0m\r\n"),
                loop
            )
        except Exception:
            pass

    async def _read_from_websocket(self):
        """Asynchronous reader for incoming browser keystrokes and resize events."""
        try:
            while self.running:
                msg = await self.websocket.receive()
                if "text" in msg and msg["text"]:
                    text = msg["text"]
                    
                    # Handle terminal resize packet from frontend
                    if text.startswith('{"type": "resize"') or text.startswith('{"type":"resize"'):
                        try:
                            import json
                            parsed = json.loads(text)
                            cols = parsed.get("cols", 80)
                            rows = parsed.get("rows", 24)
                            if self.exec_id:
                                self.client.api.exec_resize(self.exec_id, height=rows, width=cols)
                            continue
                        except Exception:
                            pass
                    
                    # Normal user typing -> write to container socket in thread
                    await asyncio.to_thread(self._send_bytes, text.encode("utf-8"))
                elif "bytes" in msg and msg["bytes"]:
                    await asyncio.to_thread(self._send_bytes, msg["bytes"])
        except WebSocketDisconnect:
            logger.info("Terminal WebSocket disconnected by client.")
        except Exception as e:
            logger.debug(f"Websocket read error: {e}")
        finally:
            self.running = False

    def _send_bytes(self, data: bytes):
        if self.sock and self.running:
            try:
                self.sock.sendall(data)
            except Exception as e:
                logger.debug(f"Error sending bytes to container socket: {e}")

    def cleanup(self):
        self.running = False
        if self.sock:
            try:
                self.sock.close()
            except Exception:
                pass
            self.sock = None
