org="openfin"

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

# copy all source files from src/js to the cdn directory here
ln -s ../../$repo/src/js src
ls src | while read a; do uglify -s src/$a -o ${a%.js}.min.js; done
rm src

# send it up
git add . >/dev/null
git commit -q -m '(See gh-pages.sh on master branch.)'
git push -ufq origin gh-pages >/dev/null

# back to workspace
popd >/dev/null

# remove temp directory
rm -rf ../temp >/dev/null

echo 'Opening page at http://$org.github.io/$repo/ ...'
open http://$org.github.io/$repo/
echo 'CAVEAT: New pages will not be immediately available so wait a few minutes and refresh.'
