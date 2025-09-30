"""Simple test server to debug the approval app."""

from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI(title="Test Approval App", version="0.1.0")


@app.get("/")
async def index():
    return HTMLResponse(
        """
    <html>
    <head><title>Test Approval App</title></head>
    <body>
        <h1>Test Approval App</h1>
        <p>Server is running!</p>
        <a href="/generate">Generate Draft</a>
    </body>
    </html>
    """
    )


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/generate")
async def generate_draft():
    return {"message": "Draft generation endpoint working"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8003)
