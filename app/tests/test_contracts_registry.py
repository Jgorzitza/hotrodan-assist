from pathlib import Path
from pydantic import BaseModel
from app.contracts.registry import ContractsRegistry

class OrderCreated(BaseModel):
    order_id: str
    total: float

def test_register_and_export(tmp_path: Path):
    reg = ContractsRegistry()
    reg.register("order.created", OrderCreated)
    files = reg.export_json_schemas(tmp_path)
    assert "order.created" in files
    schema_path = files["order.created"]
    assert schema_path.exists()
    content = schema_path.read_text(encoding="utf-8")
    assert "order_id" in content and "total" in content
    manifest = (tmp_path / "index.json").read_text(encoding="utf-8")
    assert "order.created" in manifest
