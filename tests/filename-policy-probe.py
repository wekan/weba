"""Offline source-oracle bridge; never a runtime service or executable input."""
import gzip
import hashlib
import json
from pathlib import Path
import struct
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'runtime'))
import filename_policy as policy
import server
request = json.load(sys.stdin)
if request['mode'] == 'scalars':
    digest = hashlib.sha256()
    for cp in range(0x110000):
        if 0xD800 <= cp <= 0xDFFF:
            continue
        for normalize in (policy.normalize_nfkd, policy.normalize_nfkc):
            wire = normalize(chr(cp)).encode('utf8')
            digest.update(struct.pack('<II', cp, len(wire)))
            digest.update(wire)
    print(digest.hexdigest())
elif request['mode'] == 'unicode-tests':
    count = 0
    for line in gzip.decompress(Path(request['file']).read_bytes()).decode('utf8').splitlines():
        line = line.split('#')[0].strip()
        if not line or line.startswith('@'):
            continue
        columns = [''.join(chr(int(cp, 16)) for cp in column.split()) for column in line.split(';')[:5]]
        for value in columns:
            if policy.normalize_nfkc(value) != columns[3] or policy.normalize_nfkd(value) != columns[4]:
                raise AssertionError('Normalization corpus mismatch at ' + line)
            count += 1
    print(count)
else:
    rows = []
    for name in request['names']:
        row = {}
        for key, function in [('exploit', policy.filename_looks_like_exploit), ('before', policy.before_upload_filename), ('clean', policy.clean_filename), ('public', policy.public_attachment_disposition), ('api', server.attachment_disposition)]:
            try:
                row[key] = function(name)
            except UnicodeError:
                row[key] = {'error': True}
        rows.append(row)
    print(json.dumps(rows, ensure_ascii=True))
