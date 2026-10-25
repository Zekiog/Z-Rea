# SaaS RE report template

Copy this structure into the user-facing report. Keep each fact tagged.

## Header

- Target origin(s)
- Investigation date (UTC)
- REA package version / skill versions used
- Browser executable and capture mode (launch vs connect)
- Evidence artifact paths or Evidence IDs

## Observations

Facts taken directly from Evidence (URLs, status codes, script URLs, DOM text,
response header names that were retained, vendor hostnames).

## Derivations

Deterministic transforms of observations (path templates, sorted unique
origins, counts within examined coverage).

## Inferences

Hypotheses that go beyond the bytes (framework identity from fingerprints,
product architecture claims). Label confidence and the supporting Evidence.

## Unknowns

Questions that remain open, including walls (auth, bot mitigation), truncated
captures, and tools that were unavailable.

## Limitations

Authority and coverage bounds: no mutation, no credential use unless the
caller supplied and authorized secrets, no claim of complete API inventory.
