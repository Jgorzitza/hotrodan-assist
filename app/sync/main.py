from fastapi import FastAPI, Request
app = FastAPI()

@app.post("/zoho/incoming")
async def zoho_incoming(req: Request):
    payload = await req.json()
    # Codex: upsert conversation/message; enqueue draft
    return {"ok": True}

@app.post("/shopify/webhook")
async def shopify_webhook(req: Request):
    # Codex: verify HMAC; update customers/orders/inventory
    return {"ok": True}
