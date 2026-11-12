'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'models/lib/externalExportFormatters.js')))source=ancestor;else ancestor=path.dirname(ancestor);}assert.ok(source);
 const {formatters}=await import(pathToFileURL(path.join(source,'models/lib/externalExportFormatters.js')).href),sample=JSON.parse(execFileSync(process.env.GBX,['-s','DeckExportTest',process.env.WEBA_TEST_DECK_PROJECT],{encoding:'utf8',env:process.env}));
 const cases=JSON.parse(execFileSync(process.env.GBX,['-s','DeckCasesTest',process.env.WEBA_TEST_DECK_PROJECT],{encoding:'utf8',env:process.env}));for(const entry of cases)assert.deepEqual(JSON.parse(entry.actual),JSON.parse(JSON.stringify(formatters.deck(entry))));
 const actual=JSON.parse(sample.actual),expected=JSON.parse(JSON.stringify(formatters.deck(sample)));
 assert.deepEqual(actual,expected);assert.ok(!sample.actual.includes('HIDDEN_MONDAY_BODY'));assert.ok(actual.stacks.some(stack=>stack.cards.some(card=>card.comments&&card.assignedUsers&&card.done)));
 console.log('Deck native/source: exact stack-title grouping, typed dates/optional omissions, literal text/labels, repeated assignees/members, comments, archived exclusion and assigned-only denial passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
