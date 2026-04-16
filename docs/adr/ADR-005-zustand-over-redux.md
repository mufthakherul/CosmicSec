# ADR-005: Why Zustand (vs Redux Toolkit, Jotai, MobX)

**Status**: Accepted  
**Date**: 2026-01-20  
**Authors**: CosmicSec Frontend Team

## Context

The CosmicSec React frontend requires state management for: authentication, active scan state, real-time WebSocket data, notifications, and theme preferences.

## Decision

We chose **Zustand** for frontend state management.

## Rationale

| Criterion | Zustand | Redux Toolkit | Jotai | MobX |
|-----------|---------|--------------|-------|------|
| **Bundle size** | ✅ 1.1 KB | ⚠️ 12 KB | ✅ 3 KB | ⚠️ 20 KB |
| **Boilerplate** | ✅ Minimal | ⚠️ Slices, reducers | ✅ Atomic | ⚠️ Decorators |
| **TypeScript** | ✅ Excellent | ✅ Excellent | ✅ Good | ⚠️ Complex |
| **Async actions** | ✅ Simple | ⚠️ Thunks/sagas | ⚠️ Derived atoms | ✅ Reactions |
| **DevTools** | ✅ Middleware | ✅ Redux DevTools | ⚠️ Limited | ✅ Good |
| **Persistence** | ✅ `persist` middleware | ⚠️ redux-persist | ⚠️ Manual | ⚠️ Manual |
| **Learning curve** | ✅ Very low | ⚠️ Medium | ✅ Low | ⚠️ High |

## Store Design

```typescript
// services/scanStore.ts — Zustand with persistence
const useScanStore = create<ScanState>()(
  persist(
    (set) => ({
      scans: [],
      activeScanId: null,
      addScan: (scan) => set((s) => ({ scans: [scan, ...s.scans] })),
    }),
    { name: 'cosmicsec-scans' }
  )
)
```

## Consequences

- **Positive**: ~1 KB bundle impact vs ~12 KB for Redux Toolkit
- **Positive**: Mutations feel natural — no action/reducer split for simple state
- **Positive**: `persist` middleware handles localStorage automatically
- **Negative**: Less opinionated — team must agree on store structure conventions
- **Mitigation**: Each store domain has its own file (`scanStore.ts`, `authStore.ts`) with explicit typed interfaces
