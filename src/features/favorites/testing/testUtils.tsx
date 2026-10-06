import { encode } from 'base-64';
import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { QueryClient, QueryClientProvider, onlineManager, focusManager } from '@tanstack/react-query';
import { defaultScheduler, notifyManager } from '@tanstack/query-core';
import { useAuthStore } from '../../../stores/auth.store';
import { advanceSessionGeneration } from '../../../core/queries/sessionScope';

jest.mock('../../../core/api/client', () => ({ api: { get: jest.fn(), put: jest.fn(), delete: jest.fn() } }));
jest.mock('../../../stores/auth.store', () => {
  const { create: createStore } = require('zustand');
  return { useAuthStore: createStore(() => ({ token: null, activeRole: null })) };
});
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
export function setUser(userId = 'A', role: 'CUSTOMER' | 'SALON_OWNER' = 'CUSTOMER') {
  act(() => { advanceSessionGeneration();
  useAuthStore.setState({ token: `x.${encode(JSON.stringify({ sub: userId, role }))}.x`, activeRole: role }); });
}
export const flush = async () => { await act(async () => { await new Promise<void>((r) => setTimeout(r, 0)); }); };
export function harness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } });
  const trees: ReactTestRenderer[] = [];
  return {
    client,
    async mount(children: React.ReactNode) {
      let tree!: ReactTestRenderer;
      await act(async () => { tree = create(<QueryClientProvider client={client}>{children}</QueryClientProvider>); });
      trees.push(tree);
      await flush();
      return tree;
    },
    async cleanup() { await act(async () => trees.forEach((tree) => tree.unmount())); client.clear(); },
  };
}
beforeEach(() => { jest.clearAllMocks(); notifyManager.setScheduler((cb) => cb()); onlineManager.setOnline(true); focusManager.setFocused(true); setUser(); });
afterEach(() => { notifyManager.setScheduler(defaultScheduler); onlineManager.setOnline(true); focusManager.setFocused(undefined); });
