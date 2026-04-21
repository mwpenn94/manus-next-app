# Uptime Log — §L.30

> Per-project uptime metrics.
> Target: 99.9% uptime for deployed applications.

## Current Monitoring

| Project | Deploy URL | Monitoring | Uptime (30d) | Last Check |
|---------|-----------|-----------|-------------|-----------|
| manus-next-app | `*.manus.space` | Manus Analytics | — | 2026-04-21 |

## Uptime Events

| # | Timestamp | Duration | Type | Root Cause | Resolution |
|---|-----------|----------|------|-----------|-----------|
| — | — | — | — | No downtime events recorded | — |

## Monitoring Infrastructure

| Component | Provider | Tier | Cost |
|-----------|---------|------|------|
| HTTP health checks | Manus Platform | Built-in | $0 |
| Analytics (UV/PV) | Manus Analytics | Built-in | $0 |
| Error tracking | Console logs + `.manus-logs/` | Built-in | $0 |
| SSL certificate | Manus Platform (auto) | Built-in | $0 |

## Future Monitoring (per §L.30 Phase F)

When self-hosted infrastructure is activated:

| Component | Recommended | License | Cost |
|-----------|------------|---------|------|
| Uptime monitoring | Uptime Kuma | MIT | $0 (self-hosted) |
| Error tracking | GlitchTip | MIT | $0 (self-hosted) |
| APM/Tracing | Jaeger + OpenTelemetry | Apache 2.0 | $0 (self-hosted) |
| Log aggregation | Loki + Grafana | AGPL-3.0 | $0 (self-hosted) |
