import { WorkspaceStorage } from "./persistence.ts";
export function handle(engine) {
  const prepared = Promise.resolve(engine).then((e) => {
    e.persistence = new WorkspaceStorage();
    return e;
  });
  const saves = new Set([
    "demo",
    "importFiles",
    "open",
    "saveText",
    "fileApply",
    "databaseApply",
    "schemaApply",
    "edit",
    "editMany",
    "deleteRows",
    "query",
  ]);
  let queue = Promise.resolve();
  self.onmessage = ({ data: { id, method, args } }) => {
    queue = queue.then(async () => {
      try {
        const e = await prepared;
        if (
          ![
            "initialize",
            "storageSave",
            "demo",
            "open",
            "workspace",
            "importFiles",
            "browse",
            "schema",
            "schemaReview",
            "schemaApply",
            "databaseReview",
            "databaseApply",
            "readFile",
            "saveText",
            "fileReview",
            "fileApply",
            "edit",
            "editMany",
            "deletionPlan",
            "deleteRows",
            "queryReview",
            "query",
            "export",
          ].includes(method)
        )
          throw new Error("Unknown operation");
        const beforeVersion = e.operationVersion;
        let result;
        try {
          result = await e[method](args);
        } finally {
          // Even a failed script may have committed earlier statements.
          if (
            saves.has(method) &&
            (method !== "query" || e.operationVersion !== beforeVersion)
          )
            await e.storageSave();
        }
        self.postMessage({ id, result, persistence: e.persistence.status });
      } catch (error) {
        const e = await prepared;
        self.postMessage({
          id,
          error: error.message || String(error),
          persistence: e.persistence.status,
        });
      }
    });
  };
}
