"""FastAPI entrypoint for dashboard prompt preparation."""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Dict

from .prompt_renderer import render_dashboard_home, render_dashboard_sales

app = FastAPI()


class DashboardPayload(BaseModel):
    payload: Dict[str, Any]


@app.post("/dashboard/home")
def dashboard_home(body: DashboardPayload):
    if not isinstance(body.payload, dict):
        raise HTTPException(status_code=400, detail="Payload must be an object")
    result = render_dashboard_home(body.payload)
    return {
        "markdown": result["markdown"],
        "escalate": result["escalate"],
    }


@app.post("/dashboard/sales")
def dashboard_sales(body: DashboardPayload):
    if not isinstance(body.payload, dict):
        raise HTTPException(status_code=400, detail="Payload must be an object")
    result = render_dashboard_sales(body.payload)
    return {
        "markdown": result["markdown"],
        "escalate": result["escalate"],
    }
