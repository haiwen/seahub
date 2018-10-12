import { seafileAPI } from './utils/seafile-api';

function printHello() {
  console.log("Hello from draw.js");
}

function loadFile(editorUi) {
  seafileAPI.getFileDownloadLink('3e1b6ebf-c564-4cd2-87e9-69070c260fb4', '/mx-graph-v2.xml')
    .then((res) => {
      seafileAPI.getFileContent(res.data).then((res) => {
        var doc = window.mxUtils.parseXml(res.data);
        console.log(doc.documentElement);
        editorUi.editor.setGraphXml(doc.documentElement);
        editorUi.editor.setModified(false);
        editorUi.editor.undoManager.clear();
      });
  });

}

window.loadFile = loadFile;
