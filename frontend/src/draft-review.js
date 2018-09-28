import React from 'react';
import ReactDOM from 'react-dom';
import Prism from 'prismjs';
import { draftID, draftRepoID, draftFilePath, draftOriginFilePath, draftOriginRepoID, draftFileName } from './components/constants'; 
import { seafileAPI } from './utils/seafile-api';
import axios from 'axios';
import Account from './components/common/account';
import DiffViewer from '@seafile/seafile-editor/dist/diff-viewer/diff-viewer'; 
import './css/initial-style.css';

import 'seafile-ui';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import './css/layout.css';
import './css/file-history.css';
import './css/toolbar.css';

require('@seafile/seafile-editor/src/lib/code-hight-package');


class DraftReview extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      draftContent: '',
      draftOriginContent: '',
    };
  }

  componentDidMount() {
    axios.all([
      seafileAPI.getDraft(draftID),
      seafileAPI.getFileDownloadLink(draftOriginRepoID, draftOriginFilePath)
    ]).then(axios.spread((res1, res2) => {
      axios.all([
        seafileAPI.getFileContent(res1.data.links),
        seafileAPI.getFileContent(res2.data)
      ]).then(axios.spread((draftContent, draftOriginContent) => {
          this.setState({
            draftContent: draftContent.data,
            draftOriginContent: draftOriginContent.data
          }); 
        }));
      }));
  }

  render() {
    return(
      <div>
        <div id="header" className="draft-viewer-topbar d-flex justify-content-between">
          <div className="topbar-file-info">
            <div className="file-title">
              <span className="file-name">{draftFileName}</span>
            </div>
          </div>
          <Account />
        </div>
        <div id="main" className="main-panel viewer">
          <div className="main-panel-center history-viewer-contanier">
            <div className="content-viewer">
              <div className="markdown-viewer-render-content article">
                <DiffViewer markdownContent={this.state.draftContent} 
                            markdownContent1={this.state.draftOriginContent} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

ReactDOM.render (
  <DraftReview />,
  document.getElementById('wrapper')
);
