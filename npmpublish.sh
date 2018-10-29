#!/usr/bin/env bash

gulp build

mkdir umd
cp build/finbars.* umd

cp src/index.js .

rm npm-debug.log > /dev/null

npm publish

rm index.js
rm -fdr umd
