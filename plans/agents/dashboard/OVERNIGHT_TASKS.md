# Dashboard - Overnight Production Tasks (50 Tasks)

**MODE**: AUTONOMOUS - No user intervention required
**TIME**: 8-10 hours
**PRIORITY**: CRITICAL

## SHOPIFY API INTEGRATION (1-10)
1. Call learn_shopify_api(api="admin", conversationId="da558c36-aec9-4a8a-844e-127903755463")
2. Use introspect_graphql_schema to explore product/inventory schema
3. Create GraphQL query for products with inventory
4. Validate query with validate_graphql_codeblocks
5. Implement apps/dashboard/app/lib/shopify/api.server.ts
6. Add Shopify session token authentication
7. Test live product data retrieval
8. Implement retry logic and error handling
9. Add response caching
10. Performance test (target: p95 < 2s)

## INVENTORY INTEGRATION (11-20)
11. Complete apps/dashboard/app/lib/inventory/api.server.ts
12. Create MCP client for inventory service
13. Transform MCP data to dashboard format
14. Implement Redis caching
15. Add error recovery and fallbacks
16. Test end-to-end MCP → Dashboard flow
17. Create inventory card component
18. Add real-time WebSocket updates
19. Display SKU counts and metrics
20. Add loading states and error boundaries

## WEBHOOKS (21-30)
21-25. Register product/order webhooks
26-30. Implement handlers and persistence

## TESTING (31-40)
31-35. Unit and integration tests
36-40. Performance and cross-browser tests

## ASSISTANT (41-50)
41-45. Draft generation and RAG integration
46-50. Streaming optimization and analytics

WORK CONTINUOUSLY - LOG EVERY 15 MIN
