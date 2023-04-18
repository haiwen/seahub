import React from 'react';
import ReactDom from 'react-dom';
import { SimpleEditor } from '@seafile/sdoc-editor';

const { serviceURL } = window.app.config;
const { repoID, docPath, docName, docUuid, seadocAccessToken, seadocServerUrl } = window.app.pageOptions;

window.seafile = {
  repoID,
  docPath,
  docName,
  docUuid,
  isOpenSocket: true,
  serviceUrl: serviceURL,
  accessToken: seadocAccessToken,
  sdocServer: seadocServerUrl,
};

class ViewFileSdoc extends React.Component {



  render() {
    return (<SimpleEditor />);
  }
}

ReactDom.render(<ViewFileSdoc />, document.getElementById('wrapper'));
