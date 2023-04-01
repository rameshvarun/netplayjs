#!/usr/bin/env node
const process = require("process");
const path = require("path");

process.chdir(path.resolve(__dirname, ".."));
require('ts-node').register();
require('../src/index.ts');