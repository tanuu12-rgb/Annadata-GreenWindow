---
name: Portable upload schemas
description: Shared OpenAPI schemas are also consumed by the server-side Zod package.
---

When an upload endpoint is consumed by a server-only generated Zod package, prefer a portable encoded string field over `format: binary` unless the shared TypeScript config includes DOM types by design.

**Why:** Orval maps OpenAPI binary strings to `Blob`, which fails typechecking in the server-oriented schema package even though the browser client can represent the upload.

**How to apply:** Accept a data URL or encoded image string in the contract, and let the browser convert the selected file before calling the generated mutation.