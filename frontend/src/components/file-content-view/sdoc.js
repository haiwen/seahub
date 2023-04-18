import React from 'react';
import { SDocViewer } from '@seafile/sdoc-editor';

import '../../css/sdoc-file-view.css';

const { fileContent } = window.app.pageOptions;

class FileContent extends React.Component {

  render() {
    const document = fileContent ? JSON.parse(fileContent) : null;
    return (
      <div className="file-view-content flex-1 o-auto sdoc-file-view p-0 d-flex flex-column">
        <SDocViewer document={document} />
      </div>
    );
  }
}

export default FileContent;
