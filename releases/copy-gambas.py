#!/usr/bin/env python3
"""Copy installed host Gambas files into a repository-local Flatpak toolchain."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess

TOOLS = ['gambas3', 'gambas3.gambas', 'gba3', 'gbc3', 'gbi3', 'gbx3', 'gbr3', 'gbh3', 'gbh3.gambas', 'gbs3', 'gbs3.gambas', 'gbw3', 'gbm3']
TREES = ['usr/lib/gambas3', 'usr/lib64/gambas3', 'usr/share/gambas3',
         'usr/share/doc/gambas3', 'usr/share/appdata', 'usr/share/metainfo',
         'usr/share/mime/packages', 'usr/share/mime/application',
         'usr/local/lib/gambas3', 'usr/local/lib64/gambas3', 'usr/local/share/gambas3']


def copy(source, destination, dependencies=True):
    source = source.resolve(); destination = destination.resolve()
    if source == destination or source in destination.parents and source != Path('/'):
        raise ValueError('Source fixture and destination must be separate directories')
    destination.mkdir(parents=True, exist_ok=True)
    copied = []; native = []
    # Keep a conventional prefix; dereference executable links so absolute host
    # symlinks cannot point back outside the copied toolchain.
    for tool in TOOLS:
        for folder in ['usr/local/bin', 'usr/bin']:
            src = source / folder / tool
            if not src.is_file(): continue
            dest = destination / 'usr/bin' / tool; dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dest); copied.append(str(src)); native.append(src); break
    for folder in TREES:
        src = source / folder
        if not src.is_dir(): continue
        if folder in ['usr/lib/gambas3', 'usr/lib64/gambas3', 'usr/share/gambas3', 'usr/local/lib/gambas3', 'usr/local/lib64/gambas3', 'usr/local/share/gambas3']:
            relative = 'usr/lib/gambas3' if '/lib' in folder else 'usr/share/gambas3'
            dest = destination / relative
            shutil.copytree(src, dest, dirs_exist_ok=True, symlinks=False)
            copied.append(str(src))
            if '/lib' in folder: native += list(src.glob('*.so'))
        else:
            # The pasted list includes metadata shared with unrelated apps.
            for entry in src.glob('*gambas*'):
                dest = destination / folder / entry.name; dest.parent.mkdir(parents=True, exist_ok=True)
                if entry.is_dir(): shutil.copytree(entry, dest, dirs_exist_ok=True, symlinks=False)
                else: shutil.copy2(entry, dest)
                copied.append(str(entry))
    for folder in ['usr/local/share/applications', 'usr/share/applications', 'usr/share/man/man1']:
        src = source / folder
        if src.is_dir():
            for entry in src.glob('*gambas*'):
                if entry.is_file():
                    dest = destination / folder / entry.name; dest.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(entry, dest)
    for base in ['usr/local/share/icons', 'usr/share/icons']:
        src = source / base
        if src.is_dir():
            for entry in src.rglob('*gambas*'):
                if entry.is_file():
                    dest = destination / base / entry.relative_to(src); dest.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(entry, dest)
    # Installed package source is optional and never guessed from a home directory.
    # Native dependencies are copied only when reading the real host installation.
    libraries = destination / 'usr/lib/host-deps'
    if dependencies and source == Path('/'):
        libraries.mkdir(parents=True, exist_ok=True)
        for binary in native:
            result = subprocess.run(['ldd', str(binary)], capture_output=True, text=True)
            for line in result.stdout.splitlines():
                fields = line.strip().split()
                if '=>' not in fields: continue
                index = fields.index('=>')
                if index + 1 >= len(fields) or not fields[index + 1].startswith('/'): continue
                name, src = fields[0], Path(fields[index + 1])
                # Reuse the Flatpak libc/loader; copying a host libc can make
                # every tool unusable. Other host dependencies stay local.
                if name.startswith(('libc.so', 'libm.so', 'libdl.so', 'libpthread.so', 'librt.so', 'ld-linux')): continue
                shutil.copy2(src, libraries / name)
    bin_dir = destination / 'bin'; bin_dir.mkdir(exist_ok=True)
    for name in TOOLS:
        if not (destination / 'usr/bin' / name).is_file() or name.endswith('.gambas'): continue
        wrapper = bin_dir / name
        wrapper.write_text('''#!/bin/sh
set -eu
prefix=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
export PATH="$prefix/bin:$prefix/usr/bin:$PATH"
export GB_PATH="$prefix/usr/lib/gambas3"
export LD_LIBRARY_PATH="$prefix/usr/lib/host-deps${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
''' + ('exec "$prefix/usr/bin/gbc3" -r "$prefix/usr" "$@"\n' if name == 'gbc3' else f'exec "$prefix/usr/bin/{name}" "$@"\n'))
        wrapper.chmod(0o755)
    missing = [tool for tool in ['gbc3', 'gbx3', 'gba3', 'gbr3'] if not (destination / 'usr/bin' / tool).exists()]
    (destination / 'copy-manifest.json').write_text(json.dumps({'source':str(source), 'copied':copied, 'missing':missing}, indent=2) + '\n')
    print(f'Copied Gambas to {destination}')
    if missing: print('Incomplete toolchain; missing: ' + ', '.join(missing))
    print('Run build.sh doctor inside Flatpak. Host CPU and libc compatibility still need verification.')
    return missing


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', type=Path, default=Path('/'))
    parser.add_argument('--destination', required=True, type=Path)
    parser.add_argument('--no-dependencies', action='store_true')
    args = parser.parse_args()
    missing = copy(args.source_root, args.destination, not args.no_dependencies)
    raise SystemExit(1 if missing else 0)
