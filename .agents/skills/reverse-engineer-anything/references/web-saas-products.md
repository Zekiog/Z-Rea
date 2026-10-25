# Public SaaS web products

Use this reference when reverse-engineering a **public multi-tenant web
product** (marketing site, signed-out app shell, or caller-authorized signed-in
session) with REA. It extends
[runtime observation](runtime-observation.md) and
[JavaScript applications](javascript-applications.md). For the agent workflow
and report checklist, also load the
[`rea-web-saas-re`](../../rea-web-saas-re/SKILL.md) skill.

## Authority boundary

- Observation and declared scenario actions only. Do not claim REA mutated
  remote product state beyond those declared navigations and interactions.
- Do not defeat CAPTCHA, paywalls, or access controls. If a challenge appears,
  record it as an observation and stop expanding that path.
- Credentials and secrets are caller-supplied and declared. Redact retained
  credential headers and declared secret values automatically; do not invent
  secrecy from name patterns alone.
- Native engines (Hopper, Ghidra, IDA) are unrelated to ordinary SaaS page work.

## Choose the capture mode

| Analyst need                        | First tool                                     | Notes                                                                                                  |
| ----------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Agent must open or drive the site   | `capture_browser_scenario`                     | Launch mode with absolute Chromium executable; select `at_end` artifacts and `events` for the question |
| User already has a page open        | `list_browser_targets` then `inspect_web_page` | Passive; no clicks or navigation by REA                                                                |
| Bundle graph, routes, vendors       | `analyze_web_bundle`                           | After a settled page target exists                                                                     |
| Historical HAR/SAZ                  | `inspect_web_network_capture`                  | Offline; does not fetch recorded URLs                                                                  |
| API inventory from retained traffic | `inspect_analysis_view` kind `api-surface`     | Group by method/origin/path template; templates are inferences                                         |

## Scenario defaults that matter for SaaS

- Prefer launch mode so cleanup owns the temporary profile.
- Set `environment.service_workers` to `allow` when the product is an SPA that
  registers workers; the default `block` rejects controlled pages.
- Wait for a page-specific ready condition when possible; a bare timeout is a
  weaker readiness claim and must be stated as such.
- Request network content (`request_body` / `response_body` / `header_values`)
  only when the question needs it; raise `capture.limits` deliberately.
- Keep `start_url` and later navigations on the caller-approved origins.

## Reading results without overclaiming

- Scenario step `completeness: complete` covers only requested artifacts.
- Missing an unrequested artifact is `not_requested`, not proof of absence.
- Path templates and vendor fingerprints are candidates until corroborated.
- A bundle observed at runtime does not prove every module executed.
- Bot walls, geo blocks, and A/B variants make single-capture conclusions
  provisional; record the response status and challenge markers you saw.

## Suggested Evidence retention layout

Keep investigation-owned JSON next to working notes, not in the REA package:

```text
captures/<product>/<timestamp>/
  scenario.json
  capture.json
  web-bundle.json   # optional passive follow-up
```

Cite digests and Evidence IDs from those files in the final report.
