#!/usr/bin/env python3
"""Human-invoked release dispatch, workflow planning and per-target attachment."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import urllib.parse

ROOT = Path(__file__).resolve().parent.parent
REPO = 'wekan/weba'


def version(value):
    if not re.fullmatch(r'v\d+\.\d+\.\d+', value): raise ValueError('Use an existing vMAJOR.MINOR.PATCH tag')
    return value


def targets(): return json.loads((ROOT / 'releases/targets.json').read_text())


def assets(target, tag):
    version(tag)
    if target['id'] == 'source': return [f'weba-{tag}-source.tar.gz']
    names = [f"weba-{tag}-{target['id']}.deb", f"weba-{tag}-{target['id']}.tar.gz"]
    if target.get('desktop'):
        names += [f"weba-{tag}-windows-wsl-{target['arch']}.zip", f"weba-{tag}-macos-docker-{target['arch']}.zip"]
    return names


def missing(target, tag, existing):
    return any(name not in existing or name + '.sha256sum' not in existing for name in assets(target, tag))


def gh(*args): return subprocess.check_output(['gh', *args], text=True, cwd=ROOT)


def api(path): return json.loads(gh('api', path))


def release(tag):
    try: return api(f'repos/{REPO}/releases/tags/{urllib.parse.quote(tag, safe="")}')
    except subprocess.CalledProcessError as error:
        # Never turn authorization/network failures into an empty release plan.
        raise RuntimeError('Cannot read release; verify the tag, release and GitHub access') from error


def checksum(path):
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    dest = path.with_name(path.name + '.sha256sum')
    dest.write_text(f'{digest}  {path.name}\n')
    return dest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('targets')
    dispatch = sub.add_parser('dispatch')
    dispatch.add_argument('workflow', choices=['release-all.yml', 'release-all-missing.yml'])
    dispatch.add_argument('version', type=version)
    dispatch.add_argument('--ref', default='main')
    ensure = sub.add_parser('ensure')
    ensure.add_argument('version', type=version)
    plan = sub.add_parser('plan')
    plan.add_argument('version', type=version)
    plan.add_argument('--missing', action='store_true')
    publish = sub.add_parser('publish')
    publish.add_argument('version', type=version)
    publish.add_argument('target', choices=[t['id'] for t in targets()])
    publish.add_argument('--missing', action='store_true')
    publish.add_argument('--finished', action='store_true')
    args = parser.parse_args()
    if args.command == 'targets':
        print(json.dumps(targets(), indent=2)); return
    if args.command == 'dispatch':
        if gh_git('status', '--porcelain').strip(): raise RuntimeError('Commit local changes first; then push them yourself')
        # Explicitly require a remote tag; never create/push a ref here.
        api(f'repos/{REPO}/git/ref/tags/{args.version}')
        print(gh('workflow', 'run', args.workflow, '--repo', REPO, '--ref', args.ref, '-f', 'version=' + args.version))
        return
    if args.command == 'ensure':
        api(f'repos/{REPO}/git/ref/tags/{args.version}')
        result = subprocess.run(['gh', 'api', f'repos/{REPO}/releases/tags/{args.version}'], capture_output=True, text=True)
        if result.returncode:
            if 'HTTP 404' not in result.stderr: raise RuntimeError('Release lookup failed: ' + result.stderr)
            print(gh('release', 'create', args.version, '--repo', REPO, '--verify-tag', '--title', args.version,
                     '--notes', 'WeBa installers are attached independently as each target finishes. Linux requires Gambas runtime packages; Windows uses WSL and macOS uses Docker Desktop. See README and TODO for supported features and platform limits.'))
        return
    if args.command == 'plan':
        existing = {a['name'] for a in release(args.version)['assets']} if args.missing else set()
        selected = [t for t in targets() if missing(t, args.version, existing)]
        print(json.dumps({'include': selected}, separators=(',', ':')))
        return
    target = next(t for t in targets() if t['id'] == args.target)
    existing = {a['name'] for a in release(args.version)['assets']}
    for name in assets(target, args.version):
        path = ROOT / 'dist' / name
        if not path.is_file():
            if args.finished: continue
            raise RuntimeError(f'Missing finished asset: {path}')
        sum_path = checksum(path)
        # Repair a missing checksum without replacing the already published bytes.
        # Compute the repaired checksum from the existing published bytes.
        if args.missing and name in existing:
            if name + '.sha256sum' in existing: continue
            downloaded = subprocess.check_output(['gh', 'release', 'download', args.version, '--repo', REPO, '--pattern', name, '--output', '-'])
            sum_path.write_text(f'{hashlib.sha256(downloaded).hexdigest()}  {name}\n')
            upload = [str(sum_path)]
        else:
            upload = [str(path), str(sum_path)]
        # Full rebuilds may replace assets; missing mode preserves completed pairs.
        print(gh('release', 'upload', args.version, '--repo', REPO, '--clobber', *upload))


def gh_git(*args): return subprocess.check_output(['git', *args], text=True, cwd=ROOT)


if __name__ == '__main__': main()
