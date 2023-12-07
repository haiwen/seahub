import React from 'react';
import { MarkdownViewer } from '@seafile/seafile-editor';
import { mediaUrl } from '../../utils/constants';

import '../../css/md-file-view.css';

const { fileContent } = window.app.pageOptions;

class FileContent extends React.Component {
  render() {
    return (
      <div className="file-view-content md-content">
        <MarkdownViewer
          isFetching={false}
          value={fileContent}
          isShowOutline={false}
          mathJaxSource={mediaUrl + 'js/mathjax/tex-svg.js'}
        />
      </div>
    );
  }
}

export default FileContent;
