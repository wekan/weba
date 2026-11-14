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
_input = sys.stdin.buffer.read(8193)
if len(_input) > 8192:
    raise ValueError('Oversized filename request')
_request = json.loads(_input)
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
