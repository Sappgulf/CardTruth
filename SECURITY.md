# Security

CardTruth is currently designed as a **local inspection tool**, not a public multi-tenant service.

## Please report privately

Do not publish an issue containing private card photos, certificate numbers, filesystem paths, or exploitable details. Until a dedicated security mailbox is established, open a minimal GitHub issue stating that you found a security problem and omit sensitive reproduction data.

## Security boundaries

- The standalone browser app does not require accounts, analytics, remote inference, or automatic uploads.
- The FastAPI service is intended for loopback/local use. Do not expose it directly to the public internet.
- `.ctscan.json` checksums detect accidental or deliberate file modification. They are **not digital signatures, trusted timestamps, proof of ownership, or proof of authenticity**.
- Imported reports and image inputs are size-limited and structurally validated, but CardTruth should still be run with normal OS/browser sandboxing.

## Secrets

Never commit API keys, cloud credentials, user submission databases, or private model weights. `models/private/` and `captures/` are ignored intentionally.
