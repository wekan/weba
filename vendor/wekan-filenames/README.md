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


Interactive upload pre-cleaning uses the unchanged `Attachments.onBeforeUpload`
body in `native-upload-filenames.js`, scoped to the actual native chooser. The
model's explicit interactive flag runs the corresponding offline Python policy;
raw/JSON REST uploads and imports keep their separate source stages. The resource
bundle includes the unchanged runtime Python policy plus a small isolated driver,
the compact normalization table and Unicode license. `native-manifest.json`
records source hook, template, policy, driver, script and data hashes. Regenerate:

```sh
node tools/import-filename-normalization.cjs /path/to/wekan
```

`native-upload-filename-policy.test.cjs` compares the source hook and resource
hashes; native model and chooser tests also exercise the actual isolated bridge,
failure rollback and exact bytes. Gambas uses an argument array and private
stdin/stdout pipes ([EXEC documentation](https://gambaswiki.org/wiki/lang/exec)).
Filename requests are Base64 inside JSON on stdin; only public script/table data
appear in argv, within a 96KB budget. Requests are capped at 8192 bytes, responses
at 4096 bytes and execution at three seconds. Worker stderr is discarded; errors
are generic, and failed workers are killed/reaped. Real process probes verify
argument privacy, malformed/oversized/noisy/nonzero/stalled workers and retry.
The model bounds raw filename input to 4096 bytes and verifies
the source 30-code-point result cap. The interactive source hook runs before the
legacy basename gate, preserving its dot/path-only `unnamed` fallback. Client
metadata pre-cleaning and server pre-cleaning are independent;
REST/post-upload exploit rejection, type detection, extension correction and
SVG/copy/import policies remain under audit in TODO.md.


The interactive model also checks `uploadFileName.filenameLooksLikeExploit` after
its server pre-clean pass. `postPolicySourceSha256` pins that original module;
`upload-filename-classifier.test.cjs` compares decoded-name verdicts including
JavaScript ASCII case/word and whitespace behavior. Runtime verdicts carry only
the normalized name and Boolean rejection flag. The pre-hook oracle interface
stays independent, and REST/import/content/extension/SVG/copy policies are separate
pending audits. Native rejection occurs before storage writes; source library
post-upload storage/response behavior is not claimed by this adapter.
