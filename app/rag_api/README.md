# RAG API Documentation

## Overview
The RAG (Retrieval-Augmented Generation) API provides intelligent question-answering capabilities for the HotRodAN knowledge base. It supports both full LLM synthesis (with OpenAI) and retrieval-only mode (with FastEmbed).

## Base URL
- **Development**: `http://localhost:8000`
- **Production**: TBD

## Authentication
Currently no authentication required. Future versions may require API keys.

## Endpoints

### POST /query
Query the RAG system with a question to get an answer with sources.

#### Request Body
```json
{
  "question": "What micron filter should I use for EFI?",
  "top_k": 10
}
```

#### Parameters
- `question` (string, required): The question to ask
- `top_k` (integer, optional): Number of top documents to retrieve (default: 10)

#### Response
```json
{
  "answer": "For EFI systems, use a ≤10 μm (ten micron) pressure-side filter...",
  "sources": [
    "https://hotrodan.com/blogs/an-hose-101/efi-fuel-filter-microns-placement-10-micron-vs-100-micron-hot-rod-an",
    "https://hotrodan.com/blogs/an-hose-101/efi-swaps-and-ptfe-hose-holley-sniper-aces-efi-and-fitech"
  ]
}
```

#### Response Fields
- `answer` (string): The generated answer or retrieved bullet points
- `sources` (array): List of source URLs used for the answer

### GET /health
Check the health status of the RAG API.

#### Response
```json
{
  "status": "healthy",
  "mode": "retrieval-only"
}
```

## Modes

### Retrieval-Only Mode (Current)
- Uses FastEmbed for embeddings
- Returns bullet-point summaries of retrieved documents
- No LLM synthesis
- Activated when `OPENAI_API_KEY` is not set

### Full LLM Mode (Future)
- Uses OpenAI for embeddings and generation
- Returns full narrative responses
- Activated when `OPENAI_API_KEY` is set
- Set `RAG_GENERATION_MODE=openai` environment variable

## Integration Examples

### Python
```python
import requests

def query_rag(question: str, top_k: int = 10):
    response = requests.post(
        "http://localhost:8000/query",
        json={"question": question, "top_k": top_k}
    )
    return response.json()

# Example usage
result = query_rag("What micron filter should I use for EFI?")
print(result["answer"])
```

### JavaScript/TypeScript
```typescript
interface RAGQuery {
  question: string;
  top_k?: number;
}

interface RAGResponse {
  answer: string;
  sources: string[];
}

async function queryRAG(question: string, top_k: number = 10): Promise<RAGResponse> {
  const response = await fetch('http://localhost:8000/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question, top_k }),
  });
  return response.json();
}
```

### cURL
```bash
curl -X POST "http://localhost:8000/query" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What micron filter should I use for EFI?",
    "top_k": 5
  }'
```

## Error Handling

### Common Error Responses
- **400 Bad Request**: Invalid request body or missing required fields
- **500 Internal Server Error**: RAG system error or missing storage files

### Example Error Response
```json
{
  "detail": "Invalid request body"
}
```

## Performance Considerations

### Response Times
- **Retrieval-Only Mode**: ~200-500ms typical
- **Full LLM Mode**: ~1-3s typical (depends on OpenAI API)

### Rate Limits
- Currently no rate limiting implemented
- Consider implementing rate limiting for production use

### Caching
- ChromaDB provides built-in caching for embeddings
- Consider implementing response caching for frequently asked questions

## Monitoring

### Health Check
Use the `/health` endpoint to monitor:
- API availability
- Current mode (retrieval-only vs full LLM)
- System status

### Metrics to Track
- Query response times
- Number of queries per minute
- Source diversity in responses
- Error rates

## Development

### Running Locally
```bash
cd app/rag_api
pip install -r requirements.txt
python main.py
```

### Environment Variables
- `RAG_GENERATION_MODE`: Set to "openai" for full LLM mode
- `OPENAI_API_KEY`: Required for full LLM mode
- `CHROMA_PATH`: Path to ChromaDB storage (default: ../chroma)
- `PERSIST_DIR`: Path to LlamaIndex storage (default: ../storage)

## Data Sources

The RAG system is built on:
- **133 URLs** from hotrodan.com (blogs, products, pages)
- **5 High-priority corrections** from human experts
- **ChromaDB** for vector storage and retrieval
- **LlamaIndex** for document processing and querying

## Support

For issues or questions:
1. Check the health endpoint
2. Verify storage files exist in `/home/justin/llama_rag/storage/`
3. Check logs for detailed error messages
4. Contact the RAG Data Engineer team
