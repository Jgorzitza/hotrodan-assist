import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { createRemixStub } from '@remix-run/testing';

export const createLoaderTestHarness = (loader: LoaderFunction) => {
  return createRemixStub([{ path: '/', loader }]);
};

export const createActionTestHarness = (action: ActionFunction) => {
  return createRemixStub([{ path: '/', action }]);
};
