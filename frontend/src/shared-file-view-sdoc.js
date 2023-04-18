import React from 'react';
import ReactDom from 'react-dom';
import { SimpleViewer } from '@seafile/sdoc-editor';

const { serviceURL } = window.app.config;
const { repoID, filePath, fileName } = window.shared.pageOptions;

const { rawPath } = window.shared.pageOptions;

window.seafile = {
  repoID,
  rawPath: rawPath,
  docName: fileName,  // required
  docPath: filePath,
  serviceUrl: serviceURL,
};

class ViewFileSdoc extends React.Component {

  render() {
    return <SimpleViewer />;
  }
}

ReactDom.render(<ViewFileSdoc />, document.getElementById('wrapper'));

