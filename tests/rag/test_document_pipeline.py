import pytest
from llama_index.core import Document

from rag_pipeline import DocumentPipeline, PipelineConfig


def test_pipeline_dedupe_removes_duplicates():
    pipeline = DocumentPipeline()
    doc = Document(text="Example content.")
    result = pipeline.run([doc, doc])
    assert len(result) > 0
    hashes = {d.doc_id for d in result}
    assert len(hashes) == len(result)


def test_pipeline_respects_toc_headings():
    pipeline = DocumentPipeline(PipelineConfig(chunk_size=50, chunk_overlap=0, min_chunk_size=1))
    text = "Intro\n# Section 1\nContent one.\n# Section 2\nContent two."
    doc = Document(text=text, metadata={"source_url": "https://example.com"}, doc_id="doc1")
    result = pipeline.run([doc])
    section_indices = {d.metadata.get("section_index") for d in result}
    assert section_indices == {0, 1, 2}


def test_pipeline_handles_small_documents():
    pipeline = DocumentPipeline(PipelineConfig(min_chunk_size=1))
    doc = Document(text="Short text", metadata={"source_url": "https://example.com"})
    result = pipeline.run([doc])
    assert len(result) == 1
    assert result[0].text.startswith("Short")


def test_pipeline_chunk_metadata_contains_source_and_indices():
    pipeline = DocumentPipeline(PipelineConfig(chunk_size=20, chunk_overlap=0, min_chunk_size=1))
    doc = Document(
        text="Intro. More text here. Even more sentences. Enough for chunking.",
        metadata={"source_url": "https://example.com/path"},
    )
    result = pipeline.run([doc])
    assert all("source_url" in d.metadata for d in result)
    assert any("chunk_index" in d.metadata for d in result)
