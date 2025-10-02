/*
 * CSV Export – pagination test skeleton
 *
 * Expected behavior (to implement when route is ready):
 * - GET /api/inventory/export.csv?shop=<shop>&limit=<n>&cursor=<cursor>
 * - Returns 200 with Content-Type: text/csv; charset=utf-8
 * - Includes RFC 5988 Link header with rel="next" when more pages are available
 * - Respects limit and provides stable deterministic ordering across pages
 */

import { describe, it } from 'vitest'

describe('inventory CSV export (pagination)', () => {
  it.skip('returns CSV for first page and includes Link header for next page', async () => {
    // TODO: implement using test server harness once the route exists
    // Example (pseudo):
    // const res = await request(app).get('/api/inventory/export.csv?shop=hotrodan.com&limit=500')
    // expect(res.status).toBe(200)
    // expect(res.headers['content-type']).toMatch(/text\/csv/)
    // expect(res.headers['link']).toMatch(/rel="next"/)
    // expect(res.text.split('\n').length).toBeGreaterThan(1)
  })

  it.skip('supports cursor pagination and stable ordering', async () => {
    // TODO: implement: follow the next cursor and verify no duplicates/omissions
    // - Fetch second page using cursor from Link header
    // - Validate combined rows are unique and count matches expected total
  })
})
