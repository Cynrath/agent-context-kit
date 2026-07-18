# Synthetic repository instructions

## Verification

- Run `dotnet test Demo.sln` before every commit.
- Always run the full validation suite before commit.

## Tooling

- Use npm for JavaScript packages.

## Safety and release

- Never expose secrets or credentials.
- Never deploy to production without explicit approval.
- Never publish a release or move a tag without explicit approval.

## Documentation

- Update `README.md` and `CHANGELOG.md` for public behavior changes.

## Review quality

- Make it good.
- Keep the interface intuitive.
- Read `docs/missing-guide.md` before implementation.
