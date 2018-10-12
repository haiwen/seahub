import { seafileAPI } from './utils/seafile-api';

function printHello() {
  console.log("Hello from draw.js");
}

function loadFile(editorUi) {
  return seafileAPI.getFileDownloadLink('3e1b6ebf-c564-4cd2-87e9-69070c260fb4', '/mx-graph-v2.xml')
  .then((res) => {
    return seafileAPI.getFileContent(res.data).then((res) => {
      var doc = window.mxUtils.parseXml(res.data);
      console.log(doc.documentElement);
      editorUi.editor.setGraphXml(doc.documentElement);
      editorUi.editor.setModified(false);
      editorUi.editor.undoManager.clear();
    });
  });
}

function saveFile(content) {
  return seafileAPI.getUpdateLink('3e1b6ebf-c564-4cd2-87e9-69070c260fb4', '/')
  .then((res) => {
    return seafileAPI.updateFile(res.data, '/my-draw.draw', 'my-draw.draw', content);
  });
}

window.loadFile = loadFile;
window.saveFile = saveFile;
