'use strict';
const fs=require('node:fs'),request=JSON.parse(fs.readFileSync(0,'utf8')),native=require('./native-mime-source.cjs')(request.source);
Promise.all(request.headers.map(value=>native(['--mime-type','-b','-'],Buffer.from(value,'base64')))).then(rows=>process.stdout.write(JSON.stringify(rows))).catch(error=>{console.error(error);process.exitCode=1;});
