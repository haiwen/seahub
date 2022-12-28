import React from 'react';
import ReactDom from 'react-dom';
import { Utils } from './utils/utils';
import SharedFileView from './components/shared-file-view/shared-file-view';
import SharedFileViewTip from './components/shared-file-view/shared-file-view-tip';

import { UnControlled as CodeMirror } from 'react-codemirror2';
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

const { err, fileExt, fileContent } = window.shared.pageOptions;

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

class SharedFileViewText extends React.Component {
  render() {
    return <SharedFileView content={<FileContent />} />;
  }
}

class FileContent extends React.Component {
  render() {
    if (err) {
      return <SharedFileViewTip />;
    }

    return (
      <div className="shared-file-view-body text-file-view">
        <CodeMirror
          ref="code-mirror-editor"
          value={fileContent}
          options={options}
        />
      </div>
    );
  }
}

ReactDom.render(<SharedFileViewText />, document.getElementById('wrapper'));
