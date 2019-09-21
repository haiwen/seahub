import React from 'react';
import ReactDOM from 'react-dom';
import CodeMirror from 'react-codemirror';

import 'codemirror/lib/codemirror.css';
import './css/text-file-view.css';

const { fileContent } = window.shared.pageOptions;

class SharedDTableRowView extends React.Component {
  render() {
    return (
      <div className="shared-file-view-body text-file-view">
        <CodeMirror
          ref="code-mirror-editor"
          value={fileContent}
        />
      </div>
    );
  }
}

ReactDOM.render(
  <SharedDTableRowView />,
  document.getElementById('wrapper')
);
