import os, datetime as dt, importlib.util, sys
from pathlib import Path

MODULE_PATH = Path("app/seo-api/content/content_briefs_generator.py").resolve()
spec = importlib.util.spec_from_file_location("content_briefs_generator", str(MODULE_PATH))
cbg = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = cbg
spec.loader.exec_module(cbg)


def test_entity_extraction():
    generator = cbg.ContentBriefsGenerator()
    text = "SEO optimization with AI technology and Google Analytics. John Smith from Acme Corp in New York City."
    entities = generator.extract_entities(text)
    
    assert len(entities) > 0
    assert any(e.name == "John Smith" for e in entities)
    assert any(e.type == "person" for e in entities)
    assert any(e.type == "organization" for e in entities)


def test_header_structure_generation():
    generator = cbg.ContentBriefsGenerator()
    structure = generator.generate_header_structure("SEO Optimization", "guide")
    
    assert structure.h1 == "Complete Guide to SEO Optimization"
    assert len(structure.h2s) > 0
    assert len(structure.h3s) > 0
    assert len(structure.suggested_headers) > 0


def test_faq_generation():
    generator = cbg.ContentBriefsGenerator()
    faqs = generator.generate_faqs("SEO Optimization", "search engine optimization", 3)
    
    assert len(faqs) == 3
    assert all(faq.question for faq in faqs)
    assert all(faq.answer for faq in faqs)
    assert all(faq.keyword_density >= 0 for faq in faqs)
    assert all(faq.search_intent in ["informational", "navigational", "transactional"] for faq in faqs)


def test_content_brief_generation():
    generator = cbg.ContentBriefsGenerator()
    brief = generator.generate_content_brief(
        topic="SEO Optimization",
        target_keyword="search engine optimization",
        word_count_target=1500
    )
    
    assert brief.topic == "SEO Optimization"
    assert brief.target_keyword == "search engine optimization"
    assert len(brief.entities) > 0
    assert brief.header_structure.h1
    assert len(brief.faqs) > 0
    assert brief.word_count_target == 1500
    assert 0 <= brief.readability_score <= 100
    assert len(brief.semantic_keywords) > 0
    assert len(brief.competitor_insights) > 0
    assert len(brief.content_gaps) > 0


def test_export_formats():
    generator = cbg.ContentBriefsGenerator()
    brief = generator.generate_content_brief("Test Topic", "test keyword")
    
    # Test JSON export
    json_export = generator.export_brief(brief, "json")
    assert json_export
    assert "Test Topic" in json_export
    
    # Test Markdown export
    md_export = generator.export_brief(brief, "markdown")
    assert md_export
    assert "# Content Brief: Test Topic" in md_export
    assert "## Header Structure" in md_export
    assert "## FAQs" in md_export
