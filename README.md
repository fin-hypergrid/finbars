# rectangular
Simple rectangle and point classes

## API documentation

Detailed API docs can be found [here](http://openfin.github.io/rectangular/).

## Regarding submodules

This repo has a git _submodule_, which on the remote appears as a folder that
is actually a pointer to another repo, similar to a linux _symbolic link_. 
On your local it is a normal folder with a copy of that other repo's contents.

### Cloning

When cloning this repo keep in mind that the `jsdoc-template` folder is a submodule.
Therefore, be sure to give the `--recurse-submodules` option to checkout the
contents of the submodule:

```shell
$ git clone --recurse-submodules https://github.com/openfin/repo-name-goes-here.git
```

If you forget, you can still do it (soon) after cloning as a separate command:

```shell
$ git clone https://github.com/openfin/repo-name-goes-here.git
$ git submodule update --init --recursive
```

### Re-purposing for a new repo

_Openfin developers:_
If you want to use this build template for a new repo, to continue to make use
of the symbolic link to the shared `jsdoc-template` folder, issue the following
commands:

```shell
$ rm -drf jsdoc-template/
$ rm .gitmodules
$ git submodule add https://github.com/openfin/jsdoc-template jsdoc-template
 ```
 
 These changes will then need to be committed.
 
