# Summary
- 

# Related Task Or Issue
- 

# Change Type
- [ ] Bug fix
- [ ] Feature
- [ ] Documentation
- [ ] CI or release workflow
- [ ] Security hardening
- [ ] Refactor or maintenance

# Safety And Security Impact
- 

# Localization Impact
- [ ] No localization impact
- [ ] English user-facing text changed
- [ ] Turkish user-facing text changed
- [ ] JSON/schema output changed

# Generated Files Impact
- [ ] No generated files changed
- [ ] Agent instruction templates changed
- [ ] Report/Web UI/prompt-pack/context-export output changed
- [ ] Generated output was local-only and not committed

# Tests Run
```powershell

```

# Checklist
- [ ] `pnpm lint && pnpm format:check && pnpm typecheck`
- [ ] `pnpm build && pnpm test`
- [ ] `node dist/cli/index.js scan --ci`
- [ ] `node dist/cli/index.js doctor`
- [ ] Docs updated where needed
- [ ] No secrets, private config, or private repository content committed
- [ ] No archives, packages, `dist/`, `node_modules/`, reports, or generated junk committed
- [ ] No force-push, tag, GitHub Release, npm/NuGet publish, or remote side effect beyond the described branch change included
