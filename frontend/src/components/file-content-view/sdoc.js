import React from 'react';
import { MarkdownViewer } from '@seafile/seafile-editor';
import { mediaUrl } from '../../utils/constants';

import '../../css/md-file-view.css';

const { fileContent } = window.app.pageOptions;

class FileContent extends React.Component {
  render() {
    return (
      <div className="file-view-content flex-1 o-auto">
        <div className="md-content">
          <MarkdownViewer
            markdownContent={fileContent}
            showTOC={false}
            scriptSource={mediaUrl + 'js/mathjax/tex-svg.js'}
          />
        </div>
      </div>
    );
  }
}

export default FileContent;
