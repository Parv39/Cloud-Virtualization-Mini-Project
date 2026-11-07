import asyncio
import websockets
import json

async def test_terminal():
    uri = "ws://127.0.0.1:8000/api/environments/3/terminal"
    print(f"Connecting to {uri}...")
    async with websockets.connect(uri) as ws:
        # Wait for banner
        msg1 = await ws.recv()
        print("Received from terminal:")
        if isinstance(msg1, bytes):
            print(msg1.decode('utf-8', errors='replace'))
        else:
            print(msg1)

        # Wait a moment for shell prompt
        try:
            msg2 = await asyncio.wait_for(ws.recv(), timeout=2.0)
            if isinstance(msg2, bytes):
                print(msg2.decode('utf-8', errors='replace'))
            else:
                print(msg2)
        except asyncio.TimeoutError:
            pass

        # Send command
        print("\nSending 'echo TEST_TERMINAL_OK'...")
        await ws.send("echo TEST_TERMINAL_OK\n")
        
        # Read response
        for _ in range(5):
            try:
                resp = await asyncio.wait_for(ws.recv(), timeout=2.0)
                text = resp.decode('utf-8', errors='replace') if isinstance(resp, bytes) else resp
                print("Container Output:", repr(text))
                if "TEST_TERMINAL_OK" in text:
                    print("\n>>> TERMINAL INTERACTION 100% VERIFIED AND WORKING! <<<")
                    return True
            except asyncio.TimeoutError:
                break
    return False

if __name__ == "__main__":
    ok = asyncio.run(test_terminal())
    if not ok:
        exit(1)
