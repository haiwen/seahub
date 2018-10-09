import React from 'react';
import ReactDOM from 'react-dom';
import Prism from 'prismjs';
import { siteRoot, gettext, draftID, reviewID, draftOriginFilePath, draftOriginRepoID, draftFileName, opStatus, publishFileVersion, originFileVersion } from './utils/constants'; 
import { seafileAPI } from './utils/seafile-api';
import axios from 'axios';
import DiffViewer from '@seafile/seafile-editor/dist/diff-viewer/diff-viewer';
import Loading from './components/loading';

import 'seafile-ui';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import './css/layout.css';
import './css/initial-style.css';
import './css/toolbar.css';

require('@seafile/seafile-editor/src/lib/code-hight-package');

class DraftReview extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      draftContent: '',
      draftOriginContent: '',
      reviewStatus: opStatus == 'open' ? true : false,
      isLoading: true,
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
            draftOriginContent: draftOriginContent.data,
            isLoading: false
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
          draftOriginContent: draftOriginContent.data,
          isLoading: false,
        }); 
      }));
    }
  }

  onCloseReview = () => {
    seafileAPI.updateReviewStatus(reviewID, 'closed').then(res => {
      this.setState({reviewStatus: false})
    });
  }

  onPublishReview = () => {
    seafileAPI.updateReviewStatus(reviewID, 'finished').then(res => {
      this.setState({reviewStatus: false})
    });
  }

  render() {
    return(
      <div className="wrapper">
        <div id="header" className="header">
          <div className="cur-file-info">
            <div className="info-item file-feature">
              <span className="fas fa-code-merge"></span>
            </div>
            <div className="info-item file-info">
              <span className="file-name">{draftFileName}</span>
            </div>
          </div>
          {
            this.state.reviewStatus && 
            <div className="cur-file-operation">
              <button className="btn btn-secondary file-operation-btn" title={gettext('Close Review')} onClick={this.onCloseReview}>{gettext("Close")}</button>
              <button className="btn btn-secondary file-operation-btn" title={gettext('Publish Review')} onClick={this.onPublishReview}>{gettext("Publish")}</button>
            </div>
          }
        </div>
        <div id="main" className="main">
          <div className="cur-view-container content-container">
            <div className="cur-view-content">
              <div className="markdown-viewer-render-content article">
                { 
                  this.state.isLoading ? 
                  <Loading /> :
                  <DiffViewer markdownContent={this.state.draftContent} markdownContent1={this.state.draftOriginContent} />
                }
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
