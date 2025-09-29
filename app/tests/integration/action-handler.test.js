import { describe, expect, test } from 'vitest';
import { json } from '@remix-run/node';
import { invokeAction } from './setup';
describe('action invocation helper', () => {
    const action = async ({ request }) => {
        const body = await request.json();
        if (!body || typeof body.value !== 'number') {
            return json({ error: 'invalid' }, { status: 400 });
        }
        return json({ result: body.value * 2 });
    };
    test('returns JSON payload when request body is valid', async () => {
        const request = new Request('http://localhost', {
            method: 'POST',
            body: JSON.stringify({ value: 5 }),
            headers: { 'Content-Type': 'application/json' }
        });
        const response = await invokeAction(action, { request });
        expect(response.status).toBe(200);
        const payload = await response.json();
        expect(payload).toEqual({ result: 10 });
    });
    test('bubbles status codes for validation errors', async () => {
        const request = new Request('http://localhost', {
            method: 'POST',
            body: JSON.stringify({ foo: 'bar' }),
            headers: { 'Content-Type': 'application/json' }
        });
        const response = await invokeAction(action, { request });
        expect(response.status).toBe(400);
        const payload = await response.json();
        expect(payload).toEqual({ error: 'invalid' });
    });
});
