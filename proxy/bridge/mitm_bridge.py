import requests
from mitmproxy import http
import asyncio
from functools import partial

# Run with: mitmweb --mode wireguard -s bridge/mitm_bridge.py

# Bridge to send HTML payloads to the local Go Tracker
class TrackerBridge:
    def response(self, flow: http.HTTPFlow):
        # 1. Filter: Only grab successful GET requests for HTML documents
        if flow.request.method == "GET" and flow.response.status_code == 200:
            content_type = flow.response.headers.get("Content-Type", "")
            
            if "text/html" in content_type:
                # 2. Extract the raw, decrypted HTML payload
                html_payload = flow.response.get_text()
                url = flow.request.url
                
                # 3. Fire-and-forget Webhook to your local Go app
                asyncio.create_task(self.send_to_tracker(url, html_payload))

    async def send_to_tracker(self, url, html):
        """
        Sends extracted HTML data to the local Go Ingestion server.
        
        WHY WE USE run_in_executor:
        1. mitmproxy runs on a single-threaded asynchronous event loop. 
        2. The 'requests' library is synchronous/blocking. If we called 'requests.post' 
           directly, it would freeze the entire event loop (and all your web traffic) 
           until the Go server responds.
        3. By using 'loop.run_in_executor', we offload the blocking I/O to a 
           background thread, allowing mitmproxy to continue routing other 
           network packets in the meantime.
        """
        try:
            payload = {"url": url, "html": html}
            loop = asyncio.get_running_loop()
            
            # partial() is used to fix the arguments before passing to the thread
            await loop.run_in_executor(None, partial(
                requests.post, "http://localhost:3000/ingest", json=payload, timeout=2
            ))
        except Exception as e:
            print(f"Tracker Bridge Error: {e}")

addons = [TrackerBridge()]