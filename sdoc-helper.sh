#!/bin/sh

# Enter the frontend directory and install the latest version of sdoc-editor
echo 'install sdoc-editor version'
cd frontend
npm install @seafile/sdoc-editor@latest

# Copy the font icon of sdoc-editor
echo 'copy sdoc-editor font icon'
cd ..
cp -r frontend/node_modules/@seafile/sdoc-editor/public/media/sdoc-editor-font media/sdoc-editor/
cp -r frontend/node_modules/@seafile/sdoc-editor/public/media/sdoc-editor-font.css media/sdoc-editor/sdoc-editor-font.css


# Get the latest translation content of sdoc-editor
echo 'update sdoc-editor translation content'
tx pull -s -t -f seahub.sdoc-editor
cp -r media/sdoc-editor/locales/zh_CN/sdoc-editor.json media/sdoc-editor/locales/zh-CN/sdoc-editor.json

echo 'Please check the updated content and see if it needs to be submitted.'
read -p "Do you want to continue submitting code? y/n: " Y
if [ $Y = 'y' ]
then
    git add .
    git commit -m "update sdoc version and sdoc translate"
    git push origin master
fi

