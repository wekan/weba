"""Compare offline upload-name helpers without a runtime JavaScript service."""
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'runtime'))
import filename_policy as policy
print(json.dumps([[policy.base_name_for_mime(mime), policy.extension_for_mime(mime),
                   policy.sanitize_upload_filename(name, mime)]
                  for name, mime in json.load(sys.stdin)], ensure_ascii=True))
