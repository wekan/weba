import importlib.util
import io
import os
import shutil
import subprocess
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'releases'))
import release
import package
spec = importlib.util.spec_from_file_location('copy_gambas', ROOT / 'releases/copy-gambas.py')
copy_gambas = importlib.util.module_from_spec(spec); spec.loader.exec_module(copy_gambas)


class BuildToolDiscoveryTest(unittest.TestCase):
    def test_standalone_legacy_and_w_companion_layouts_and_explicit_override(self):
        for layout in ['standalone', 'legacy', 'w', 'override']:
            with self.subTest(layout=layout), tempfile.TemporaryDirectory() as work:
                checkout = Path(work) / 'parent checkout'
                checkout.mkdir()
                (checkout / 'AGENTS.md').write_text('Fixture parent instructions')
                if layout == 'standalone':
                    app = checkout / 'weba'
                    tools = app / '.tools'
                elif layout == 'legacy':
                    app = checkout / '.tools/weba'
                    tools = checkout / '.tools'
                else:
                    app = checkout / '.tools/w/weba'
                    tools = checkout / '.tools'
                if layout == 'override':
                    tools = checkout / 'explicit tools'
                app.mkdir(parents=True)
                shutil.copy2(ROOT / 'build.sh', app / 'build.sh')
                prefix = tools / 'bin/gambas'
                for name in ['gbc3', 'gbx3', 'gba3', 'gbr3']:
                    package.write(prefix / 'usr/bin' / name, '#!/bin/sh\nprintf "fixture-tool\\n"\n', True)
                env = os.environ.copy()
                for key in ['GBC', 'GBX', 'GBA', 'GBR', 'GAMBAS_PREFIX', 'GAMBAS_ROOT',
                            'GB_PATH', 'LD_LIBRARY_PATH', 'WEBA_TOOLS_DIR', 'TMPDIR']:
                    env.pop(key, None)
                if layout == 'override':
                    env['WEBA_TOOLS_DIR'] = str(tools)
                result = subprocess.run([str(app / 'build.sh'), 'doctor'], env=env,
                                        capture_output=True, text=True, check=True)
                self.assertIn('Gambas prefix: ' + str(prefix), result.stdout)
                self.assertIn('Temporary files: ' + str(tools / 'tmp'), result.stdout)
                self.assertEqual(result.stdout.count('fixture-tool'), 4)


class ReleaseToolsTest(unittest.TestCase):
    def test_version_rejects_shell_and_ref_injection(self):
        self.assertEqual(release.version('v1.2.3'), 'v1.2.3')
        for value in ['--help', 'main', 'v1.2', 'v1.2.3;id', '../v1.2.3', 'v1.2.3\n']:
            with self.assertRaises(ValueError): release.version(value)

    def test_single_target_list_and_missing_pairs(self):
        definitions = release.targets()
        self.assertEqual(len({t['id'] for t in definitions}), len(definitions))
        all_names = set()
        for target in definitions:
            names = release.assets(target, 'v1.2.3')
            self.assertFalse(all_names.intersection(names)); all_names.update(names)
            complete = {item for name in names for item in [name, name + '.sha256sum']}
            self.assertFalse(release.missing(target, 'v1.2.3', complete))
            for name in names:
                self.assertTrue(release.missing(target, 'v1.2.3', complete - {name}))
                self.assertTrue(release.missing(target, 'v1.2.3', complete - {name + '.sha256sum'}))

    def test_deb_has_valid_ar_members_and_tar_modes(self):
        with tempfile.TemporaryDirectory() as work:
            directory = Path(work)
            package.write(directory / 'usr/bin/weba', '#!/bin/sh\n', True)
            blob = package.tar_bytes(directory, epoch=123)
            with tarfile.open(fileobj=io.BytesIO(blob), mode='r:gz') as archive:
                self.assertEqual(archive.getmember('usr/bin/weba').mode, 0o755)
                self.assertEqual(archive.getmember('usr/bin/weba').mtime, 123)
            data = package.deb_bytes(blob, blob)
            self.assertTrue(data.startswith(b'!<arch>\n'))
            offset = 8; names = []
            while offset < len(data):
                head = data[offset:offset+60]; self.assertEqual(head[-2:], b'`\n')
                names.append(head[:16].decode().strip().rstrip('/'))
                size = int(head[48:58]); offset += 60 + size + size % 2
            self.assertEqual(names, ['debian-binary', 'control.tar.gz', 'data.tar.gz'])

    def test_copy_installed_files_and_relocated_wrappers(self):
        with tempfile.TemporaryDirectory() as work:
            source = Path(work) / 'host'; dest = Path(work) / 'sandbox'
            for name in ['gbc3', 'gbx3', 'gba3', 'gbr3']:
                package.write(source / 'usr/bin' / name, '#!/bin/sh\nexit 0\n', True)
            package.write(source / 'usr/lib/gambas3/gb.db.component', 'test')
            package.write(source / 'usr/share/gambas3/info/gb.info', 'metadata')
            package.write(source / 'usr/local/share/icons/hicolor/48x48/apps/gambas3.png', 'icon')
            self.assertEqual(copy_gambas.copy(source, dest, dependencies=False), [])
            self.assertTrue((dest / 'usr/share/gambas3/info/gb.info').exists())
            self.assertTrue((dest / 'usr/local/share/icons/hicolor/48x48/apps/gambas3.png').exists())
            self.assertIn('-r "$prefix/usr"', (dest / 'bin/gbc3').read_text())
            self.assertEqual((dest / 'bin/gbx3').stat().st_mode & 0o777, 0o755)

    def test_no_ref_push_or_hidden_publish_in_local_build(self):
        script = (ROOT / 'build.sh').read_text()
        self.assertNotIn('git push', script)
        self.assertNotIn('git push', (ROOT / 'releases/release.py').read_text())
        workflow = (ROOT / '.github/workflows/release-build.yml').read_text()
        self.assertIn('fail-fast: false', workflow)
        self.assertIn('Attach this completed target', workflow)
        self.assertNotIn('git push', workflow)
        self.assertIn('persist-credentials: false', workflow)


if __name__ == '__main__': unittest.main()
