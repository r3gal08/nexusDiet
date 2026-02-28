import requests
from mitmproxy import http
import asyncio

class PIOSBridge:
    def response(self, flow: http.HTTPFlow):
        # 1. Filter: Only grab successful GET requests for HTML documents
        if flow.request.method == "GET" and flow.response.status_code == 200:
            content_type = flow.response.headers.get("Content-Type", "")
            
            if "text/html" in content_type:
                # 2. Extract the raw, decrypted HTML payload
                html_payload = flow.response.get_text()
                url = flow.request.url
                
                # 3. Fire-and-forget Webhook to your local Go app
                asyncio.create_task(self.send_to_pios(url, html_payload))

    async def send_to_pios(self, url, html):
        try:
            payload = {"url": url, "html": html}
            requests.post("http://localhost:3000/ingest", json=payload, timeout=2)
        except Exception as e:
            print(f"PIOS Bridge Error: {e}")

addons = [PIOSBridge()]