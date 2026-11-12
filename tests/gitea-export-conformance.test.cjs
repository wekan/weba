'use strict';
const fs=require('node:fs'),path=require('node:path');
process.env.WEBA_TEST_ISSUE_FORMAT='gitea';
process.env.WEBA_DB_HOST=path.join(process.env.WEBA_TEST_GITHUB_PROJECT,'gitea-data');
fs.mkdirSync(process.env.WEBA_DB_HOST,{recursive:true});
require('./github-export-conformance.test.cjs');
