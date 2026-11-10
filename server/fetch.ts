import { PassThrough } from 'node:stream';
﻿import { FetchIncomingMessage, FetchServerResponse, toReqRes, toFetchResponse } from 'fetch-to-node';
import { createApi } from './api.ts';
import type { Database } from './db.ts';

// Preserve the existing Express routes and middleware in a Fetch-based host.
export function createFetchApi(db: Database, encryptionKey: string) {
  const app = createApi(db, encryptionKey);
  Object.setPrototypeOf(app.request, Object.create(FetchIncomingMessage.prototype, Object.getOwnPropertyDescriptors(Object.getPrototypeOf(app.request))));
  Object.setPrototypeOf(app.response, Object.create(FetchServerResponse.prototype, Object.getOwnPropertyDescriptors(Object.getPrototypeOf(app.response))));
  return async (request: Request): Promise<Response> => {
    const { req, res } = toReqRes(request);
    // Fetch runtimes do not expose a trusted TCP peer. Keep a shared conservative
    // authentication throttle instead of trusting caller-supplied IP headers.
    const socket = new PassThrough();
    Object.defineProperty(req, 'socket', { value: socket, configurable: true });
    Object.defineProperty(req, 'ip', { value: '0.0.0.0', configurable: true });
    if (request.body && !req.headers['content-length']) req.headers['transfer-encoding'] = 'chunked';
    const response = toFetchResponse(res);
    app(req, res);
    return response.finally(() => socket.destroy());
  };
}
