from pathlib import Path
import json
import pytest
from pydantic import BaseModel
from app.contracts.registry import ContractsRegistry
from app.contract_tests.mock_validator import MockContractValidator

class TestModel(BaseModel):
    id: str
    value: int

def test_mock_validation(tmp_path: Path):
    registry = ContractsRegistry()
    registry.register("test-model", TestModel)
    
    validator = MockContractValidator(registry)
    
    # Valid mock
    valid_mock = {"id": "test-123", "value": 42}
    result = validator.validate_mock_response("test-model", valid_mock)
    assert result["valid"] is True
    assert result["data"]["id"] == "test-123"
    
    # Invalid mock
    invalid_mock = {"id": "test-123"}  # missing required field
    result = validator.validate_mock_response("test-model", invalid_mock)
    assert result["valid"] is False
    assert "error" in result
