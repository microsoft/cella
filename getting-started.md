# Build Instructions

## Prerequisites: 
1. [Node.js](https://nodejs.org/en/download/) (>=14.15.0 <15.0.0) -- I suggest using [NVS](https://github.com/jasongin/nvs) -- written by a microsoft engineer.

2. [Rush](https://rushjs.io/pages/intro/welcome/) 

## VSCode extensions:


``` bash
npm install -g @microsoft/rush
```

## Preparation
The first time (or after pulling from upstream) use Rush to install modules packages.
``` bash
rush update 
```

## Building code
 - `rush rebuild` to build the modules
 or
 - `rush watch` to setup the build watcher 
 or
 - in VSCode, just build (ctrl-shift-b)


 ## Important Rush commands

### `rush update` 
Ensures that all the dependencies are installed for all the projects.  
Safe to run mulitple times. 

### `rush purge` 
Cleans out all the installed dependencies.  
If you run this, you must run `rush update` before building.

### `rush rebuild` 
Rebuilds all the projects from scratch

### `rush watch` 
Runs the typescript compiler in `--watch` mode to watch for modified files on disk.

### `rush test` 
Runs `npm test` on each project (does not build first -- see `rush test-ci`)

### `rush test-ci`
Runs `npm test-ci` on each project (rebuilds the code then runs the tests)

### `rush clean`  
Runs `npm clean` on each project -- cleans out the `./dist` folder for each project

### `rush lint` 
Runs `npm lint` on each project (runs the eslint on the source)

### `rush fix`
Runs `npm eslint-fix` on each project (fixes all fixable linter errors)

### `rush set-versions` 
This will set the `.build` verison for each project based on the commit number. 

### `rush sync-versions`
This will ensure that all the projects have consistent versions for all dependencies, and ensures that cross-project version references are set correctly


