// Import the source catalog and captions without a runtime Meteor dependency.
'use strict';
const fs=require('node:fs'),path=require('node:path'),source=path.resolve(process.argv[2]||'../../..'),policy=require(path.join(source,'models/lib/instanceFeatures.js')),en=JSON.parse(fs.readFileSync(path.join(source,'imports/i18n/data/en.i18n.json'),'utf8'));
const captions={};for(const feature of policy.FEATURES)for(const key of [feature.labelKey,feature.descKey])captions[key]=en[key];
fs.writeFileSync(path.join(__dirname,'../WeKan/.public/instance-features.json'),JSON.stringify({features:policy.FEATURES,keys:policy.FEATURE_KEYS,captions},null,2)+'\n');
console.log(`Imported ${policy.FEATURES.length} source instance feature groups`);
