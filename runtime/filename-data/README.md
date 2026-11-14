# Offline filename normalization

The public attachment header follows WeKan's `universalFileServer.js` and
`fileNameDisplay.js`. The raw API retains its separate `exportFilename.js` format.
Normalization is pinned to the original source's Node Unicode version rather than
the host Python Unicode database. The runtime needs only Python's standard library.

Regenerate from the pinned Node used by the original checkout:

```sh
node tools/import-filename-normalization.cjs /path/to/wekan
```

The manifest records the engine, source hash and data hash. The table contains full
compatibility decompositions and canonical composition pairs except Hangul, whose
standard algorithm is applied directly, plus relative combining
class ranks (sufficient for stable canonical ordering and composition blocking).
The implementation follows [Unicode normalization](https://www.unicode.org/reports/tr15/).
Unicode data and its license are included beside the host in every runtime package.
The importer also rebuilds the matching compiled Gambas resources; the same policy
and compact tables support the interactive upload bridge without runtime Node.

`tests/public-filename-policy.test.cjs` compares all Unicode scalar normalizations
against the pinned original engine, the official Unicode 17 normalization corpus,
and mixed filename/public-header/raw-API cases. The compressed corpus is retained
under `vendor/wekan-filenames/NormalizationTest-17.txt.gz` with its original header.
