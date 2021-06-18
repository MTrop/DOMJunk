@echo off
if not exist "build" (
	mkdir build
)
uglifyjs -c -m --comments --name-cache build\domjunk.map < domjunk.js > build\domjunk.min.js
pushd build
gzip -c domjunk.min.js > domjunk.min.js.gz
popd
