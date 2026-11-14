# Appended to the unchanged runtime policy for the native, isolated Python bridge.
import base64
import sys

_raw = json.loads(gzip.decompress(base64.b64decode(sys.argv[1], validate=True)))
_native_tables = ({int(cp): value for cp, value in _raw['nfkd'].items()},
                  {tuple(map(int, pair.split(','))): value for pair, value in _raw['compose'].items()},
                  {int(cp): value for cp, value in _raw['ranks'].items()}, _raw['confusables'])
_tables = lambda: _native_tables
_name = base64.b64decode(sys.argv[2], validate=True).decode('utf-8', 'surrogatepass')
_name = _name.encode('utf-16-le', 'surrogatepass').decode('utf-16-le', 'surrogatepass')
print(json.dumps(before_upload_filename(_name), ensure_ascii=True))
