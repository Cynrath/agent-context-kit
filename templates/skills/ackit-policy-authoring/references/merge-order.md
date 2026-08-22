# Merge order

defaults < ackit.yml < policy extends chain (in declaration order) < CLI
flags. Arrays replace; objects merge recursively. The effective policy digest
is sha256 over the canonical sorted-key JSON.
