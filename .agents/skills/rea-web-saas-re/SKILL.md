---
name: rea-web-saas-re
description: Reverse-engineer public SaaS web products with REA browser scenarios, passive CDP observation, web-bundle analysis, and Evidence-disciplined reporting. Use for marketing/app origins such as lovable.dev or replit.com when the question depends on shipped page behavior, network surface, or client bundles—not for ordinary open-source repo architecture.
---

# REA web SaaS reverse engineering

Extend [reverse-engineer-anything](../reverse-engineer-anything/SKILL.md). Prefer
its routing, Evidence rules, and recovery guides. This skill selects the
public-SaaS workflow and report shape; it does not add mutation, login bypass,
or target-execution authority.

Read the detailed playbook in
[web SaaS products](../reverse-engineer-anything/references/web-saas-products.md)
and [runtime observation](../reverse-engineer-anything/references/runtime-observation.md).

## When to use

Use this skill when the user asks how a **public web product** is built or
behaves from the **shipped client surface**: frameworks, APIs, auth posture,
feature gates, third-party vendors, or client bundle structure.

Do **not** use REA for ordinary analysis of a complete source repository the
user already has locally. Do **not** attempt credential stuffing, CAPTCHA
defeat, paywall bypass, or unauthorized mutation of the remote product.

## Workflow (smallest sufficient Evidence)

1. **Pin the question.** Name the analyst question, allowed origins, and what
   would falsify an answer. Record host, REA package version, and browser
   executable path.
2. **Scenario first (agent-driven).** Prefer
   `capture_browser_scenario` / `rea capture-browser-scenario` in launch mode
   with a caller-selected Chromium-family executable. Request only the
   artifacts that answer the question (`url`, `dom`, `accessibility`,
   `network`, optional network content). Wait for a concrete ready condition
   before final capture. Service workers default to blocked; set
   `environment.service_workers: "allow"` only when the product requires them.
3. **Passive follow-up.** For deeper script or WebMCP inventory, start a
   disposable Chrome with `--remote-debugging-port` on loopback, navigate to
   the settled URL, then `list_browser_targets` → `inspect_web_page` /
   `analyze_web_bundle` / `discover_webmcp_tools` as needed.
4. **Project, do not re-fetch.** Use `inspect_analysis_view` on retained
   Evidence (for example API-surface pages from network captures) instead of
   repeating producers. Prefer `detail: "summary"` when advertised.
5. **Export when survival matters.** Save CLI JSON Evidence under an
   investigation-owned directory before the process exits if later comparison
   or reporting depends on it.
6. **Report with provenance.** Separate observations, derivations, inferences,
   and unknowns. Cite Evidence IDs, digests, URLs, and capture timestamps.
   Never claim completeness beyond examined coverage.

## Local CLI skeleton

```bash
# From a built checkout; prefer the pinned Node from .nvmrc on PATH.
rea capture-browser-scenario ./scenario.json --json > capture.json
```

Minimal launch scenario shape (replace executable and URL):

```json
{
  "browser": {
    "mode": "launch",
    "executable_path": "/usr/bin/google-chrome-stable",
    "headless": true
  },
  "start_url": { "url": "https://example.com/" },
  "environment": { "service_workers": "allow" },
  "actions": [
    { "step_id": "settle", "action": "wait_for_timeout", "duration_ms": 5000 }
  ],
  "capture": {
    "at_end": ["dom", "accessibility", "url"],
    "events": ["network", "console", "page-errors"]
  }
}
```

Passive bundle follow-up:

```bash
google-chrome-stable \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/rea-saas-profile \
  --headless=new \
  about:blank &
# navigate or open the target, then:
rea list-browser-targets http://127.0.0.1:9222 --json
rea analyze-web-bundle http://127.0.0.1:9222 TARGET_ID --json
```

## Efficiency rules

Follow [AGENTS.md performance priorities](../../../AGENTS.md#performance):

1. Smallest sufficient answer with provenance.
2. Reuse retained Evidence; do not re-capture for facts already retained.
3. Bound observation windows, network content budgets, and analyzer heaps.

For optimization work on REA itself, hand off to
[rea-analysis-optimization](../rea-analysis-optimization/SKILL.md).

## Report checklist

- Scope and method (REA version, scenario path, browser path, timestamps)
- Observed surface (origins, routes, third parties, notable DOM/a11y text)
- Network/API candidates (method + origin + path template) with Evidence IDs
- Client stack fingerprints (only when derived from retained scripts/headers)
- Auth and protection observations (cookies present/absent without values;
  CAPTCHA/WAF only if observed)
- Limitations and unknowns (login walls, bot challenges, truncated budgets)
