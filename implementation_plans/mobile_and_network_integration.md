# nexusDiet — Mobile & Network Integration Plan

> **Date:** 2026-02-22
> **Status:** Research / Discovery
> **Goal:** Extend nexusDiet beyond a desktop Chrome extension so it can track a user's "information diet" across phones, tablets, and all network-connected devices.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Option A: Progressive Web App (PWA)](#2-option-a-progressive-web-app-pwa)
3. [Option B: Hybrid Native App (Capacitor / Tauri)](#3-option-b-hybrid-native-app-capacitor--tauri)
4. [Option C: Firefox Android Extension](#4-option-c-firefox-android-extension)
5. [Option D: On-Phone Local VPN](#5-option-d-on-phone-local-vpn)
6. [Option E: Network-Level DNS Proxy](#6-option-e-network-level-dns-proxy)
7. [Recommended Roadmap](#7-recommended-roadmap)
8. [Unified Ecosystem Architecture](#8-unified-ecosystem-architecture)

---

## 1. Problem Statement

Most browsing happens on mobile devices, where Chrome extensions cannot run. The current nexusDiet architecture relies on:
- A **content script** injected into every page (captures content, read time, scroll depth).
- A **background service worker** that classifies and scores the content.
- **IndexedDB** for local, privacy-first storage.

None of these mechanisms are available in mobile browsers (except Firefox Android for extensions). We need alternative strategies for data collection on mobile, while preserving the privacy-first, local-storage philosophy.

---

## 2. Option A: Progressive Web App (PWA)

**Effort:** Low
**Timeline:** 1–2 weeks

### What It Is
A standalone web version of the nexusDiet dashboard, enhanced with a Web App Manifest and Service Worker so it can be "installed" on a phone's home screen and work offline.

### Data Collection Strategy
- **Share Intent / Web Share Target API:** Users share URLs from their mobile browser to the nexusDiet PWA via the OS share sheet.
- The PWA fetches the shared URL, runs Readability.js + the classifier, and stores the result in IndexedDB.
- This is **opt-in** — the user consciously chooses which pages to track.

### What's Needed
- A `manifest.webmanifest` (web app manifest, separate from the Chrome extension's `manifest.json`).
- A Service Worker for offline caching and background fetch.
- A "Share Target" registration in the web manifest.
- A landing page that receives shared URLs and processes them.

### Pros
- Reuses existing dashboard UI (Vanilla JS) and IndexedDB storage.
- No app store approval needed.
- Works on both Android and iOS.
- Aligns with privacy-first philosophy (all local).

### Cons
- Not autonomous — requires manual sharing.
- iOS Safari has limited PWA support (no Web Share Target API as of early 2026).
- Can't capture read time or scroll depth on the shared page.

---

## 3. Option B: Hybrid Native App (Capacitor / Tauri)

**Effort:** Medium
**Timeline:** 3–5 weeks

### What It Is
Wrap the existing web-based dashboard into a native app shell using [Capacitor](https://capacitorjs.com/) (Ionic team) or [Tauri Mobile](https://v2.tauri.app/). This produces a real app store binary (APK / IPA).

### Data Collection Strategy
- Same Share Intent approach as the PWA, but with native OS integration.
- Access to **native APIs**: notifications, background processing, accessibility services.
- Potential for more advanced collection (see Option D).

### What's Needed
- Capacitor or Tauri project scaffolding wrapping the existing dashboard.
- Native share intent handler.
- App store developer accounts ($25 Google Play one-time, $99/year Apple).

### Pros
- App store presence builds credibility.
- Native APIs enable richer features (notifications for daily diet summaries, widgets).
- Existing Vanilla JS code can be reused with minimal changes.

### Cons
- More build tooling and maintenance.
- App store review process (especially Apple).
- Still relies on share intent for data collection unless combined with VPN approach.

---

## 4. Option C: Firefox Android Extension

**Effort:** Low–Medium
**Timeline:** 1–2 weeks

### What It Is
Firefox on Android is the **only major mobile browser that supports extensions**. The existing nexusDiet extension could be ported to a Firefox-compatible version.

### What's Needed
- Adapt `manifest.json` from Manifest V3 (Chrome) to Firefox's supported format.
- Test content script and background script compatibility.
- Publish on [Firefox Add-ons](https://addons.mozilla.org/).

### Pros
- Full content analysis just like the desktop extension (content scripts work).
- Minimal code changes required.

### Cons
- Very limited audience — Firefox mobile market share is ~2-3%.
- Not a scalable long-term strategy.
- Good as a supplementary option, not a primary one.

---

## 5. Option D: On-Phone Local VPN

**Effort:** High
**Timeline:** 4–8 weeks

### What It Is
An Android app that creates a **local VPN tunnel** using Android's `VpnService` API. All device traffic routes through the app, allowing it to log visited domains. No root required.

### How It Works
1. App registers as a VPN provider (triggers an OS-level "VPN active" notification).
2. All DNS queries and TCP connections pass through the app.
3. App extracts the **domain name** from each request.
4. Domains are classified using a lookup table or the existing classifier.
5. For content-heavy domains, the app **re-fetches the URL** in the background and runs the full Readability + classifier pipeline.

### Three Levels of Depth

| Level | What You See | SSL Interception? |
|:------|:-------------|:-------------------|
| **DNS only** | Domain names (`nytimes.com`) | No |
| **DNS + re-fetch** | Domain + full content analysis for content sites | No |
| **Full MITM proxy** | Complete URLs + page content | Yes (requires custom CA cert install) |

> **Recommendation:** Level 2 (DNS + re-fetch) is the sweet spot. It avoids the privacy and trust issues of SSL interception while still enabling content classification.

### Pros
- Fully autonomous — no user action required after setup.
- Works across all apps and browsers on the device.
- Data stays local on the phone.

### Cons
- Android only (iOS is extremely restrictive with `NEPacketTunnelProvider`).
- "VPN active" notification may concern users.
- Battery drain from routing all traffic through the app.
- Google Play scrutinizes VPN apps heavily.
- Modern phones randomize MAC addresses, complicating device identification.

---

## 6. Option E: Network-Level DNS Proxy

**Effort:** Medium–High
**Timeline:** 3–6 weeks
**Language Options:** Node.js or **Go** (excellent fit for network services)

### What It Is
A **Pi-hole-style DNS server** that runs on a device on the local network (Raspberry Pi, NAS, Docker container, old laptop). All devices on the Wi-Fi use it as their DNS server. Instead of (or in addition to) blocking ads, it **logs and classifies** every domain visited by every device.

### Architecture

```
                         ┌──────────────┐
  ┌──────────┐           │              │           ┌──────────┐
  │  Phone A │───┐       │  nexusDiet   │       ┌───│ Internet │
  │ (Alice)  │   │       │  DNS Proxy   │       │   └──────────┘
  └──────────┘   ├──DNS──│  (Pi / NAS)  │──DNS──┤
  ┌──────────┐   │       │              │       │
  │ Laptop B │───┤       └──────┬───────┘       │
  │  (Bob)   │   │              │               │
  └──────────┘   │        ┌─────▼──────┐        │
  ┌──────────┐   │        │  Local DB  │        │
  │ Tablet C │───┘        │ (SQLite /  │        │
  │ (Alice)  │            │  Postgres) │        │
  └──────────┘            └─────┬──────┘
                                │
                          ┌─────▼──────┐
                          │ Dashboard  │
                          │ (Web UI)   │
                          └────────────┘
```

### How It Works
1. Router DNS is set to the proxy's IP (one-time config).
2. Every device on the network sends DNS queries to the proxy.
3. Proxy resolves the query normally (forwarding to upstream DNS like 1.1.1.1).
4. Simultaneously logs: `{ timestamp, domain, deviceIP }`.
5. Maps `deviceIP` → user profile (via DHCP reservation, MAC, or dashboard login).
6. Classifies domain using a lookup table or re-fetch + classifier.
7. Dashboard shows per-user information diet analytics.

### Multi-User Device Identification

| Method | How It Works | Reliability |
|:-------|:-------------|:------------|
| **IP Address** | DHCP lease → map IP to user via static assignments | ⭐⭐⭐ Good |
| **MAC Address** | Hardware ID per device | ⭐⭐⭐ Good (but phones may randomize) |
| **Device hostname** | mDNS name (e.g., "Alice's iPhone") | ⭐⭐ Decent |
| **Dashboard login** | New device visits dashboard → "Who are you?" | ⭐⭐⭐⭐ Best UX |

### Tech Stack Options

**Option 1: Node.js**
- DNS server: `dns2` or `native-dns` npm packages.
- Classifier: Reuse existing `classifier.js` directly.
- Dashboard: Reuse existing dashboard code.
- DB: SQLite via `better-sqlite3`, or keep IndexedDB in the browser.

**Option 2: Go (Golang)**
- DNS server: `miekg/dns` — a battle-tested, high-performance DNS library.
- Proxy: Go's `net/http` standard library is excellent for proxy servers.
- Classifier: Rewrite `classifier.js` logic in Go, or call a Node.js microservice.
- Dashboard: Serve static files (reuse existing dashboard) or build with Go templates.
- DB: SQLite via `mattn/go-sqlite3`, or PostgreSQL for more scale.
- **Why Go is a great fit:** Low memory footprint, single binary deployment, excellent concurrency model for handling many simultaneous DNS queries, ideal for running on a Raspberry Pi.

### Proposed File Structure (Go)

```
nexusDiet-network/
├── cmd/
│   └── server/
│       └── main.go              # Entry point
├── internal/
│   ├── dns/
│   │   └── server.go            # DNS listener + logger
│   ├── classifier/
│   │   └── classifier.go        # Domain/content classification
│   ├── fetcher/
│   │   └── fetcher.go           # Re-fetch URLs for deep analysis
│   ├── devices/
│   │   └── manager.go           # IP/MAC → user profile mapping
│   └── storage/
│       └── sqlite.go            # Local database layer
├── web/
│   ├── dashboard/               # Reuse existing dashboard HTML/JS/CSS
│   └── api/
│       └── handlers.go          # REST API for dashboard data
├── go.mod
├── go.sum
├── Dockerfile
└── docker-compose.yml           # Easy deployment
```

### Pros
- **Device-agnostic** — works on iPhones, Androids, laptops, smart TVs, anything on the Wi-Fi.
- **Zero install on client devices** — just change DNS setting on the router once.
- **Multi-user by design** — different devices = different users.
- **Privacy-respecting** — all data stays on the local network.
- **Pairs perfectly** with the Chrome extension for deep content analysis.
- Great self-hosted / homelab project.

### Cons
- Not viable as a consumer product (requires network configuration).
- Needs an always-on device (Raspberry Pi ~$35, ~5W power draw).
- Only captures domains without SSL interception (re-fetch compensates).
- Guest devices and IoT gadgets generate noise (need filtering).
- DNS-over-HTTPS (DoH) in browsers can bypass the proxy (can be mitigated by blocking DoH endpoints).

---

## 7. Recommended Roadmap

A phased approach that builds incrementally:

### Phase 1: PWA + Share Intent (Weeks 1–2)
> *Get on mobile quickly with minimal effort.*

- Convert the existing dashboard into a standalone PWA.
- Add Web Share Target so users can share URLs from their phone browser.
- Shared URLs are fetched, classified, and stored locally.
- **Result:** Mobile users can manually track content they find interesting.

### Phase 2: Network DNS Proxy (Weeks 3–6)
> *Add autonomous, whole-network tracking.*

- Build the DNS proxy server (Node.js or Go).
- Implement domain-level classification via lookup table.
- Add multi-user device identification.
- Build a household dashboard showing per-user diet stats.
- Deploy on a Raspberry Pi or Docker container.
- **Result:** Passive tracking of all devices on the home network.

### Phase 3: Hybrid Deep Analysis (Weeks 6–8)
> *Combine the best of both worlds.*

- DNS proxy detects content-heavy domains.
- Background re-fetch + Readability + classifier for deep analysis.
- Chrome extension continues to provide the richest data (read time, scroll depth, full content).
- All data sources feed into a unified dashboard.
- **Result:** Multi-layered information diet tracking at varying levels of depth.

### Phase 4 (Optional): Native Mobile App
> *For app store distribution or VPN-based tracking.*

- Wrap PWA in Capacitor for Android/iOS distribution.
- Optionally add local VPN for on-device autonomous tracking.
- **Result:** Standalone mobile app that works without the network proxy.

---

## 8. Unified Ecosystem Architecture

The long-term vision: multiple data collection methods feeding a shared analysis and visualization layer.

```
┌─────────────────────────────────────────────────────────────┐
│                    nexusDiet Ecosystem                      │
│                                                             │
│  Data Collection Layer:                                     │
│  ┌─────────────┐  ┌────────────┐  ┌──────────────────────┐ │
│  │   Chrome     │  │   PWA /    │  │   Network DNS Proxy  │ │
│  │  Extension   │  │  Share     │  │   (Pi-hole style)    │ │
│  │ (deep content│  │  Intent    │  │  (domain-level,      │ │
│  │  analysis)   │  │ (manual)   │  │   all devices)       │ │
│  └──────┬───────┘  └─────┬──────┘  └──────────┬───────────┘ │
│         │                │                     │             │
│         ▼                ▼                     ▼             │
│  ┌──────────────────────────────────────────────────┐       │
│  │           Shared Classifier Engine               │       │
│  │  (classifier.js / classifier.go)                 │       │
│  │  - Category assignment                           │       │
│  │  - Nutrition scoring                             │       │
│  │  - Readability.js content extraction             │       │
│  └──────────────────────┬───────────────────────────┘       │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────┐       │
│  │           Unified Dashboard                      │       │
│  │  - Per-user views                                │       │
│  │  - Household aggregate view                      │       │
│  │  - Data source indicators                        │       │
│  │    (extension / shared / passive)                │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## Open Questions for Future Discussion

1. **Go vs Node.js for the DNS proxy?** Go has advantages for network services (performance, single binary, low memory). Node.js has the advantage of reusing `classifier.js` directly.
2. **Database choice for the network proxy?** SQLite is simplest. PostgreSQL if multi-device dashboard access is needed.
3. **How to handle DNS-over-HTTPS (DoH)?** Modern browsers may bypass the DNS proxy. Options: block known DoH endpoints, or use the proxy as an HTTP proxy instead.
4. **Should the Chrome extension sync data to the network proxy?** This would unify all data in one place but adds complexity.
5. **Domain classification database:** Curate a list of domains + categories, or dynamically classify via re-fetch?
