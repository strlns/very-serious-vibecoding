#!/usr/bin/env bash
# Build both static outputs, then deploy them.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Resolve the project directory so this works when invoked from another folder.
(
  cd "$script_dir"
  npm run build
)

remote="netcup"
remote_root="/paperclip-factory.de/httpdocs"
ssh_options=(-o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=yes)

fail() {
  printf 'Deploy aborted: %s\n' "$*" >&2
  exit 1
}

for command in ssh scp ssh-add; do
  command -v "$command" >/dev/null 2>&1 || fail "Required command not found: $command"
done

[[ -s "$script_dir/dist/index.html" && -d "$script_dir/dist/assets" ]] ||
  fail "Build did not produce dist/index.html and dist/assets."
[[ -s "$script_dir/dist-singlefile/index.html" ]] ||
  fail "Build did not produce dist-singlefile/index.html."

ssh-add -l >/dev/null 2>&1 || fail "No SSH agent with a loaded key is available."
if ! ssh "${ssh_options[@]}" "$remote" true; then
  fail "Cannot connect noninteractively. Check the netcup SSH alias, loaded key and known_hosts."
fi

# Remove only stale staging directories. Live deployments stay intact during upload.
ssh "${ssh_options[@]}" "$remote" sh -s -- "$remote_root" <<'REMOTE'
set -eu
cd "$1"
rm -rf -- _squeaklite _dist-singlefile
REMOTE

# The staging destinations must not exist: scp creates the renamed directories.
scp "${ssh_options[@]}" -r "$script_dir/dist" "$remote:$remote_root/_squeaklite"
scp "${ssh_options[@]}" -r "$script_dir/dist-singlefile" "$remote:$remote_root/_dist-singlefile"

# Replace live directories only once both uploads have completed successfully.
ssh "${ssh_options[@]}" "$remote" sh -s -- "$remote_root" <<'REMOTE'
set -eu
cd "$1"
test -s _squeaklite/index.html
test -d _squeaklite/assets
test -s _dist-singlefile/index.html

# The app's Download HTML link expects a nested path; the file lives next door.
ln -s ../dist-singlefile _squeaklite/dist-singlefile

rm -rf -- squeaklite dist-singlefile
mv -- _dist-singlefile dist-singlefile
mv -- _squeaklite squeaklite
REMOTE

printf 'Deployed https://paperclip-factory.de/squeaklite/\n'
