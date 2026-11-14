import base64
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'runtime'))
import mime_policy
print(json.dumps([mime_policy.detect_native_mime(base64.b64decode(value, validate=True))
                  for value in json.load(sys.stdin)], ensure_ascii=True))
