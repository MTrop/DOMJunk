@echo off
if not exist "dist" (
	mkdir dist
)
uglifyjs --compress --mangle --comments --source-map url=domjunk.min.js.map,includeSources --output dist\domjunk.min.js < domjunk.js
