#!/usr/bin/env bash
org="fin-hypergrid"
module="finbars"

# set variable repo to current directory name (without path)
repo=${PWD##*/}

# make sure the docs are built
gulp doc >/dev/null

# remove temp directory in case it already exists, remake it, switch to it
rm -rf ../temp >/dev/null
mkdir ../temp
pushd ../temp >/dev/null

# clone it so it will be a branch of the repo
git clone -q --single-branch http://github.com/$org/$repo.git
cd $repo >/dev/null

# create and switch to a new gh-pages branch
git checkout -q --orphan gh-pages

# remove all content from this new branch
git rm -rf -q .

# copy the doc directory from the workspace
cp -R ../../$repo/doc/* . >/dev/null

# copy $module.js and $module.min.js from $repo/build to the cdn directory
cp ../../$repo/build/$module.js . >/dev/null
cp ../../$repo/build/$module.min.js . >/dev/null

# copy the demo
cp ../../$repo/demo.html . >>/dev/null

# send it up
git add . >/dev/null
git commit -q -m '(See gh-pages.sh on master branch.)'
git push -ufq origin gh-pages >/dev/null

# back to workspace
popd >/dev/null

# remove temp directory
rm -rf ../temp >/dev/null

echo 'Opening page at http://$org.github.io/$repo/ ...'
open http://$org.github.io/$repo/FinBar.html
echo 'CAVEAT: New pages will not be immediately available so wait a few minutes and refresh.'
