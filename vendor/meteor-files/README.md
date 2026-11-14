# Interactive empty-file guard source

`empty-file-guard.json` retains the unchanged guard from the installed
`ostrio:files@3.0.1` `upload.js`, with its source and fragment SHA-256 hashes.
The maintained upstream 3.1.0 [upload.start implementation](https://github.com/veliovgroup/Meteor-Files/blob/master/upload.js)
was also checked (blob recorded in the fixture). It rejects size <= 0 before
calling filename hooks. This is a callback fragment with a small Meteor.Error
adapter, not the complete Meteor/DDP uploader.

`tools/import-native-filenames.cjs` executes the fragment to obtain the original
error reason for the native client. Runtime code needs no Meteor or network.
Model and chooser tests distinguish this interactive refusal from legitimate
zero-byte internal/raw uploads and verify no board data changes and valid retry.
The source uploader's license is retained in `LICENSE` and copied into the
compiled app resources as `native-upload-LICENSE.txt`.
