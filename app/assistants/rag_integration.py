"""RAG integration for assistants service."""

import sys
from typing import Dict, Any
import httpx

# Add the parent directory to the path to import rag_config
sys.path.append("/home/justin/llama_rag")


class RAGClient:
    """Client for interacting with the RAG API."""

    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=30.0)

    async def query(self, question: str, top_k: int = 5) -> Dict[str, Any]:
        """Query the RAG system for information."""
        try:
            response = await self.client.post(
                f"{self.base_url}/query", json={"question": question, "top_k": top_k}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"RAG query failed: {e}")
            return {
                "answer": "I apologize, but I'm unable to retrieve specific information at the moment. Please contact our technical support team for assistance.",
                "sources": [],
                "mode": "error",
            }

    async def health_check(self) -> bool:
        """Check if the RAG API is healthy."""
        try:
            response = await self.client.get(f"{self.base_url}/health")
            return response.status_code == 200
        except Exception:
            return False

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()


class RAGDraftGenerator:
    """Generates CS reply drafts using RAG system."""

    def __init__(self, rag_client: RAGClient):
        self.rag = rag_client

    def extract_customer_question(self, incoming_text: str) -> str:
        """Extract the main question from customer text."""
        # Simple extraction - in production, this could be more sophisticated
        text = incoming_text.strip()

        # Look for question patterns
        if text.endswith("?"):
            return text

        # Look for common question starters
        question_starters = [
            "what",
            "how",
            "why",
            "when",
            "where",
            "can",
            "could",
            "would",
            "should",
            "is",
            "are",
            "do",
            "does",
            "did",
            "will",
            "have",
            "has",
            "had",
        ]

        sentences = text.split(".")
        for sentence in sentences:
            sentence = sentence.strip().lower()
            if any(sentence.startswith(starter) for starter in question_starters):
                return sentence.capitalize() + "?"

        # If no clear question, return the first sentence or full text
        first_sentence = sentences[0].strip() if sentences else text
        return first_sentence if len(first_sentence) < 200 else text[:200] + "..."

    def format_rag_response(
        self, rag_response: Dict[str, Any], customer_question: str
    ) -> str:
        """Format RAG response into a professional CS reply."""
        answer = rag_response.get("answer", "")
        # sources = rag_response.get("sources", [])
        mode = rag_response.get("mode", "retrieval-only")

        if mode == "error":
            return answer

        # Create a professional greeting
        greeting = "Thank you for contacting HotRodAN! "

        # Format the answer
        if mode == "retrieval-only":
            # For retrieval-only mode, clean up the bullet points
            if answer.startswith("• "):
                # Remove bullet points and format as paragraphs
                paragraphs = [p.strip() for p in answer.split("• ") if p.strip()]
                formatted_answer = "\n\n".join(paragraphs)
            else:
                formatted_answer = answer
        else:
            formatted_answer = answer

        # Add closing
        closing = "\n\nIf you have any other questions, please don't hesitate to ask!"

        # Combine everything
        reply = f"{greeting}{formatted_answer}{closing}"

        return reply

    async def generate_draft(
        self, incoming_text: str, customer_display: str = None
    ) -> Dict[str, Any]:
        """Generate a CS reply draft using RAG."""
        # Extract the customer's question
        customer_question = self.extract_customer_question(incoming_text)

        # Query the RAG system
        rag_response = await self.rag.query(customer_question)

        # Format the response as a professional CS reply
        draft_text = self.format_rag_response(rag_response, customer_question)

        # Extract source snippets for the draft
        source_snippets = []
        for i, source_url in enumerate(rag_response.get("sources", [])[:3]):
            source_snippets.append(
                {
                    "title": f"Reference {i+1}",
                    "url": source_url,
                    "relevance_score": 0.8,  # Default relevance score
                }
            )

        return {
            "draft_text": draft_text,
            "source_snippets": source_snippets,
            "confidence": 0.8,  # High confidence for RAG-generated responses
            "llm_model": "rag-system",
            "estimated_tokens_in": len(customer_question),
            "estimated_tokens_out": len(draft_text),
            "usd_cost": 0.0,  # RAG system has no cost
            "model_latency_ms": 100,  # Estimated latency
            "tags": ["rag-generated", "technical-support"],
            "conversation_summary": [customer_question],
        }


# Global instances
rag_client = RAGClient()
rag_generator = RAGDraftGenerator(rag_client)


async def generate_rag_draft(
    incoming_text: str, customer_display: str = None
) -> Dict[str, Any]:
    """Generate a draft using RAG system."""
    return await rag_generator.generate_draft(incoming_text, customer_display)


async def cleanup_rag_resources():
    """Clean up RAG resources."""
    await rag_client.close()
