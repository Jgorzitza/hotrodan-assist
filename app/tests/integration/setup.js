import { json } from '@remix-run/node';
const normalize = async (result) => {
    if (result instanceof Response) {
        return result;
    }
    return json(result);
};
export const invokeLoader = async (loader, { request = new Request('http://localhost'), params = {}, context } = {}) => {
    const ctx = context ?? {};
    const result = await loader({ request, params, context: ctx });
    return normalize(result);
};
export const invokeAction = async (action, { request = new Request('http://localhost', { method: 'POST' }), params = {}, context } = {}) => {
    const ctx = context ?? {};
    const result = await action({ request, params, context: ctx });
    return normalize(result);
};
