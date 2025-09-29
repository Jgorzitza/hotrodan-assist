# Sync Service v1.2 Write API Envelope Specification

## Overview
This document defines the finalized v1.2 request/response envelope specification for the Sync service write API endpoints. All endpoints share a common response envelope structure and require the `shop_domain` parameter to be appended to request bodies by the dashboard application.

## Common Request Format
All write API endpoints expect the dashboard application to append `shop_domain` (string) to every POST body before dispatching to the Sync service.

## Common Response Envelope
All write API endpoints share the following response envelope structure:

```json
{
  "success": boolean,
  "message"?: string,
  "updatedOrders": []
}
```

### Response Fields
- `success`: Boolean indicating whether the operation completed successfully
- `message`: Optional string with operation-specific message (defaults to standard text when omitted by Sync service)
- `updatedOrders`: Array of objects containing updated order information specific to each endpoint

## Endpoint Specifications

### 1. `/sync/orders/assign`
**Purpose**: Assign orders to specific users/assistants

**Request Body**:
```json
{
  "orderIds": string[],
  "assignee": string,
  "shop_domain": string
}
```

**Response**:
```json
{
  "success": true,
  "message": "Assigned 3 orders to assistant",
  "updatedOrders": [
    {
      "id": "gid://shopify/Order/1234567890",
      "assignedTo": "assistant"
    }
  ]
}
```

**Default Message**: "Assigned…"

### 2. `/sync/orders/fulfill`
**Purpose**: Acknowledge fulfillment and clear shipment alerts

**Request Body**:
```json
{
  "orderIds": string[],
  "tracking"?: {
    "number": string,
    "carrier": string
  },
  "shop_domain": string
}
```

**Response**:
```json
{
  "success": true,
  "message": "Marked 2 orders as fulfilled",
  "updatedOrders": [
    {
      "id": "gid://shopify/Order/1234567890",
      "fulfillmentStatus": "fulfilled",
      "tracking": {
        "number": "1Z999AA1234567890",
        "carrier": "UPS"
      }
    }
  ]
}
```

**Default Message**: "Marked…"

### 3. `/sync/orders/support`
**Purpose**: Escalate orders through support queue and reassign to assistant

**Request Body**:
```json
{
  "orderId": string,
  "conversationId"?: string,
  "note": string,
  "shop_domain": string
}
```

**Response**:
```json
{
  "success": true,
  "message": "Support requested for order #1001",
  "updatedOrders": [
    {
      "id": "gid://shopify/Order/1234567890",
      "supportThread": "conversation:c8a1b2c3d4e5f6"
    }
  ]
}
```

**Default Message**: "Support requested…"

### 4. `/sync/orders/returns`
**Purpose**: Advance the returns state machine and trigger ERP integration

**Request Body**:
```json
{
  "orderId": string,
  "action": string,
  "note"?: string,
  "shop_domain": string
}
```

**Response**:
```json
{
  "success": true,
  "message": "Return updated for order #1001",
  "updatedOrders": []
}
```

**Default Message**: "Return updated…"

**Note**: Returns endpoint returns empty `updatedOrders` array as no per-order patches are provided in the current implementation.

## Error Handling
When operations fail, the response envelope maintains the same structure:

```json
{
  "success": false,
  "message": "Error description",
  "updatedOrders": []
}
```

## Implementation Notes
- All endpoints are designed to work with Shopify GID format order identifiers
- The Sync service handles the actual persistence and Shopify/ERP integration
- Dashboard application is responsible for appending `shop_domain` context
- Response messages are standardized but can be customized by the Sync service
- The envelope structure is locked at v1.2 per MVP constraints

## Version Information
- **Version**: v1.2
- **Status**: Finalized and locked for MVP
- **Last Updated**: 2025-09-27
- **Owner**: Sync & Webhooks Service

## Integration Requirements
- Orders dashboard must use this envelope for all write operations
- Vitest coverage should validate against these exact payload structures
- Any contract mismatches should be logged in coordination files
- BullMQ worker remains feature-flagged/disabled for MVP
