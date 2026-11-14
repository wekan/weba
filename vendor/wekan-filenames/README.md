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
appear in argv, within a 96KB budget. Requests use a decimal byte-length frame
capped at 98304 bytes; the sender
waits for worker readiness and each 2048-byte chunk acknowledgement. Responses
are capped at 4096 bytes for filename stages (8192 for MIME JSON envelopes),
ACKs at the current exchange phase, and the entire
exchange at three seconds. Worker stderr is discarded; errors are generic, and
failed workers are killed/reaped. Real process probes verify
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

The compiled bridge also exposes the staged `CorrectUploadName` helper. Its MIME
maps and MIT licenses are embedded under `.public/native-mime-*`; the manifest
pins their compressed/Base64 hashes. Public script plus both data arguments stay
within the same 96KB budget. The `correct` request sends filename and MIME as
Base64 JSON fields on private stdin (4096 and 1024 input bytes respectively,
within the 98304-byte framed request cap). It returns only the corrected name, leaving
stored MIME metadata independent. Actual project and `.gambas` archive probes
compare correction results with unchanged source and verify private argument
exclusion, boundary refusal before worker startup, cleanup and retry. Uploads
are not wired to this entry point until content detection is implemented.

Large private payloads must use the same framed exchange, never one bulk pipe
write. Upstream Gambas process/stream source uses a blocking stdin write loop:
[process stream](https://gitlab.com/gambas/gambas/-/blob/master/main/gbx/gbx_stream_process.c),
[stream write](https://gitlab.com/gambas/gambas/-/blob/master/main/gbx/gbx_stream.c).
The regression explicitly reduces pipe capacity and verifies complete 64KiB
binary payloads in maximum-size frames, plus ready-only and mid-request stalled
workers. Probe entry points and worker variants exist only in disposable test
projects; production exposes only typed filename stages. No temporary header
files or additional runtime dependencies are needed by this transport.

`DetectMimeHeader` stages the native branch of `models/lib/mimeDetection.js`.
It clips arbitrary binary input to 64KiB before private transport and returns a
validated lowercase MIME token or null. The bundled `runtime/mime_policy.py`
uses `file --mime-type -b -`, source SNAP/MAGIC lookup, a two-second selector
loop for stdin/stdout/stderr, 4096-byte output bounds and owned-session cleanup.
Exit is observed without reaping first so the process-group PID stays reserved
until cleanup. Native worker cleanup also waits through pipe events until the
killed worker stops or its cleanup deadline expires. The MIME JSON envelope has
an 8192-byte bound to retain the source's full 4096-byte token plus JSON syntax;
filename responses retain their separate 4096-byte cap. The package depends on
`file`, and the standalone Python runtime includes the same helper.

`native-mime-source.test.cjs` exposes the unchanged internal `nativeMime` only
inside the oracle VM. Actual project/archive tests exercise binary headers,
private hash/arguments, maximum MIME replies, quiet/null failures, invalid typed
replies and retry. Primary `file-type`, portable libmagic and actual upload/
REST/import/copy/SVG integration remain pending; native fallback coverage alone
does not establish the complete detector chain.
