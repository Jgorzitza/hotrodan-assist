"""Unit tests for MODEL_SELECTOR."""

import os
import pytest
from unittest.mock import patch

from app.rag_api.model_selector import ModelSelector, ProviderInfo


class TestModelSelector:
    """Test cases for ModelSelector class."""
    
    def test_initialization(self):
        """Test MODEL_SELECTOR initializes correctly."""
        selector = ModelSelector()
        assert selector is not None
        assert hasattr(selector, 'priority')
        assert hasattr(selector, 'available')
        assert hasattr(selector, 'unavailable')
    
    def test_local_provider_always_available(self):
        """Test local provider is always available."""
        selector = ModelSelector()
        assert 'local' in selector.available
        provider = selector.available['local']
        assert provider.available is True
        assert provider.llm is not None
        assert provider.metadata['model'] == 'MockLLM'
    
    def test_retrieval_only_always_available(self):
        """Test retrieval-only provider is always available."""
        selector = ModelSelector()
        assert 'retrieval-only' in selector.available
        provider = selector.available['retrieval-only']
        assert provider.available is True
        assert provider.llm is None
        assert provider.metadata['mode'] == 'retrieval'
    
    def test_choose_with_specific_provider(self):
        """Test choosing a specific provider."""
        selector = ModelSelector()
        
        # Request specific provider
        provider = selector.choose('retrieval-only')
        assert provider.name == 'retrieval-only'
        
        provider = selector.choose('local')
        assert provider.name == 'local'
    
    def test_choose_fallback_uses_priority(self):
        """Test fallback uses priority when requested provider unavailable."""
        selector = ModelSelector()
        
        # Request a provider that doesn't exist
        # Should fall back to the priority list, which defaults to openai,anthropic,local,retrieval-only
        # Since openai/anthropic may not be configured, it will likely choose local or retrieval-only
        provider = selector.choose('nonexistent-provider')
        assert provider.name in ['openai', 'anthropic', 'local', 'retrieval-only']
    
    def test_provider_summary(self):
        """Test provider_summary returns all providers."""
        selector = ModelSelector()
        summary = selector.provider_summary()
        
        assert isinstance(summary, dict)
        assert 'retrieval-only' in summary
        assert 'local' in summary
        
        # All providers should have 'available' key
        for provider_name, info in summary.items():
            assert 'available' in info


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
