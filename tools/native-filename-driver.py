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
