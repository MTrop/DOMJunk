@echo off
if not exist "build" (
	mkdir build
)
uglifyjs --compress --mangle --comments --source-map url=domjunk.min.js.map,includeSources --output build\domjunk.min.js < domjunk.js && (
	pushd build
	gzip -c domjunk.min.js > domjunk.min.js.gz
	popd
)
