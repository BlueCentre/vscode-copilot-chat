#!/usr/bin/env bash
# Custom merge driver for package.json to minimize conflicts with branding overlay.
# Strategy:
# 1. Start from upstream (theirs) content to keep schema/version changes.
# 2. Preserve local-only dependency/version fields if they don't exist upstream.
# 3. Always drop branding overlay fields so that overlay can be re-applied post-merge.
# 4. Never introduce conflict markers; fall back to union of keys with upstream precedence.

set -euo pipefail

BASE="$1"   # %O
LOCAL="$2"  # %A (current branch)
REMOTE="$3" # %B (other branch)
RESULT="$4" # %A output overwritten

merge_json() {
  node <<'EOF'
const fs = require('fs');
function read(path){try{return JSON.parse(fs.readFileSync(path,'utf8'));}catch{return {};}}
const base = read(process.env.BASE);
const local = read(process.env.LOCAL);
const remote = read(process.env.REMOTE);
// Start from remote (upstream) to adopt structural changes.
const merged = { ...remote };
// Merge dependency sections conservatively: add local-only deps not present in remote.
for (const sect of ['dependencies','devDependencies','optionalDependencies','peerDependencies']) {
  if (local[sect]) {
    merged[sect] = merged[sect] || {};
    for (const [k,v] of Object.entries(local[sect])) {
      if (!(k in merged[sect])) merged[sect][k] = v; // keep local-only
    }
  }
}
// Remove branding overlay fields so overlay script can re-apply authoritative values.
delete merged.displayName;
delete merged.icon;
// description might be upstream-changed; keep remote, overlay will re-transform.
fs.writeFileSync(process.env.RESULT, JSON.stringify(merged,null,'\t')+"\n");
EOF
}

export BASE LOCAL REMOTE RESULT
merge_json
exit 0
