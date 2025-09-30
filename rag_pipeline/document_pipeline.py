"""Advanced document processing pipeline for RAG ingestion.

Implements deduplication, table-of-contents aware splitting, and semantic chunking.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional

from llama_index.core import Document


_TOC_HEADING_PATTERN = re.compile(r"^(#+|\d+[.\)])\s+.+", re.MULTILINE)


def _hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


@dataclass
class PipelineConfig:
    chunk_size: int = 1000
    chunk_overlap: int = 150
    min_chunk_size: int = 200
    toc_heading_pattern: re.Pattern[str] = _TOC_HEADING_PATTERN


@dataclass
class DocumentPipeline:
    config: PipelineConfig = field(default_factory=PipelineConfig)

    def dedupe(self, documents: Iterable[Document]) -> List[Document]:
        """Remove duplicate documents based on content hash."""

        seen_hashes: Dict[str, Document] = {}
        unique_docs: List[Document] = []

        for doc in documents:
            text = doc.text or ""
            if not text:
                continue
            digest = _hash_text(text)
            if digest in seen_hashes:
                continue
            seen_hashes[digest] = doc
            unique_docs.append(doc)

        return unique_docs

    def split_with_toc(self, document: Document) -> List[Document]:
        """Split documents by headings from the table of contents."""

        text = document.text or ""
        if not text:
            return []

        headings = list(self.config.toc_heading_pattern.finditer(text))
        if not headings:
            return [document]

        sections: List[Document] = []
        cursor = 0
        section_index = 0

        for match in headings:
            start = match.start()
            if start > cursor:
                section_text = text[cursor:start].strip()
                if section_text:
                    sections.append(
                        self._new_section_doc(
                            document,
                            section_text,
                            section_index=section_index,
                        )
                    )
                    section_index += 1
            cursor = start

        tail = text[cursor:].strip()
        if tail:
            sections.append(
                self._new_section_doc(
                    document,
                    tail,
                    section_index=section_index,
                )
            )

        return sections

    def semantic_chunk(self, document: Document) -> List[Document]:
        """Perform semantic chunking with overlap."""

        text = (document.text or "").strip()
        if not text:
            return []

        sentences = re.split(r"(?<=[.!?])\s+", text)
        chunks: List[str] = []
        current = ""

        for sentence in sentences:
            if len(current) + len(sentence) <= self.config.chunk_size:
                current = (current + " " + sentence).strip()
                continue

            if current:
                chunks.append(current)
            overlap = current[-self.config.chunk_overlap :] if self.config.chunk_overlap else ""
            current = (overlap + " " + sentence).strip()

        if current:
            chunks.append(current)

        processed_docs = [
            self._new_section_doc(document, chunk, chunk_index=i)
            for i, chunk in enumerate(chunks)
            if len(chunk) >= self.config.min_chunk_size
        ]

        if not processed_docs and text:
            processed_docs = [self._new_section_doc(document, text, chunk_index=0)]

        return processed_docs

    def run(self, documents: Iterable[Document]) -> List[Document]:
        """Run the full pipeline: dedupe -> toc split -> semantic chunking."""

        deduped = self.dedupe(documents)
        expanded: List[Document] = []

        for doc in deduped:
            sections = self.split_with_toc(doc)
            if not sections:
                sections = [doc]
            chunked: List[Document] = []
            for section in sections:
                chunked.extend(self.semantic_chunk(section))

            if not chunked and doc.text:
                chunked = [self._new_section_doc(doc, doc.text, chunk_index=0)]

            expanded.extend(chunked)

        return expanded

    def _new_section_doc(
        self,
        original: Document,
        text: str,
        *,
        section_index: Optional[int] = None,
        chunk_index: Optional[int] = None,
    ) -> Document:
        metadata = dict(original.metadata or {})
        source = metadata.get("source_url") or metadata.get("url") or "unknown"
        if section_index is not None:
            metadata["section_index"] = section_index
        if chunk_index is not None:
            metadata["chunk_index"] = chunk_index

        chunk_suffix = ""
        if section_index is not None:
            chunk_suffix += f"-s{section_index}"
        if chunk_index is not None:
            chunk_suffix += f"-c{chunk_index}"
        doc_id = f"{source}{chunk_suffix}" if chunk_suffix else source

        metadata.setdefault("source_url", source)
        return Document(text=text, metadata=metadata, doc_id=doc_id)
