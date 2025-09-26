import { describe, expect, test } from 'vitest';
import { json, type LoaderFunction } from '@remix-run/node';
import { invokeLoader } from './setup';

describe('orders loader integration', () => {
  const loader: LoaderFunction = async () => {
    return json({ orders: [{ id: '1001', status: 'open' }] });
  };

  test('hydrates orders list from loader response', async () => {
    const response = await invokeLoader(loader);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.orders).toHaveLength(1);
    expect(body.orders[0]).toMatchObject({ id: '1001', status: 'open' });
  });
});
