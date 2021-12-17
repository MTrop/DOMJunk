# DOMJunk

Copyright (c) 2021 Matt Tropiano
[https://github.com/MTrop/DOMJunk](https://github.com/MTrop/DOMJunk)


### Introduction

This is basically some kind of tiny jQuery-ish library with no insane bells or whistles 
and just the crap I need to do some web junk.


### Why?

Why not? I hate every web framework I've ever used, so I might as well make something that 
I don't hate.


### Library

The `dist` directory contains the latest version of the library, minified.


### Compiling/Minifying

To minify this, you'll need UglifyJS:

    npm install -g uglify-js


To build a minified DOMJunk file (plus map file), type:

	build


Or make sure the `dist` folder exists, and:

	uglifyjs --compress --mangle --comments --source-map url=domjunk.min.js.map,includeSources --output dist\domjunk.min.js < domjunk.js

	
### Other

This software and the accompanying materials are made available under the 
terms of the MIT License which accompanies this distribution.

A copy of the MIT License should have been included in this release (LICENSE.txt).
If it was not, please contact me for a copy, or to notify me of a distribution
that has not included it. 
