import React from 'react';
import ReactDOM from 'react-dom';
import CodeMirror from 'react-codemirror';

import 'codemirror/lib/codemirror.css';
import './css/text-file-view.css';

const { formContent } = window.shared.pageOptions;

class DTableFormView extends React.Component {
  render() {
    return (
      <div className="shared-file-view-body text-file-view">
        <CodeMirror
          ref="code-mirror-editor"
          value={formContent}
        />
      </div>
    );
  }
}

ReactDOM.render(
  <DTableFormView />,
  document.getElementById('wrapper')
);
