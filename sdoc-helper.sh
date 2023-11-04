#!/bin/sh

cd frontend

npm install @seafile/sdoc-editor@latest

cd ..

cp -r frontend/node_modules/@seafile/sdoc-editor/public/media/sdoc-editor-font media/sdoc-editor/sdoc-editor-font
cp -r frontend/node_modules/@seafile/sdoc-editor/public/media/sdoc-editor-font.css media/sdoc-editor/sdoc-editor-font.css

tx pull -s -t -f seahub.sdoc-editor

# git add .

# git commit -m "update sdoc version and sdoc translate"

# git push origin master

