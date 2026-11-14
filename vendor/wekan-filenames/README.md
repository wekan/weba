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
Stored/uploaded names, other display surfaces and public HTTP downloads have their
own remaining policy audits in TODO.md. The source comparison test checks the
unchanged bodies/constants, hashes and Unicode/exploit/length behavior.
