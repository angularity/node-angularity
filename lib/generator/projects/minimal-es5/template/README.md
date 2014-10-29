#es6-modular

> Proof of concept for es6 modules from source mixed with bower packages

## Usage

```javascript
npm install
gulp
```

The node package install should imply a bower install. The build system is gulp with a default task that watches files
and serves applications.

With persistent storage

[http://localhost:8000/app](http://localhost:8000/app)

With mock storage

[http://localhost:8000/dev/no-storage](http://localhost:8000/dev/no-storage)

These applications are assembled from a library of components. Only the top level configuration is different.

## Aim

Selectively include **modular** code that has be authored in a separate project path. And do so in a way that is
idiomatic, or at least terse.

Add some syntactic sugar for **classes** without substantially deviating from javascript syntax.

## Requirements

A directory of build `target`s representing AngularJS applications. Each application HTML has a single corresponding
javascript and sass file.

The application javascript file:

 * Includes library code by [Ecmascript6(ES6)](http://wiki.ecmascript.org/doku.php?id=harmony:modules) import. Library
   code is identified by the `js-lib` directory name. Such lib directories may be local to the `src` directory or
   contained in `bower` packages.
   
 * Provide configuration and IOC mappings, such as `angular.module().service()`. The library files typically implement
   classes to be used in such IOC mappings.
   
The application sass file:

 * Includes library code by SASS `@import`. Library code is identified by the `css-lib` directory name. Such lib
   directories may be local to the `src` directory or contained in `bower` packages.

All import syntax must be the same for any source, such that:

 * Local library code may be arbitrarily moved to remote packages, or
 
 * Package code may be overriden by local code

[Source maps](http://blog.teamtreehouse.com/introduction-source-maps) must be generated for all compiled code and map
to the correct source.

## Comparisons

This solution is influenced by [Guy Bedford's article](http://guybedford.com/practical-workflows-for-es6-modules).

It arguably duplicates the functionality of [es6ify](https://www.npmjs.org/package/es6ify). Please consider which
implementation best suits your needs.

This implementation presumes that:

 * You are using a small number of top-level Ecmascript 6 files for each HTML application
 
 * You want to fully resolve all imports at compile time.
 
 * Your library paths that may need to be discovered by globing.

## How it works

The google originated [Tracur](https://github.com/google/traceur-compiler) compiler provides support for a subset of ES6
features. These are sufficient to address the stated aims.

To achieve uniform `import` syntax, we need to be able to specify a number of library paths. Unlike Libsass, Traceur
does not currently support such library paths. All files must be in the same (temporary) directory, and are specified
relative to the compiled output.

API support for Traceur does not currently support single file output in manner that can be integrated with Gulp.
Certainly there is no support for a virtual (stream) implementation of such temporary files. So we use a conventional
directory that is deleted before and after `js:build` steps.

A side effect of the `temp` directory is that the source-maps will incorrectly reference files in the `temp` directory
and must be rewritten. To do so, we track the movement of files, so that we can make correction to the source-maps.

Each HTML file is injected with all javascript and css that is in the same directory, and all parent directories, up to
and including the build base path. It is also injected with bower `dependencies`.