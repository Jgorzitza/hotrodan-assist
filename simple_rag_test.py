#!/usr/bin/env python3
"""Ultra-simple RAG API test."""

from fastapi import FastAPI
import uvicorn

app = FastAPI()

@app.get("/")
def root():
    return {"message": "RAG API Test", "status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy", "version": "1.0"}

@app.post("/query")
def query(data: dict):
    return {
        "answer": f"Test response for: {data.get('question', 'no question')}",
        "sources": ["test1", "test2"],
        "status": "success"
    }

if __name__ == "__main__":
    print("Starting RAG API test on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
