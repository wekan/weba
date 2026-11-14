# Filename policy source

`fileNameDisplay.js` is copied unchanged from the current WeKan checkout. The
browser bundle wraps its declarations in a namespace and replaces only the module
export statement. `manifest.json` records the original and bundle hashes.

Regenerate from the original WeKan checkout:

```sh
node tools/import-wekan-filenames.cjs /path/to/wekan
```

The native attachment Blob download uses `sanitizeDownloadFileName`. The raw
attachment API keeps its separate `exportFilename.attachmentDisposition` contract.
Stored/uploaded names and other display surfaces have their remaining policy
audits in TODO.md. Public HTTP downloads use their separate source header policy. The source comparison test checks the
unchanged bodies/constants, hashes and Unicode/exploit/length behavior.

Public HTTP header normalization also uses offline data in
`runtime/filename-data/`; its README documents generation and runtime packaging.
`NormalizationTest-17.txt.gz` is the unchanged official Unicode 17 test corpus from
https://www.unicode.org/Public/17.0.0/ucd/NormalizationTest.txt, compressed locally.
Its copyright header is preserved; `runtime/filename-data/LICENSE-Unicode.txt`
contains the Unicode license.
