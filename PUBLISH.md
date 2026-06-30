# Publishing

```bash
npm login
npm version patch
npm run build
npm run test:coverage
npm publish
git push origin master --tags
```

## Checklist

- [ ] npm run lint && npm run typecheck
- [ ] npm run build
- [ ] npm run test:coverage (2,544+ tests passing)
- [ ] Cross-check SUMMARY.md, README.md, ARCHITECTURE.md module lists before tagging
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] npm login verified
