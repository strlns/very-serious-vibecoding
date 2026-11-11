import createWorker from "#database-worker";
import type { Engine } from "./engine.mjs";

// The protocol's operation names, arguments and results come from the engine.
// Existing JSX callers can migrate incrementally without a second API contract.
export type WorkerMethod =
  | "initialize"
  | "storageSave"
  | "demo"
  | "open"
  | "workspace"
  | "importFiles"
  | "browse"
  | "schema"
  | "schemaReview"
  | "schemaApply"
  | "databaseReview"
  | "databaseApply"
  | "readFile"
  | "saveText"
  | "fileReview"
  | "fileApply"
  | "edit"
  | "editMany"
  | "deletionPlan"
  | "deleteRows"
  | "queryReview"
  | "query"
  | "export";

type WorkerArgs<M extends WorkerMethod> =
  Parameters<Engine[M]> extends [] ? undefined : Parameters<Engine[M]>[0];
type WorkerResult<M extends WorkerMethod> = Awaited<ReturnType<Engine[M]>>;
interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}
import type { StorageStatus } from "./persistence.ts";
const storageListeners = new Set<(status: StorageStatus) => void>();
export function subscribeStorage(listener: (status: StorageStatus) => void) {
  storageListeners.add(listener);
  return () => {
    storageListeners.delete(listener);
  };
}
interface WorkerReply {
  persistence?: StorageStatus;
  id?: number;
  result?: unknown;
  error?: string;
}

const worker = createWorker();
let sequence = 0;
let failure: Error | undefined;
const pending = new Map<number, PendingRequest>();

worker.onmessage = ({ data }: MessageEvent<WorkerReply>) => {
  if (data.persistence)
    for (const listener of storageListeners) listener(data.persistence);
  if (data.id === undefined) return;
  const request = pending.get(data.id);
  if (!request) return;
  pending.delete(data.id);
  if (data.error) request.reject(new Error(data.error));
  else request.resolve(data.result);
};
worker.onerror = (event: ErrorEvent) => {
  failure = new Error(
    event.message || "Database worker failed. Reload to restart.",
  );
  for (const request of pending.values()) request.reject(failure);
  pending.clear();
};

export function rpc<M extends WorkerMethod>(
  method: M,
  args?: WorkerArgs<M>,
): Promise<WorkerResult<M>> {
  if (failure) return Promise.reject(failure);
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    // Structured cloning preserves the engine's return values, including BigInt.
    pending.set(id, {
      resolve: (value) => resolve(value as WorkerResult<M>),
      reject,
    });
    try {
      worker.postMessage({ id, method, args });
    } catch (error) {
      pending.delete(id);
      reject(error);
    }
  });
}
