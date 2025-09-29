from __future__ import annotations
import json
from pathlib import Path
from typing import Any, Dict, List
from app.contracts.registry import ContractsRegistry

class MockContractValidator:
    def __init__(self, registry: ContractsRegistry):
        self.registry = registry

    def validate_mock_response(self, contract_name: str, mock_data: Any) -> Dict[str, Any]:
        try:
            model = self.registry.get(contract_name)
            validated = model(**mock_data)
            return {"valid": True, "data": validated.model_dump()}
        except Exception as e:
            return {"valid": False, "error": str(e)}

    def validate_all_mocks(self, mock_dir: str | Path) -> Dict[str, Any]:
        mock_path = Path(mock_dir)
        results = {}
        for contract_name in self.registry.list():
            mock_file = mock_path / f"{contract_name}.json"
            if mock_file.exists():
                mock_data = json.loads(mock_file.read_text(encoding="utf-8"))
                results[contract_name] = self.validate_mock_response(contract_name, mock_data)
        return results
