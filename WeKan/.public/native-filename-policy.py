"""Source-compatible public filename policy, independent of host Unicode versions.

Normalization follows UAX #15 decomposition, canonical ordering and composition:
https://www.unicode.org/reports/tr15/ . Tables come from the pinned source engine.
"""
import functools
import gzip
import json
from pathlib import Path
import re
import urllib.parse


@functools.lru_cache(maxsize=1)
def _tables():
    data = json.loads(gzip.decompress((Path(__file__).parent / 'filename-data/normalization.json.gz').read_bytes()))
    return ({int(cp): values for cp, values in data['nfkd'].items()},
            {tuple(map(int, pair.split(','))): value for pair, value in data['compose'].items()},
            {int(cp): value for cp, value in data['ranks'].items()}, data['confusables'])


def _ordered_points(text):
    decompose, _, ranks, _ = _tables()
    points = []
    for char in text:
        cp = ord(char)
        syllable = cp - 0xAC00
        if 0 <= syllable < 11172:
            points.extend((0x1100 + syllable // 588, 0x1161 + (syllable % 588) // 28))
            if syllable % 28:
                points.append(0x11A7 + syllable % 28)
        else:
            points.extend(decompose.get(cp, (cp,)))
    # Stable order within each nonstarter run, never across a starter.
    ordered = []
    pending = []
    for cp in points:
        if not ranks.get(cp, 0):
            ordered.extend(sorted(pending, key=lambda value: ranks[value]))
            pending.clear()
            ordered.append(cp)
        else:
            pending.append(cp)
    ordered.extend(sorted(pending, key=lambda value: ranks[value]))
    return ordered


def normalize_nfkd(text):
    return ''.join(map(chr, _ordered_points(text)))


def normalize_nfkc(text):
    ordered = _ordered_points(text)
    _, compose, ranks, _ = _tables()
    if not ordered:
        return ''
    result = []
    starter = None
    last_rank = 0
    for cp in ordered:
        rank = ranks.get(cp, 0)
        combined = compose.get((result[starter], cp)) if starter is not None else None
        if combined is None and starter is not None:
            first = result[starter]
            if 0x1100 <= first < 0x1113 and 0x1161 <= cp < 0x1176:
                combined = 0xAC00 + ((first - 0x1100) * 21 + cp - 0x1161) * 28
            elif 0 <= first - 0xAC00 < 11172 and (first - 0xAC00) % 28 == 0 and 0x11A8 <= cp < 0x11C3:
                combined = first + cp - 0x11A7
        if combined is not None and (last_rank == 0 or last_rank < rank):
            result[starter] = combined
        else:
            if rank == 0:
                starter = len(result)
            result.append(cp)
            last_rank = rank
    return ''.join(map(chr, result))


_SPACE = '\u0009\u000A\u000B\u000C\u000D\u0020\u00A0\u1680' + ''.join(map(chr, range(0x2000, 0x200B))) + '\u2028\u2029\u202F\u205F\u3000\uFEFF'
_INVISIBLE = re.compile('[\u0000-\u001F\u007F-\u009F\u00A0\u00AD\u061C\u180E\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB]')
_NONLATIN_LETTER = re.compile('[À-ɏͰ-ϿЀ-ӿ԰-῿぀-퟿]')


def decode_filename_safe(name):
    if '%' not in name or not re.search('%[0-9A-Fa-f]{2}', name):
        return name
    if re.search('%(?![0-9A-Fa-f]{2})', name):
        return name
    try:
        return urllib.parse.unquote(name, encoding='utf-8', errors='strict')
    except UnicodeError:
        return name


def normalize_confusables(name):
    name = normalize_nfkc(name)
    dot = name.rfind('.')
    base = name[:dot] if dot > 0 else name
    latin = len(re.findall('[A-Za-z]', base))
    nonlatin = sum(bool(_NONLATIN_LETTER.fullmatch(char)) for char in base if ord(char) > 127)
    if latin and latin >= nonlatin:
        mapping = _tables()[3]
        return ''.join(mapping.get(char, char) for char in name)
    return name


def strip_exploit_patterns(name):
    while True:
        previous = name
        name = re.sub(r'<\?[\s\S]*?(\?>|$)', '', name)
        name = re.sub(r'<!\[[\s\S]*?(\]>|$)', '', name)
        name = re.sub(r'\{\{[\s\S]*?\}\}|\$\{[\s\S]*?\}|<%[\s\S]*?%>', '', name)
        if name == previous:
            break
    while True:
        previous = name
        name = re.sub('<[^>]*>', '', name)
        if name == previous:
            break
    name = re.sub('(javascript|vbscript|data)[' + _SPACE + ']*:', '', name, flags=re.I | re.ASCII)
    return name.replace('<', '').replace('>', '')


def truncate_filename(name, maximum=30):
    if len(name) <= maximum:
        return name
    dot = name.rfind('.')
    extension = name[dot:] if dot > 0 else ''
    keep = 0 < len(extension) < maximum
    base = name[:len(name) - len(extension)] if keep else name
    base = base[:maximum - len(extension) if keep else maximum]
    pairs = {'(': ')', '[': ']', '{': '}'}
    stack = []
    closers = set()
    for index, char in enumerate(base):
        if char in pairs:
            stack.append((char, index))
        elif char in ')]}':
            if stack and pairs[stack[-1][0]] == char:
                stack.pop()
            else:
                closers.add(index)
    if stack:
        base = base[:stack[0][1]]
    base = ''.join(char for index, char in enumerate(base) if index not in closers)
    base = base.strip(_SPACE).rstrip('([{').strip(_SPACE)
    return (base or 'file') + (extension if keep else '')


def clean_filename(name):
    name = normalize_confusables(decode_filename_safe(name))
    name = strip_exploit_patterns(_INVISIBLE.sub('', name))
    name = re.sub('[' + _SPACE + ']+', ' ', name).strip(_SPACE)
    return truncate_filename(name)


def public_attachment_disposition(filename):
    # Match the public universal-file-server helpers, not the raw API helper.
    if not isinstance(filename, str) or not filename:
        sanitized = 'download'
    else:
        sanitized = clean_filename(filename) or 'download'
    if all(32 <= ord(char) <= 126 for char in sanitized):
        value = sanitized.replace('\\', '\\\\').replace('"', '\\"')
    else:
        units = sanitized.encode('utf-16-le', errors='surrogatepass')
        fallback = ''.join(chr(int.from_bytes(units[i:i+2], 'little')) if 32 <= int.from_bytes(units[i:i+2], 'little') <= 126 else '_' for i in range(0, len(units), 2))[:100] or 'download'
        encoded = urllib.parse.quote(sanitized, safe="~!*'()-._")
        value = fallback + '|RFC5987:' + encoded
    if '|RFC5987:' in value:
        fallback, encoded = value.split('|RFC5987:')[:2]
        return f"attachment; filename=\"{fallback}\"; filename*=UTF-8''{encoded}"
    return f'attachment; filename="{value}"'


def before_upload_filename(name):
    """Interactive onBeforeUpload name stage; REST/post-upload is separate."""
    if not isinstance(name, str) or not name:
        return name
    safe = re.split(r'[\\/]', name)[-1].replace('\0', '')
    while True:
        previous = safe
        safe = re.sub(r'\.\.[\\/]', '', safe)
        if safe == previous:
            break
    safe = re.sub(r'^\.\.$', '', safe).strip(_SPACE)
    if not safe or safe in ('.', '..'):
        safe = 'unnamed'
    return clean_filename(safe) or 'unnamed'


def filename_looks_like_exploit(name):
    """Exact decoded-name classifier from uploadFileName.js (no NFKC here)."""
    value = decode_filename_safe('' if name is None else name)
    flags = re.I | re.ASCII
    space = '[' + _SPACE + ']'
    if re.search(r'<' + space + r'*(script|svg|iframe|object|embed|img|html|meta|link|style|foreignobject|base)\b', value, flags):
        return True
    if re.search(r'<\?xml|<!doctype|<!entity', value, flags):
        return True
    if re.search(r'javascript:|vbscript:|data:' + space + r'*text/html', value, flags):
        return True
    if re.search(space + r'on[A-Za-z0-9_]+' + space + r'*=', value, flags) or re.search(r'^on[A-Za-z0-9_]+' + space + r'*=', value, flags):
        return True
    if re.search(r'<[^>]*/on[a-z-]{1,40}' + space + r'*=', value, flags):
        return True
    if re.search(r'\{\{[\s\S]*\}\}|\$\{[\s\S]*\}|<%[\s\S]*%>', value):
        return True
    if re.search(r'<\?php|<\?=', value, flags):
        return True
    return '\0' in value or bool(re.search(r'(^|[\\/])\.\.([\\/]|$)', value))


@functools.lru_cache(maxsize=1)
def _mime_tables():
    return json.loads(gzip.decompress((Path(__file__).parent / 'filename-data/mime.json.gz').read_bytes()))


def base_name_for_mime(mime_type):
    value = (mime_type or '').lower()
    for prefix, name in [('image/', 'image'), ('video/', 'video'), ('audio/', 'audio')]:
        if value.startswith(prefix):
            return name
    if re.search('spreadsheet|ms-excel|excel|csv', value):
        return 'spreadsheet'
    if re.search('word|pdf|presentation|powerpoint|opendocument|rtf|document', value):
        return 'document'
    if value.startswith('text/'):
        return 'document'
    if re.search('zip|tar|compressed|archive|rar|7z|gzip|bzip', value):
        return 'archive'
    return 'file'


def extension_for_mime(mime_type):
    value = (mime_type or '').lower()
    if value.strip(_SPACE) in ('', 'application/octet-stream', 'binary/octet-stream',
                              'application/binary', 'application/x-binary', 'application/unknown', '*/*'):
        return ''
    match = re.match('^[' + _SPACE + ']*([^;' + _SPACE + ']*)(?:;|[' + _SPACE + ']|$)', value)
    extension = _mime_tables()['extensions'].get(match[1]) if match else None
    return '.' + extension if extension else ''


def _lookup_mime(name):
    # mime-types.lookup uses POSIX extname('x.' + name), including dotfile rules.
    basename = ('x.' + name).rstrip('/').rsplit('/', 1)[-1]
    dot = basename.rfind('.')
    extension = basename[dot + 1:].lower() if dot > 0 and basename != '..' else ''
    return _mime_tables()['types'].get(extension)


def sanitize_upload_filename(name, mime_type):
    name = clean_filename(name)
    wanted = extension_for_mime(mime_type)
    wanted_mime = (mime_type or '').lower()
    original = re.search(r'(?:^|[^.])(\.[^.]+)$', name)
    if wanted_mime == 'application/json' and original and original[1].lower() == '.gantt':
        wanted = '.gantt'
    if not name:
        return truncate_filename(base_name_for_mime(mime_type) + wanted)
    if wanted:
        dot = name.rfind('.')
        current = name[dot:].lower() if dot > 0 else ''
        current_mime = _lookup_mime(name)
        if current == wanted:
            pass
        elif wanted_mime == 'image/jpeg' and current == '.jfif':
            name = name[:dot] + wanted
        elif current_mime == wanted_mime:
            pass
        elif current_mime:
            name = name[:name.rfind('.')] + wanted
        else:
            name += wanted
    return truncate_filename(name)

"""Bounded native branch of the source MIME detector; no filename or temp file."""
import os
import re
import selectors
import signal
import subprocess
import time

HEADER_BYTES = 64 * 1024
_MIME_SPACE = '\t\n\v\f\r \u00a0\u1680' + ''.join(map(chr, range(0x2000, 0x200b))) + '\u2028\u2029\u202f\u205f\u3000\ufeff'
_MIME_TOKEN = re.compile(r'[a-z0-9!#$&^_.+-]+/[a-z0-9!#$&^_.+-]+\Z', re.ASCII)


def detect_native_mime(buffer):
    """Match nativeMime(['--mime-type', '-b', '-'], first 64KiB), or None.

    The primary file-type engine and portable libmagic branch are separate.
    Selectors bound stdin writes as well as stdout/stderr and the total deadline.
    """
    if not isinstance(buffer, (bytes, bytearray, memoryview)):
        raise TypeError('Expected file bytes')
    view = memoryview(buffer)
    if not view.c_contiguous:
        raise TypeError("Expected contiguous file bytes")
    data = bytes(view.cast("B")[:HEADER_BYTES])
    child = None
    watcher = selectors.DefaultSelector()
    streams = []
    output = bytearray()
    error_output = bytearray()
    deadline = time.monotonic() + 2
    try:
        environment = os.environ.copy()
        if environment.get('SNAP') and not environment.get('MAGIC'):
            for relative in ('usr/lib/file/magic.mgc', 'usr/share/misc/magic.mgc', 'usr/share/file/magic.mgc'):
                candidate = os.path.join(environment['SNAP'], relative)
                if os.path.exists(candidate):
                    environment['MAGIC'] = candidate
                    break
        child = subprocess.Popen(['file', '--mime-type', '-b', '-'], stdin=subprocess.PIPE,
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                 start_new_session=True, env=environment)
        streams = [child.stdin, child.stdout, child.stderr]
        for stream in streams:
            os.set_blocking(stream.fileno(), False)
        watcher.register(child.stdout, selectors.EVENT_READ, output)
        watcher.register(child.stderr, selectors.EVENT_READ, error_output)
        if data:
            watcher.register(child.stdin, selectors.EVENT_WRITE, None)
        else:
            child.stdin.close()
        offset = 0
        while watcher.get_map():
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                return None
            for key, mask in watcher.select(remaining):
                stream = key.fileobj
                if mask & selectors.EVENT_WRITE:
                    try:
                        sent = os.write(stream.fileno(), data[offset:offset + 4096])
                    except BlockingIOError:
                        continue
                    except BrokenPipeError:
                        sent = 0
                    offset += sent
                    if not sent or offset == len(data):
                        watcher.unregister(stream)
                        stream.close()
                else:
                    try:
                        chunk = os.read(stream.fileno(), 4097)
                    except BlockingIOError:
                        continue
                    if not chunk:
                        watcher.unregister(stream)
                        stream.close()
                    else:
                        key.data.extend(chunk)
                        if len(key.data) > 4096:
                            return None
        # Observe exit without reaping yet: keep this PID reserved until the
        # finally block kills its owned process group and collects the child.
        while True:
            status = os.waitid(os.P_PID, child.pid, os.WEXITED | os.WNOHANG | os.WNOWAIT)
            if status is not None:
                if status.si_code != os.CLD_EXITED or status.si_status != 0:
                    return None
                break
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                return None
            time.sleep(min(0.01, remaining))
        mime = output.decode('utf-8', 'replace').strip(_MIME_SPACE).lower()
        return mime if _MIME_TOKEN.fullmatch(mime) else None
    except (OSError, ValueError, subprocess.TimeoutExpired):
        return None
    finally:
        watcher.close()
        if child is not None:
            # Own session: include any descendants a failed detector left behind.
            try:
                os.killpg(child.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            for stream in streams:
                if not stream.closed:
                    stream.close()
            try:
                child.wait(timeout=0.5)
            except subprocess.TimeoutExpired:
                pass

# Appended to the unchanged runtime policy for the native, isolated Python bridge.
import base64
import sys

_raw = json.loads(gzip.decompress(base64.b64decode(sys.argv[1], validate=True)))
_native_tables = ({int(cp): value for cp, value in _raw['nfkd'].items()},
                  {tuple(map(int, pair.split(','))): value for pair, value in _raw['compose'].items()},
                  {int(cp): value for cp, value in _raw['ranks'].items()}, _raw['confusables'])
_tables = lambda: _native_tables
_native_mime_tables = json.loads(gzip.decompress(base64.b64decode(sys.argv[2], validate=True)))
_mime_tables = lambda: _native_mime_tables
sys.stdout.write('\x1e')
sys.stdout.flush()
_length_line = sys.stdin.buffer.readline(16)
if not re.fullmatch(rb'[1-9][0-9]{0,4}\n', _length_line):
    raise ValueError('Invalid filename request frame')
_remaining = int(_length_line)
if _remaining > 98304:
    raise ValueError('Oversized filename request')
_parts = []
while _remaining:
    _size = min(2048, _remaining)
    _part = sys.stdin.buffer.read(_size)
    if len(_part) != _size:
        raise ValueError('Truncated filename request')
    _parts.append(_part)
    _remaining -= _size
    sys.stdout.write('\x1e')
    sys.stdout.flush()
_input = b''.join(_parts)
if sys.stdin.buffer.read(1):
    raise ValueError('Trailing filename request data')
_request = json.loads(_input)
if isinstance(_request, dict) and _request.get('mode') == 'detect':
    if set(_request) != {'mode', 'header'} or not isinstance(_request['header'], str):
        raise ValueError('Invalid MIME request')
    _header = base64.b64decode(_request['header'], validate=True)
    if len(_header) > HEADER_BYTES:
        raise ValueError('Oversized MIME header')
    print(json.dumps(detect_native_mime(_header), ensure_ascii=True))
    sys.exit(0)
if not isinstance(_request, dict) or _request.get('mode') not in ('before', 'interactive', 'correct') or set(_request) != ({'filename', 'mode', 'mime'} if _request.get('mode') == 'correct' else {'filename', 'mode'}) or not isinstance(_request['filename'], str):
    raise ValueError('Invalid filename request')
_name = base64.b64decode(_request['filename'], validate=True).decode('utf-8', 'surrogatepass')
_name = _name.encode('utf-16-le', 'surrogatepass').decode('utf-16-le', 'surrogatepass')
if _request['mode'] == 'correct':
    _mime = base64.b64decode(_request['mime'], validate=True).decode('utf-8', 'surrogatepass')
    _mime = _mime.encode('utf-16-le', 'surrogatepass').decode('utf-16-le', 'surrogatepass')
    print(json.dumps(sanitize_upload_filename(_name, _mime), ensure_ascii=True))
    sys.exit(0)
_before = before_upload_filename(_name)
if _request['mode'] == 'interactive':
    print(json.dumps({'name': _before, 'exploit': filename_looks_like_exploit(_before)}, ensure_ascii=True))
else:
    print(json.dumps(_before, ensure_ascii=True))
