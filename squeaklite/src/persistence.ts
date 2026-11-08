export interface StorageStatus {
  mode: "memory" | "opfs";
  state: "unavailable" | "ready" | "saved" | "error";
  message: string;
  savedAt?: string;
  restored?: boolean;
}
export interface Snapshot {
  active: string;
  dirty: string[];
  entries: { path: string; data: Blob | Uint8Array }[];
}
interface Manifest {
  version: 1;
  directory: string;
  active: string;
  dirty: string[];
  savedAt: string;
  files: { path: string; key: string }[];
}

// Versioned directories + a final atomic HEAD replacement keep the last
// successful snapshot intact if a write fails or the tab disappears midway.
export class WorkspaceStorage {
  status: StorageStatus = {
    mode: "memory",
    state: "unavailable",
    message: "Memory only · export to keep changes",
  };
  private root?: FileSystemDirectoryHandle;
  private head?: Manifest;
  private writable = false;

  async initialize(
    storage = globalThis.navigator?.storage,
    origin = globalThis.location?.origin,
  ): Promise<Snapshot | null> {
    if (
      !origin ||
      !/^https?:\/\//.test(origin) ||
      !storage?.getDirectory ||
      !globalThis.navigator?.locks
    )
      return null;
    try {
      const acquired = await new Promise<boolean>((resolve) => {
        navigator.locks
          .request("squeaklite-workspace", { ifAvailable: true }, (lock) => {
            resolve(Boolean(lock));
            // Keep the lock until this worker/tab exits. Other tabs stay memory-only.
            return lock ? new Promise<void>(() => {}) : undefined;
          })
          .catch(() => resolve(false));
      });
      if (!acquired) {
        this.status.message = "Memory only · workspace open in another tab";
        return null;
      }
      this.root = await (
        await storage.getDirectory()
      ).getDirectoryHandle("squeaklite-v1", { create: true });
      let text: string;
      try {
        text = await (
          await (await this.root.getFileHandle("HEAD.json")).getFile()
        ).text();
      } catch (error) {
        if (!(error instanceof DOMException) || error.name !== "NotFoundError")
          throw error;
        this.writable = true;
        this.status = {
          mode: "opfs",
          state: "ready",
          message: "Autosave ready",
        };
        return null;
      }
      const head: Manifest = JSON.parse(text);
      if (
        head.version !== 1 ||
        !/^snapshot-[\w-]+$/.test(head.directory) ||
        !Array.isArray(head.files) ||
        !Array.isArray(head.dirty) ||
        typeof head.active !== "string"
      )
        throw new Error("Invalid saved workspace");
      const directory = await this.root.getDirectoryHandle(head.directory);
      const entries: Snapshot["entries"] = [];
      const paths = new Set<string>();
      for (const file of head.files) {
        if (
          typeof file.path !== "string" ||
          !/^\d+$/.test(file.key) ||
          paths.has(file.path)
        )
          throw new Error("Invalid saved file");
        paths.add(file.path);
        entries.push({
          path: file.path,
          data: await (await directory.getFileHandle(file.key)).getFile(),
        });
      }
      if (!paths.has(head.active)) throw new Error("Saved database is missing");
      this.head = head;
      this.status = {
        mode: "opfs",
        state: "saved",
        message: "Workspace restored · autosave on",
        savedAt: head.savedAt,
        restored: true,
      };
      // Enable writes only AFTER SQLite has successfully opened the snapshot.
      return { active: head.active, dirty: head.dirty, entries };
    } catch (error) {
      this.fail(
        error,
        "Saved workspace unavailable; original snapshot preserved",
      );
      return null;
    }
  }
  allowWrites() {
    this.writable = Boolean(this.root);
  }
  fail(error: unknown, prefix = "Autosave failed · export your changes") {
    this.status = {
      ...this.status,
      state: "error",
      message: `${prefix}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  async save(snapshot: () => Snapshot) {
    if (!this.root || !this.writable) return;
    let directoryName: string | undefined;
    try {
      const data = snapshot(); // May fail with an open SQL transaction.
      directoryName = `snapshot-${crypto.randomUUID()}`;
      const directory = await this.root.getDirectoryHandle(directoryName, {
        create: true,
      });
      const files: Manifest["files"] = [];
      for (const [index, entry] of data.entries.entries()) {
        const key = String(index);
        const writer = await (
          await directory.getFileHandle(key, { create: true })
        ).createWritable();
        try {
          // Blob/File inputs stream through the browser; no ZIP or full-workspace buffer.
          await writer.write(
            entry.data instanceof Uint8Array
              ? new Uint8Array(entry.data)
              : entry.data,
          );
          await writer.close();
        } catch (error) {
          await writer.abort().catch(() => {});
          throw error;
        }
        files.push({ path: entry.path, key });
      }
      const head: Manifest = {
        version: 1,
        directory: directoryName,
        active: data.active,
        dirty: data.dirty,
        files,
        savedAt: new Date().toISOString(),
      };
      const writer = await (
        await this.root.getFileHandle("HEAD.json", { create: true })
      ).createWritable();
      try {
        await writer.write(JSON.stringify(head));
        await writer.close();
      } catch (error) {
        await writer.abort().catch(() => {});
        throw error;
      }
      const previous = this.head;
      this.head = head;
      this.status = {
        mode: "opfs",
        state: "saved",
        message: "Saved locally · export for backup",
        savedAt: head.savedAt,
      };
      if (previous)
        await this.root
          .removeEntry(previous.directory, { recursive: true })
          .catch(() => {});
    } catch (error) {
      this.fail(error);
      if (directoryName && directoryName !== this.head?.directory)
        await this.root
          .removeEntry(directoryName, { recursive: true })
          .catch(() => {});
    }
  }
}
