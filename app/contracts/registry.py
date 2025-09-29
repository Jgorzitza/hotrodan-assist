from __future__ import annotations
from pathlib import Path
from typing import Dict, Type
from pydantic import BaseModel
import json

class ContractsRegistry:
    def __init__(self) -> None:
        self._name_to_model: Dict[str, Type[BaseModel]] = {}

    def register(self, name: str, model: Type[BaseModel]) -> None:
        if not issubclass(model, BaseModel):
            raise TypeError("model must be a subclass of pydantic.BaseModel")
        self._name_to_model[name] = model

    def get(self, name: str) -> Type[BaseModel]:
        return self._name_to_model[name]

    def list(self) -> Dict[str, str]:
        return {name: mdl.__name__ for name, mdl in self._name_to_model.items()}

    def export_json_schemas(self, out_dir: str | Path) -> Dict[str, Path]:
        out_path = Path(out_dir)
        out_path.mkdir(parents=True, exist_ok=True)
        written: Dict[str, Path] = {}
        for name, model in self._name_to_model.items():
            schema = model.model_json_schema()
            target_file = out_path / f"{name}.schema.json"
            target_file.write_text(json.dumps(schema, indent=2) + "\n", encoding="utf-8")
            written[name] = target_file
        manifest = {"contracts": sorted(self._name_to_model.keys())}
        (out_path / "index.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        return written

# default registry
default_registry = ContractsRegistry()
