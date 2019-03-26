import React from 'react';
import ReactDOM from 'react-dom';
import { Utils } from './utils/utils';
import FileView from './components/file-view/file-view';
import FileViewTip from './components/file-view/file-view-tip';

import CodeMirror from 'react-codemirror';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/css/css';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/php/php';
import 'codemirror/mode/sql/sql';
import 'codemirror/mode/vue/vue';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/go/go';
import 'codemirror/mode/python/python';
import 'codemirror/mode/htmlmixed/htmlmixed';
import 'codemirror/lib/codemirror.css';

import './css/text-file-view.css';

const {
  err, fileExt, fileContent
} = window.app.pageOptions;

const options = {
  lineNumbers: true,
  mode: Utils.chooseLanguage(fileExt),
  extraKeys: {'Ctrl': 'autocomplete'},
  theme: 'default',
  textWrapping: true,
  lineWrapping: true,
  readOnly: true,
  cursorBlinkRate: -1 // hide the cursor
};

class ViewFileText extends React.Component {
  render() {
    return (
      <FileView content={<FileContent />} />
    );
  }
}

class FileContent extends React.Component {
  render() {
    if (err) {
      return <FileViewTip />;
    }
    return (
      <div className="file-view-content flex-1 text-file-view">
        <CodeMirror
          ref="code-mirror-editor"
          value={fileContent}
          options={options}
        />
      </div>
    );
  }
}

ReactDOM.render (
  <ViewFileText />,
  document.getElementById('wrapper')
);
