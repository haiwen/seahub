import React from 'react';
import ReactDOM from 'react-dom';
/* eslint-disable */
import Prism from 'prismjs';
/* eslint-enable */
import { siteRoot, gettext, draftID, reviewID, draftOriginFilePath, draftFilePath, draftOriginRepoID, draftFileName, opStatus, publishFileVersion, originFileVersion } from './utils/constants';
import { seafileAPI } from './utils/seafile-api';
import axios from 'axios';
import DiffViewer from '@seafile/seafile-editor/dist/viewer/diff-viewer';
import Loading from './components/loading';
import Toast from './components/toast';
import ReviewComments from './components/review-list-view/review-comments';
import { Button, Tooltip } from 'reactstrap';
import AddReviewerDialog from './components/dialog/add-reviewer-dialog.js';

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
      inResizing: false,
      commentWidth: 30,
      isShowDiff: true,
      showDiffTip: false,
      showReviewerDialog: false,
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
      let msg_s = gettext('Successfully closed review %(reviewID)s.');
      msg_s = msg_s.replace('%(reviewID)s', reviewID);
      Toast.success(msg_s);
    }).catch(() => {
      let msg_s = gettext('Failed to close review %(reviewID)s');
      msg_s = msg_s.replace('%(reviewID)s', reviewID);
      Toast.error(msg_s);
    });
  }

  onPublishReview = () => {
    seafileAPI.updateReviewStatus(reviewID, 'finished').then(res => {
      this.setState({reviewStatus: 'finished'});
      let msg_s = gettext('Successfully published review %(reviewID)s.');
      msg_s = msg_s.replace('%(reviewID)s', reviewID);
      Toast.success(msg_s);
    }).catch(() => {
      let msg_s = gettext('Failed to close review %(reviewID)s.')
      msg_s = msg_s.replace('%(reviewID)s', reviewID);
      Toast.error(msg_s);
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

  onResizeMouseUp = () => {
    if(this.state.inResizing) {
      this.setState({
        inResizing: false
      });
    }
  }

  onResizeMouseDown = () => {
    this.setState({
      inResizing: true
    });
  };

  onResizeMouseMove = (e) => {
    let rate = 100 - e.nativeEvent.clientX / this.refs.main.clientWidth * 100;
    if(rate < 20 || rate > 60) {
      this.setState({
        inResizing: false
      });
      return null;
    }
    this.setState({
      commentWidth: rate
    });
  };

  onSwitchShowDiff = () => {
    this.setState({
      isShowDiff: !this.state.isShowDiff,
    })
  }

  toggleDiffTip = () => {
    this.setState({
      showDiffTip: !this.state.showDiffTip
    });
  }

  toggleAddReviewerDialog = () => {
    this.setState({
      showReviewerDialog: !this.state.showReviewerDialog
    });
  }

  componentWillMount() {
    this.getCommentsNumber();
  }

  render() {
    const onResizeMove = this.state.inResizing ? this.onResizeMouseMove : null;
    const draftLink = siteRoot + 'lib/' + draftOriginRepoID + '/file' + draftFilePath + '?mode=edit';
    return(
      <div className="wrapper">
        <div id="header" className="header review">
          <div className="cur-file-info">
            <div className="info-item file-feature">
              <span className="fas fa-code-merge"></span>
            </div>
            <div className="info-item file-info">
              <React.Fragment>
                <span className="file-name">{draftFileName}</span>
                <span className="file-copywriting">{gettext('review')}</span>
              </React.Fragment>
              { draftID !== 'None' && <a href={draftLink} className="draft-link">{gettext('Edit draft')}</a>}
            </div>
          </div>
          <div className="button-group">
            <div className={'seafile-toggle-diff'}>
              <label className="custom-switch" id="toggle-diff">
                <input type="checkbox" checked={this.state.isShowDiff ? 'checked' : ''}
                  name="option" className="custom-switch-input"
                  onClick={this.onSwitchShowDiff}/>
                <span className="custom-switch-indicator"></span>
              </label>
              <Tooltip placement="bottom" isOpen={this.state.showDiffTip}
                target="toggle-diff" toggle={this.toggleDiffTip}>
                {gettext('View diff')}</Tooltip>
            </div>
            <button className="btn btn-primary add-reviewer-btn" onClick={this.toggleAddReviewerDialog}>
              {gettext('Add reviewer')}</button>
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
                <button className='btn btn-secondary file-operation-btn' title={gettext('Close Review')} onClick={this.onCloseReview}>{gettext('Close')}</button>
                <button className='btn btn-success file-operation-btn' title={gettext('Publish Review')} onClick={this.onPublishReview}>{gettext('Publish')}</button>
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
        <div id="main" className="main" ref="main">
          <div className="cur-view-container content-container"
            onMouseMove={onResizeMove} onMouseUp={this.onResizeMouseUp} ref="comment">
            <div style={{width:(100-this.state.commentWidth)+'%'}}
              className={!this.state.isShowComments ? 'cur-view-content' : 'cur-view-content cur-view-content-commenton'} >
              {this.state.isLoading ? 
                <div className="markdown-viewer-render-content article">
                  <Loading /> 
                </div> 
                :
                <div className="markdown-viewer-render-content article">
                  {this.state.isShowDiff ? 
                    <DiffViewer markdownContent={this.state.draftContent} markdownContent1={this.state.draftOriginContent} />
                    : 
                    <DiffViewer markdownContent={this.state.draftContent} markdownContent1={this.state.draftContent} />
                  }
                </div>
              }
            </div>
            { this.state.isShowComments &&
              <div className="cur-view-right-part" style={{width:(this.state.commentWidth)+'%'}}>
                <div className="seafile-comment-resize" onMouseDown={this.onResizeMouseDown}></div>
                <ReviewComments
                  toggleCommentList={this.toggleCommentList}
                  commentsNumber={this.state.commentsNumber}
                  getCommentsNumber={this.getCommentsNumber}
                  inResizing={this.state.inResizing}
                />
              </div>
            }
          </div>
        </div>
        { this.state.showReviewerDialog &&
          <AddReviewerDialog
            showReviewerDialog={this.state.showReviewerDialog}
            toggleAddReviewerDialog={this.toggleAddReviewerDialog}
            reviewID={reviewID}
          />
        }
      </div>
    );
  }
}

ReactDOM.render (
  <DraftReview />,
  document.getElementById('wrapper')
);
