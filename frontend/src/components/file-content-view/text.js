import React from 'react';
import { Utils } from '../../utils/utils';

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

import '../../css/text-file-view.css';

const {
  fileExt, fileContent
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

class FileContent extends React.Component {
  render() {
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

export default FileContent;
