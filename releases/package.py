#!/usr/bin/env python3
"""Build native Linux installers, desktop launchers and source archives."""
import argparse
import gzip
import io
import os
from pathlib import Path
import platform
import shutil
import subprocess
import tarfile
import tempfile
import zipfile
from release import ROOT, targets, version, checksum

ARCH = {'x86_64':'amd64', 'aarch64':'arm64', 'arm64':'arm64', 'armv7l':'armhf', 'armv5tel':'armel',
        'i386':'i386', 'i686':'i386', 'ppc64le':'ppc64el', 'riscv64':'riscv64', 's390x':'s390x'}
DEPENDENCIES = ['gambas3-runtime', 'gambas3-gb-crypt', 'gambas3-gb-db', 'gambas3-gb-db-sqlite3',
                'gambas3-gb-signal', 'gambas3-gb-util', 'gambas3-gb-util-web', 'gambas3-gb-web', 'gambas3-gb-web-gui', 'python3']


def tar_bytes(directory, prefix='', epoch=0):
    buf = io.BytesIO()
    def normalize(info):
        info.uid = info.gid = 0; info.uname = info.gname = 'root'; info.mtime = epoch
        return info
    with gzip.GzipFile(fileobj=buf, mode='wb', filename='', mtime=epoch) as gz:
        with tarfile.open(fileobj=gz, mode='w') as archive:
            for path in sorted(directory.rglob('*')):
                archive.add(path, arcname=str(Path(prefix) / path.relative_to(directory)), recursive=False, filter=normalize)
    return buf.getvalue()


def deb_bytes(control, data):
    out = bytearray(b'!<arch>\n')
    for name, content in [('debian-binary', b'2.0\n'), ('control.tar.gz', control), ('data.tar.gz', data)]:
        header = f'{name + "/":<16}{0:<12}{0:<6}{0:<6}{"100644":<8}{len(content):<10}`\n'.encode()
        if len(header) != 60: raise ValueError('Invalid ar header')
        out.extend(header); out.extend(content)
        if len(content) % 2: out.extend(b'\n')
    return bytes(out)


def write(path, text, executable=False):
    path.parent.mkdir(parents=True, exist_ok=True); path.write_text(text)
    if executable: path.chmod(0o755)


def desktop_zip(path, entries):
    with zipfile.ZipFile(path, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for name, content in entries.items():
            info = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
            info.external_attr = (0o100755 if name.endswith('.command') else 0o100644) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, content)


def desktop_packages(dist, tag, arch, deb):
    windows = r'''$ErrorActionPreference = 'Stop'
# Requires WSL with a configured Debian distribution. No native Windows runtime.
$expected = 'ARCH'
$actual = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
if (($expected -eq 'amd64' -and $actual -ne 'X64') -or ($expected -eq 'arm64' -and $actual -ne 'Arm64')) { throw 'Download the installer matching this CPU.' }
& wsl.exe -d Debian -- true
if ($LASTEXITCODE -ne 0) { throw 'Install/configure Debian first: wsl --install -d Debian ; then rerun this script.' }
$package = Join-Path $PSScriptRoot 'weba.deb'
$linuxPackage = (& wsl.exe -d Debian -- wslpath -a $package).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Could not translate the installer path.' }
& wsl.exe -d Debian -u root -- apt-get update
if ($LASTEXITCODE -ne 0) { throw 'apt-get update failed.' }
& wsl.exe -d Debian -u root -- apt-get install -y $linuxPackage
if ($LASTEXITCODE -ne 0) { throw 'WeBa installation failed.' }
Start-Process 'http://localhost:8080'
& wsl.exe -d Debian -- weba
exit $LASTEXITCODE
'''.replace('ARCH', arch)
    dockerfile = '''FROM debian:trixie-slim
COPY weba.deb /tmp/weba.deb
RUN apt-get update && apt-get install -y --no-install-recommends /tmp/weba.deb && rm -rf /var/lib/apt/lists/* /tmp/weba.deb && useradd -m weba && mkdir /data && chown weba:weba /data
USER weba
EXPOSE 8080
ENTRYPOINT ["weba", "--host", "0.0.0.0", "--data", "/data"]
'''
    mac = f'''#!/bin/sh
set -eu
cd -- "$(dirname -- "$0")"
command -v docker >/dev/null || {{ echo 'Install and start Docker Desktop for macOS first.'; exit 1; }}
docker build --platform linux/{arch} -t weba:{tag}-{arch} .
open http://localhost:8080
docker run --rm --platform linux/{arch} -p 127.0.0.1:8080:8080 -v weba-data:/data weba:{tag}-{arch}
'''
    desktop_zip(dist / f'weba-{tag}-windows-wsl-{arch}.zip', {'Install-WeBa.ps1': windows, 'weba.deb': deb.read_bytes(),
                'README.txt': b'Windows WSL installer. Requires Debian 13 or newer in WSL. Run Install-WeBa.ps1; data stays in the Debian user profile. No default accounts. Verify the zip checksum before use.\n'})
    desktop_zip(dist / f'weba-{tag}-macos-docker-{arch}.zip', {'Start-WeBa.command': mac, 'Dockerfile': dockerfile,
                'weba.deb': deb.read_bytes(), 'README.txt': b'Requires Docker Desktop. Run Start-WeBa.command; this hosts the Linux Gambas runtime in a container, not native macOS. Data stays in the weba-data Docker volume. No default accounts.\n'})


def package(tag, arch, source=False):
    version(tag)
    dist = ROOT / 'dist'; dist.mkdir(exist_ok=True)
    epoch = int(os.environ.get('SOURCE_DATE_EPOCH', subprocess.check_output(['git', 'log', '-1', '--format=%ct'], cwd=ROOT, text=True).strip()))
    with tempfile.TemporaryDirectory(prefix='weba-package.', dir=os.environ['TMPDIR']) as work:
        work = Path(work)
        if source:
            staged = work / 'source'; staged.mkdir()
            names = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=ROOT).decode().split('\0')
            for name in names:
                if not name or not (ROOT / name).is_file(): continue
                dest = staged / name; dest.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(ROOT / name, dest)
            project_file = staged / 'WeKan/.project'
            project_file.write_text('\n'.join('Version=' + tag[1:] if line.startswith('Version=') else line for line in project_file.read_text().splitlines()) + '\n')
            (staged / 'WeKan/.version').write_text(tag[1:] + '\n')
            dest = dist / f'weba-{tag}-source.tar.gz'
            dest.write_bytes(tar_bytes(staged, f'weba-{tag}-source', epoch)); checksum(dest); return
        if platform.system() != 'Linux' or ARCH.get(platform.machine()) != arch:
            raise RuntimeError('Build natively or under target-CPU emulation; do not relabel host bytecode as another CPU')
        project = work / 'project'; project.mkdir()
        for name in ['.src', '.public']: shutil.copytree(ROOT / 'WeKan' / name, project / name)
        text = (ROOT / 'WeKan/.project').read_text()
        text = '\n'.join('Version=' + tag[1:] if line.startswith('Version=') else line for line in text.splitlines()) + '\n'
        (project / '.project').write_text(text)
        subprocess.run([os.environ.get('GBC', 'gbc3'), '-j', '1', '-a', str(project)], check=True)
        compiled = work / 'weba.gambas'
        subprocess.run([os.environ.get('GBA', 'gba3'), '-o', str(compiled), str(project)], check=True)
        bundle = work / 'bundle'; (bundle / 'runtime').mkdir(parents=True)
        shutil.copy2(compiled, bundle / 'weba.gambas')
        shutil.copy2(ROOT / 'runtime/server.py', bundle / 'runtime/server.py')
        shutil.copy2(ROOT / 'LICENSE', bundle / 'LICENSE')
        shutil.copy2(ROOT / 'README.md', bundle / 'README.md')
        write(bundle / 'start-weba', '''#!/bin/sh
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$root/runtime/server.py" --app "$root/weba.gambas" "$@"
''', True)
        write(bundle / 'install.sh', '''#!/bin/sh
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
prefix=${PREFIX:-/usr/local}
mkdir -p "$prefix/lib/weba" "$prefix/bin"
cp -R "$root/." "$prefix/lib/weba/"
ln -sf ../lib/weba/start-weba "$prefix/bin/weba"
echo 'Installed. Install Gambas runtime/components and python3; then run weba.'
''', True)
        tar_path = dist / f'weba-{tag}-linux-{arch}.tar.gz'
        tar_path.write_bytes(tar_bytes(bundle, f'weba-{tag}-linux-{arch}', epoch)); checksum(tar_path)
        data = work / 'data'; app = data / 'usr/share/weba'; app.mkdir(parents=True)
        shutil.copy2(compiled, app / 'weba.gambas'); shutil.copy2(ROOT / 'runtime/server.py', app / 'server.py')
        write(data / 'usr/bin/weba', '#!/bin/sh\nexec python3 /usr/share/weba/server.py --app /usr/share/weba/weba.gambas "$@"\n', True)
        docs = data / 'usr/share/doc/weba'; docs.mkdir(parents=True)
        shutil.copy2(ROOT / 'LICENSE', docs / 'copyright'); shutil.copy2(ROOT / 'README.md', docs / 'README.md')
        control = work / 'control'; control.mkdir()
        compiler = subprocess.check_output([os.environ.get('GBC', 'gbc3'), '-V'], text=True).strip()
        deps = [f'gambas3-runtime (>= {compiler})', *DEPENDENCIES[1:]]
        write(control / 'control', f'Package: weba\nVersion: {tag[1:]}\nSection: web\nPriority: optional\nArchitecture: {arch}\nMaintainer: Lauri Ojansivu <x@xet7.org>\nDepends: {", ".join(deps)}\nHomepage: https://github.com/wekan/weba\nDescription: Gambas Web UI Kanban with SQLite\n Run weba and open http://localhost:8080. First registered user is Admin.\n')
        deb = dist / f'weba-{tag}-linux-{arch}.deb'
        deb.write_bytes(deb_bytes(tar_bytes(control, epoch=epoch), tar_bytes(data, epoch=epoch))); checksum(deb)
        target = next(t for t in targets() if t.get('arch') == arch)
        if target.get('desktop'): desktop_packages(dist, tag, arch, deb)
        for path in dist.glob(f'weba-{tag}-*{arch}.zip'): checksum(path)
        print(f'Packaged Linux {arch} (Gambas {compiler}) in {dist}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--version', type=version, default='v' + next(line.split('=', 1)[1] for line in (ROOT/'WeKan/.project').read_text().splitlines() if line.startswith('Version=')))
    parser.add_argument('--arch', default=ARCH.get(platform.machine()))
    parser.add_argument('--source', action='store_true')
    args = parser.parse_args()
    package(args.version, args.arch, args.source)
