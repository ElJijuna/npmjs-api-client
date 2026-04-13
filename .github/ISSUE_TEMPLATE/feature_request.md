---
name: Feature request
about: Suggest a new endpoint or capability
labels: enhancement
---

## Which npm API endpoint should be added?

<!-- e.g. PUT /-/package/:name/dist-tags/:tag -->

## Use case

<!-- Why is this endpoint useful? What problem does it solve? -->

## Proposed API surface

```typescript
// How you'd like to call it
await npm.package('my-pkg').addDistTag('beta', '1.0.0-beta.1');
```
