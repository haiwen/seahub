import React from 'react';
import ReactDOM from 'react-dom';
import Prism from 'prismjs';
import { siteRoot, gettext, draftID, reviewID,
         draftOriginFilePath, draftOriginRepoID, 
         draftFileName, opStatus, publishFileVersion,
         originFileVersion
        } from './components/constants'; 
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
      review_status: opStatus == 'open' ? true : false
    };
  }

  componentDidMount() {
    if (publishFileVersion == 'None') {
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
    } else {
      let dl0 = siteRoot + 'repo/' + draftOriginRepoID + '/' + publishFileVersion + '/download?' + 'p=' + draftOriginFilePath; 
      let dl = siteRoot + 'repo/' + draftOriginRepoID + '/' + originFileVersion + '/download?' + 'p=' + draftOriginFilePath; 
      axios.all([
        seafileAPI.getFileContent(dl0),
        seafileAPI.getFileContent(dl)
      ]).then(axios.spread((draftContent, draftOriginContent) => {
          this.setState({
            draftContent: draftContent.data,
            draftOriginContent: draftOriginContent.data
          }); 
        }));
    }
  }

  onCloseReview = () => {
    seafileAPI.updateReviewStatus(reviewID, 'closed').then(res => {
      this.setState({
        review_status: false
      })
    });
  }

  onPublishReview = () => {
    seafileAPI.updateReviewStatus(reviewID, 'finished').then(res => {
      this.setState({
        review_status: false
      })
    });
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
          { this.state.review_status && 
            <div className="cur-view-toolbar">
              <button className="btn btn-secondary top-toolbar-btn" title={gettext('Close Review')} onClick={this.onCloseReview}>{gettext("Close")}</button>
              <button className="btn btn-secondary top-toolbar-btn" title={gettext('Publish Review')} onClick={this.onPublishReview}>{gettext("Publish")}</button>
            </div>
          }
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
