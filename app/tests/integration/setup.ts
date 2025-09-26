import { json, type ActionFunction, type AppLoadContext, type LoaderFunction } from '@remix-run/node';

interface InvokeOptions {
  request?: Request;
  params?: Record<string, string>;
  context?: AppLoadContext;
}

const normalize = async (result: Awaited<ReturnType<LoaderFunction | ActionFunction>>) => {
  if (result instanceof Response) {
    return result;
  }
  return json(result);
};

export const invokeLoader = async (
  loader: LoaderFunction,
  { request = new Request('http://localhost'), params = {}, context }: InvokeOptions = {}
) => {
  const ctx = context ?? ({} as AppLoadContext);
  const result = await loader({ request, params, context: ctx });
  return normalize(result);
};

export const invokeAction = async (
  action: ActionFunction,
  { request = new Request('http://localhost', { method: 'POST' }), params = {}, context }: InvokeOptions = {}
) => {
  const ctx = context ?? ({} as AppLoadContext);
  const result = await action({ request, params, context: ctx });
  return normalize(result);
};
