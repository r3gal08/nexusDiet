# Proxy Code Review - Bugs & Maintenance

**Date:** 2026-03-02
**Status:** Documented / Partially Resolved
**Focus:** Reliability, Security, and Cleanup of the Go Tracker and mitmproxy Bridge.

---

## 1. Security & Robustness

### [BUG-03] Memory Exhaustion Vulnerability
- **File:** `proxy/internal/ingestion/handler.go`
- **Issue:** The server accepts `POST` requests of any size. A large HTML payload could exhaust the server's memory.
- **Status:** **TODO added** in code.
- **Recommendation:** Implement `http.MaxBytesReader(w, r.Body, 10<<20)` to cap requests at 10MB.

### [BUG-04] Lack of Graceful Shutdown
- **File:** `proxy/cmd/tracker/main.go`
- **Issue:** The server uses `http.ListenAndServe`, which terminates abruptly on SIGINT/SIGTERM. This can drop in-flight requests and cause data loss during deployment or restarts.
- **Status:** **TODO added** in code.
- **Recommendation:** Use `http.Server.Shutdown(ctx)` with a signal listener for SIGINT/SIGTERM.

---

## 2. Terminal & Logging Noise

### Full Article Body Logging
- **File:** `proxy/internal/ingestion/handler.go:58`
- **Issue:** `log.Printf("[Ingestion] Description:  %s\n", result.ContentClean)` logs the entire decrypted article text. For long articles, this floods the terminal and hides useful debug information.
- **Recommendation:** Remove this line or truncate the output to the first 100 characters.

---

## 3. Configuration & Portability

### Hardcoded mitmproxy Path
- **File:** `proxy/bridge/bridge.sh:5`
- **Issue:** The script calls `/opt/mitm/mitmweb` directly. This path is environment-specific and will break if mitmproxy is installed via `pip` or in a different location.
- **Recommendation:** Use `mitmweb` (relying on PATH) or define it as a configurable variable.

---

## 4. Maintenance Cleanup

### Stale Library TODO
- **File:** `proxy/internal/parser/content.go:3`
- **Issue:** `// TODO: Update readbility packge to: codeberg.org/readeck/go-readability/v2`.
- **Status:** Decision made to stay on `go-shiori` for now. This comment should be removed to avoid confusion.

### Asyncio in Requirements
- **File:** `proxy/bridge/requirements.txt`
- **Issue:** `asyncio` was listed as a dependency, but it is a Python standard library module.
- **Status:** **RESOLVED** (Removed from file).
