# RAG-Assistants Integration

## Overview
The RAG-Assistants integration enables automatic generation of customer service reply drafts using the RAG (Retrieval-Augmented Generation) system. This integration provides intelligent, knowledge-based responses for customer inquiries.

## Architecture

```
Customer Question → RAG System → Draft Generation → Approvals Workflow
```

1. **Customer Question**: Incoming customer inquiry
2. **RAG System**: Queries knowledge base for relevant information
3. **Draft Generation**: Formats RAG response into professional CS reply
4. **Approvals Workflow**: Human review, edit, and approval process

## Components

### RAG Integration Module (`rag_integration.py`)
- **RAGClient**: HTTP client for RAG API communication
- **RAGDraftGenerator**: Converts RAG responses into CS reply drafts
- **Question Extraction**: Identifies customer questions from incoming text
- **Response Formatting**: Creates professional, branded replies

### New Endpoint: `POST /assistants/draft/rag`
Creates a draft using RAG system for CS reply generation.

#### Request Body
```json
{
  "channel": "email",
  "conversation_id": "conv_123",
  "incoming_text": "What micron filter should I use for my EFI system?",
  "customer_display": "John Smith <john@example.com>",
  "subject": "EFI Filter Question"
}
```

#### Response
```json
{
  "draft_id": "d_abc123def456"
}
```

## Features

### Intelligent Question Extraction
- Identifies questions from customer text
- Handles various question formats
- Extracts key technical terms

### Professional Response Formatting
- Branded greeting and closing
- Clean, readable formatting
- Source attribution
- Appropriate tone for customer service

### Source Attribution
- Links to relevant documentation
- Relevance scoring
- Reference numbering

### Quality Metrics
- Confidence scoring (0.8 default for RAG)
- Token counting
- Latency tracking
- Cost tracking (RAG has $0 cost)

## Usage Examples

### Python Integration
```python
import httpx

async def create_rag_draft(question: str, customer: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8002/assistants/draft/rag",
            json={
                "channel": "email",
                "conversation_id": "conv_123",
                "incoming_text": question,
                "customer_display": customer
            }
        )
        return response.json()
```

### cURL Example
```bash
curl -X POST "http://localhost:8002/assistants/draft/rag" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "email",
    "conversation_id": "conv_123",
    "incoming_text": "What micron filter should I use for my EFI system?",
    "customer_display": "John Smith <john@example.com>"
  }'
```

## Configuration

### Environment Variables
- `RAG_API_URL`: RAG API base URL (default: http://localhost:8000)
- `ASSISTANTS_DB_URL`: Database URL for draft storage

### Dependencies
- RAG API must be running and accessible
- ChromaDB storage must be available
- Network connectivity between services

## Error Handling

### RAG API Unavailable
- Graceful fallback to error message
- Maintains draft creation workflow
- Logs errors for monitoring

### Network Issues
- Timeout handling (30 seconds)
- Retry logic (future enhancement)
- Error logging

## Monitoring

### Metrics Tracked
- Draft generation success rate
- RAG query response times
- Source attribution accuracy
- Customer satisfaction (via feedback)

### Health Checks
- RAG API connectivity
- Database availability
- Service dependencies

## Testing

### Unit Tests
```bash
cd app/assistants
python -m pytest tests/test_rag_integration.py
```

### Integration Tests
```bash
# Start RAG API
python app/rag_api/main.py &

# Test integration
python -c "from app.assistants.rag_integration import generate_rag_draft; import asyncio; asyncio.run(generate_rag_draft('Test question', 'Test Customer'))"
```

## Production Deployment

### Prerequisites
1. RAG API deployed and accessible
2. ChromaDB storage configured
3. Network connectivity established
4. Environment variables set

### Scaling Considerations
- RAG API load balancing
- Database connection pooling
- Caching for frequent queries
- Rate limiting for RAG API calls

## Troubleshooting

### Common Issues

#### RAG API Connection Failed
- Check RAG API is running
- Verify network connectivity
- Check firewall settings
- Review RAG API logs

#### Poor Response Quality
- Review RAG knowledge base
- Check question extraction logic
- Verify source attribution
- Monitor confidence scores

#### Performance Issues
- Check RAG API response times
- Review database performance
- Monitor memory usage
- Consider caching strategies

## Future Enhancements

### Planned Features
- Multi-language support
- Sentiment analysis
- Response personalization
- Advanced question classification
- Learning from human edits

### Integration Opportunities
- CRM system integration
- Knowledge base updates
- Customer feedback loop
- Analytics and reporting

## Support

For issues or questions:
1. Check service health endpoints
2. Review logs for error details
3. Verify RAG API connectivity
4. Contact the RAG Data Engineer team
