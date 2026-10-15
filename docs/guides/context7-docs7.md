# Context7 indexing and Docs7 hosting

This guide describes documentation distribution only. It does not introduce network access into the agent-context-kit CLI or change the existing GitHub Pages website.

## 1. Indexing configuration

The repository root `context7.json` sets the library title, description, best-practice rules and current documentation folders. The README and maintained `docs/guides`, `docs/reference` and `docs/concepts` pages remain the source of truth. Historical tasks, generated output and tests are excluded.

Context7 library ID convention: `/cynrath/agent-context-kit`. **Check the actual library ID in your Context7 dashboard before claiming**. Registration and ownership are different steps.

## 2. Claim ownership (requires the owner's login)

1. Sign into [Context7](https://context7.com/dashboard).
2. Find this GitHub library, select **Manage** or navigate to its library URL followed by `/admin`.
3. Select **Claim Library**. Context7 shows a JSON snippet containing an exact `url` and a unique `public_key`.
4. Add those **exact** fields to the existing **root** `context7.json` on the default branch while keeping the other configuration fields. The Context7-provided `url` and `public_key` values must match the claim dialog exactly. Do not substitute an API key, generate a public key locally or add a dummy value.
5. Commit the file via the normal branch/PR workflow, merge after checks, then select **Claim Library** again.

The claim public key is intended to be published in the repository. Context7 API tokens, npm credentials and other secrets must **never** be added to the file.

## 3. Apply for the verified badge

Open the claimed library's **Admin** page and choose **Apply for Verification**. Context7 may grant the badge automatically based on reputation or quality thresholds. If the instant check does not qualify, provide the official documentation URL, a factual project description and developer value in the manual application. Verification is free; approval is decided by Context7, not by a repository setting.

## 4. Connect Docs7 Free (optional; existing GitHub Pages stays active)

1. Open [Docs7](https://context7.com/docs7) while signed into Context7.
2. Add a new site from GitHub; select `Cynrath/agent-context-kit`.
3. Set production branch to `master`, and **Docs path** to `docs`. The `docs/docs.json` file defines the navigation and `docs/index.mdx` is the entry page.
4. Publish the site. Keep the assigned `*.docs7.io` address separate from existing GitHub Pages until you intentionally decide otherwise.
5. Enable **Add to Context7** when connecting the repository (or use the site's **Context7** tab) so successful production builds refresh the library automatically. Do not create a duplicate library if the original GitHub library is already registered.

Docs7 Free currently allows up to three sites. The hosted documentation site and agent-readable endpoints are available on Free; autonomous Docs7 documentation editing agents and PR previews require Pro.

## 5. Verify deployment and indexing

After the Docs7 production build is successful, open:

- the Docs7 site root and a guide/reference page;
- `/llms.txt` and `/llms-full.txt` on that site;
- `/guides/getting-started.md` for an agent-readable page;
- the Context7 library page, making sure the new documentation and code examples are retrievable;
- the Context7 library Admin page for claim and verification status.

If configuration changes do not appear, use the library page's **Refresh** and inspect the Docs7 build log. Context7 may also refresh public libraries automatically.

## 6. Releases

Publishing docs does not require a new npm version. Follow repository version/release governance and keep existing published npm packages, tags, GitHub Releases and (where applicable) VS Code Marketplace builds immutable. Do not claim a release until its CI, registry and documentation checks actually pass.

Official references: [Context7 Library Owners](https://context7.com/docs/library-owners), [Claim Your Library](https://context7.com/docs/howto/claiming-libraries), [Verify Your Library](https://context7.com/docs/howto/verification), [Docs7 Quickstart](https://context7.com/docs/docs7/quickstart), [Docs7 Agent Readiness](https://context7.com/docs/docs7/agent-readiness).
