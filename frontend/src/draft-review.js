import React from 'react';
import ReactDOM from 'react-dom';
/* eslint-disable */
import Prism from 'prismjs';
/* eslint-enable */
import { siteRoot, gettext, reviewID, draftOriginFilePath, draftFilePath, draftOriginRepoID, draftFileName, opStatus, publishFileVersion, originFileVersion } from './utils/constants';
import { seafileAPI } from './utils/seafile-api';
import axios from 'axios';
import DiffViewer from '@seafile/seafile-editor/dist/viewer/diff-viewer';
import Loading from './components/loading';
import Toast from './components/toast';
import ReviewComments from './components/review-list-view/review-comments';

import 'seafile-ui';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import './css/layout.css';
import './css/initial-style.css';
import './css/toolbar.css';
import './css/draft-review.css';

require('@seafile/seafile-editor/dist/editor/code-hight-package');

class DraftReview extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      draftContent: '',
      draftOriginContent: '',
      reviewStatus: opStatus,
      isLoading: true,
      commentsNumber: null,
      isShowComments: false,
    };
  }

  componentDidMount() {
    if (publishFileVersion == 'None') {
      axios.all([
        seafileAPI.getFileDownloadLink(draftOriginRepoID, draftFilePath),
        seafileAPI.getFileDownloadLink(draftOriginRepoID, draftOriginFilePath)
      ]).then(axios.spread((res1, res2) => {
        axios.all([
          seafileAPI.getFileContent(res1.data),
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
      this.setState({reviewStatus: 'closed'});
      Toast.success('Review close succeeded.');
    }).catch(() => {
      Toast.error('Review close failed.');
    });
  }

  onPublishReview = () => {
    seafileAPI.updateReviewStatus(reviewID, 'finished').then(res => {
      this.setState({reviewStatus: 'finished'});
      Toast.success('Review publish succeeded.');
    }).catch(() => {
      Toast.error('Review publish failed.');
    });
  }

  toggleCommentList = () => {
    this.setState({
      isShowComments: !this.state.isShowComments
    });
  }

  getCommentsNumber = () => {
    seafileAPI.listReviewComments(reviewID).then((res) => {
      let number = res.data.total_count;
      this.setState({
        commentsNumber: number,
      });
    });
  }

  componentWillMount() {
    this.getCommentsNumber();
  }

  render() {
    return(
      <div className="wrapper">
        <div id="header" className="header review">
          <div className="cur-file-info">
            <div className="info-item file-feature">
              <span className="fas fa-code-merge"></span>
            </div>
            <div className="info-item file-info">
              <span className="file-name">{draftFileName}</span>
              <span className="file-copywriting">{gettext('review')}</span>
            </div>
          </div>
          <div className="button-group">
            <button className="btn btn-icon btn-secondary btn-active common-list-btn"
              id="commentsNumber" type="button" data-active="false"
              onMouseDown={this.toggleCommentList}>
              <i className="fa fa-comments"></i>
              { this.state.commentsNumber > 0 &&
                <span>&nbsp;{this.state.commentsNumber}</span>
              }
            </button>
            {
              this.state.reviewStatus === 'open' &&
              <div className="cur-file-operation">
                <button className="btn btn-secondary file-operation-btn" title={gettext('Close Review')} onClick={this.onCloseReview}>{gettext("Close")}</button>
                <button className="btn btn-success file-operation-btn" title={gettext('Publish Review')} onClick={this.onPublishReview}>{gettext("Publish")}</button>
              </div>
            }
            {
              this.state.reviewStatus === 'finished' &&
              <div className="review-state review-state-finished">{gettext('Finished')}</div>
            }
            {
              this.state.reviewStatus === 'closed' && 
              <div className="review-state review-state-closed">{gettext('Closed')}</div>
            }
          </div>
        </div>
        <div id="main" className="main">
          <div className="cur-view-container content-container">
            <div className={!this.state.isShowComments ? "cur-view-content" : "cur-view-content cur-view-content-commenton"}>
              <div className="markdown-viewer-render-content article">
                {this.state.isLoading ? 
                  <Loading /> :
                  <DiffViewer markdownContent={this.state.draftContent} markdownContent1={this.state.draftOriginContent} />
                }
              </div>
            </div>
            { this.state.isShowComments &&
              <ReviewComments
                toggleCommentList={this.toggleCommentList}
                commentsNumber={this.state.commentsNumber}
                getCommentsNumber={this.getCommentsNumber}
              />
            }
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