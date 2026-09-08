# Merge order

defaults < ackit.yml < policy extends chain (in declaration order) < CLI
flags. Arrays replace; objects merge recursively. The effective policy digest
is sha256 over the canonical sorted-key JSON.

`extends` entries are local repo-relative files or `npm:<pkg>/<file>` for
already-installed packages only; remote fetch is refused
(`POL-OFFLINE-BLOCKED`), traversal outside the root is refused. Locked rules
(`locked: true`) cannot be weakened downstream (`POL-LOCKED-CONFLICT`); deny
is sticky across layers. `ackit policy check` prints chain, digest, autonomy,
review, and problems; `ackit config check` validates `ackit.yml` schema.
