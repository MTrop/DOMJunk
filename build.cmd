@echo off
if not exist "dist" (
	mkdir dist
)

SETLOCAL
SET OPTIONS=--compress --mangle --comments 

uglifyjs %OPTIONS% --source-map url=domjunk.min.js.map,includeSources --output dist\domjunk.min.js < domjunk.js && uglifyjs %OPTIONS% --source-map url=jaxxy.min.js.map,includeSources --output dist\jaxxy.min.js < jaxxy.js && uglifyjs %OPTIONS% --source-map url=jstate.min.js.map,includeSources --output dist\jstate.min.js < jstate.js

ENDLOCAL
