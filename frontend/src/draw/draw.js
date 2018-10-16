import { seafileAPI } from '../utils/seafile-api';
import DrawViewer from './draw-viewer';


function loadFile(editorUi) {
  return seafileAPI.getFileContent(window.app.config.rawPath).then((res) => {
    var doc = window.mxUtils.parseXml(res.data);
    //console.log(doc.documentElement);
    editorUi.editor.setGraphXml(doc.documentElement);
    editorUi.editor.setModified(false);
    editorUi.editor.undoManager.clear();
  });
}

function saveFile(content) {
  return seafileAPI.getUpdateLink(window.app.config.repoID, window.app.config.parentDir).then((res) => {
    return seafileAPI.updateFile(res.data, window.app.config.path, window.app.config.filename, content);
  });
}


window.loadFile = loadFile;
window.saveFile = saveFile;
window.DrawViewer = DrawViewer;
