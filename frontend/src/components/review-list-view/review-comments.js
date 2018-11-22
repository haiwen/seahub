import React from 'react';
import PropTypes from 'prop-types';
import { processor } from '../../utils/seafile-markdown2html';
import { Button, Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Tooltip } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { reviewID, gettext } from '../../utils/constants';
import Loading from '../../components/loading.js';
import reviewComment from '../../models/review-comment.js';

import '../../css/review-comments.css';

const commentPropTypes = {
  getCommentsNumber: PropTypes.func.isRequired,
  inResizing: PropTypes.bool.isRequired,
  toggleCommentList: PropTypes.func.isRequired,
  commentsNumber: PropTypes.number.isRequired,
  selectedText: PropTypes.string,
  newIndex: PropTypes.number,
  oldIndex: PropTypes.number,
  scrollToQuote: PropTypes.func.isRequired
};

class ReviewComments extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      commentsList: [],
      userAvatar: '',
      inResizing: false,
      commentFooterHeight: 30,
      showResolvedComment: false,
      openResolvedTooltip: false,
      comment: '',
    };
    this.accountInfo = {};
  }

  listComments = (scroll) => {
    seafileAPI.listReviewComments(reviewID).then((response) => {
      response.data.comments.reverse();
      let commentList = [];
      response.data.comments.forEach(item => {
        let commentItem = new reviewComment(item);
        commentList.push(commentItem);
      });
      this.setState({
        commentsList: commentList
      });
      if (scroll) {
        this.refs.commentsList.scrollTo(0, 10000);
      }
    });
  }

  getUserAvatar = () => {
    seafileAPI.getAccountInfo().then((res) => {
      this.accountInfo = res.data;
      this.setState({
        userAvatar: res.data.avatar_url,
      });
    });
  }

  handleCommentChange = (event) => {
    this.setState({
      comment: event.target.value,
    });
  }

  submitComment = () => {
    let comment = this.state.comment.trim();
    if (comment.length > 0) {
      if (this.props.selectedText.length > 0) {
        let detail = {
          selectedText: this.props.selectedText.slice(0, 10),
          newIndex: this.props.newIndex,
          oldIndex: this.props.oldIndex
        };
        let detailJSON = JSON.stringify(detail);
        seafileAPI.addReviewComment(reviewID, comment, detailJSON).then((response) => {
          this.listComments(true);
          this.props.getCommentsNumber();
        });
      }
      else {
        seafileAPI.addReviewComment(reviewID, comment).then((response) => {
          this.listComments(true);
          this.props.getCommentsNumber();
        });
      }
      this.setState({
        comment: ''
      });
    }
  }

  resolveComment = (event) => {
    seafileAPI.updateReviewComment(reviewID, event.target.id, 'true').then((res) => {
      this.listComments();
    });
  }

  toggleResolvedComment = () => {
    this.setState({
      showResolvedComment: !this.state.showResolvedComment
    });
  }

  toggleResolvedTooltip = () => {
    this.setState({
      openResolvedTooltip: !this.state.openResolvedTooltip
    });
  }

  deleteComment = (event) => {
    seafileAPI.deleteReviewComment(reviewID, event.target.id).then((res) => {
      this.props.getCommentsNumber();
      this.listComments();
    });
  }

  onResizeMouseUp = () => {
    if (this.state.inResizing) {
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

  onResizeMouseMove = (event) => {
    let rate = 100 - (event.nativeEvent.clientY - 50 ) / this.refs.comment.clientHeight * 100;
    if (rate < 20 || rate > 70) {
      if (rate < 20) {
        this.setState({
          commentFooterHeight: 25
        });
      }
      if (rate > 70) {
        this.setState({
          commentFooterHeight: 65
        });
      }
      this.setState({
        inResizing: false
      });
      return null;
    }
    this.setState({
      commentFooterHeight: rate
    });
  };

  setQuoteText = (text) => {
    if (text.length > 0) {
      let comment = '> ' + text;
      this.setState({
        comment: comment
      })
    }
  }
  
  scrollToQuote = (newIndex, oldIndex, selectedText) => {
    this.props.scrollToQuote(newIndex, oldIndex, selectedText);
    this.setState({
      comment: ''
    });
  }

  componentWillMount() {
    this.getUserAvatar();
    this.listComments();
  }

  componentDidMount() {
    this.setQuoteText(this.props.selectedText);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.selectedText !== nextProps.selectedText) {
      this.setQuoteText(nextProps.selectedText);
    }
  }

  render() {
    const onResizeMove = this.state.inResizing ? this.onResizeMouseMove : null;
    return (
      <div className={(this.state.inResizing || this.props.inResizing)?
        'seafile-comment seafile-comment-resizing' : 'seafile-comment'}
      onMouseMove={onResizeMove} onMouseUp={this.onResizeMouseUp} ref="comment">
        <div className="seafile-comment-title">
          <div onClick={this.props.toggleCommentList} className={'seafile-comment-title-close'}>
            <i className={'fa fa-times-circle'}/>
          </div>
          <div className={'seafile-comment-title-text'}>{gettext('Comments')}</div>
          <div className={'seafile-comment-title-toggle'}>
            <label className="custom-switch" id="toggle-resolved-comments">
              <input type="checkbox" name="option" className="custom-switch-input" onClick={this.toggleResolvedComment}/>
              <span className="custom-switch-indicator"></span>
            </label>
            <Tooltip placement="bottom" isOpen={this.state.openResolvedTooltip}
              target="toggle-resolved-comments" toggle={this.toggleResolvedTooltip}>
              {gettext('Show/Hide resolved comments')}</Tooltip>
          </div>
        </div>
        <div style={{height:(100-this.state.commentFooterHeight)+'%'}}>
          { this.props.commentsNumber == 0 &&
            <div className={'seafile-comment-list'}>
              <div className="comment-vacant">{gettext('No comment yet.')}</div>
            </div>
          }
          { (this.state.commentsList.length === 0 && this.props.commentsNumber > 0) &&
            <div className={'seafile-comment-list'}><Loading/></div>
          }
          { this.state.commentsList.length > 0 &&
            <ul className={'seafile-comment-list'} ref='commentsList'>
              { (this.state.commentsList.length > 0 && this.props.commentsNumber > 0) &&
                this.state.commentsList.map((item, index) => {
                  return (
                    <CommentItem item={item} showResolvedComment={this.state.showResolvedComment}
                      resolveComment={this.resolveComment} accountInfo={this.accountInfo} key={index}
                      scrollToQuote={this.scrollToQuote} deleteComment={this.deleteComment}/>
                  );
                })
              }
            </ul>
          }
        </div>
        <div className="seafile-comment-footer" style={{height:this.state.commentFooterHeight+'%'}}>
          <div className="seafile-comment-row-resize" onMouseDown={this.onResizeMouseDown}></div>
          <div className="user-header">
            <img className="avatar" src={this.state.userAvatar} alt="avatar"/>
          </div>
          <div className="seafile-add-comment">
            <textarea className="add-comment-input" value={this.state.comment}
              placeholder={gettext('Add a comment.')} onChange={this.handleCommentChange}
              clos="100" rows="3" warp="virtual"></textarea>
            <Button className="submit-comment" color="success"
              size="sm" onClick={this.submitComment}>
              {gettext('Submit')}</Button>
          </div>
        </div>
      </div>
    );
  }
}

ReviewComments.propTypes = commentPropTypes;

const commentItemPropTypes = {
  item: PropTypes.object.isRequired,
  deleteComment: PropTypes.func.isRequired,
  resolveComment: PropTypes.func.isRequired,
  accountInfo: PropTypes.object.isRequired,
  showResolvedComment: PropTypes.bool.isRequired,
  scrollToQuote: PropTypes.func.isRequired
};

class CommentItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      dropdownOpen: false,
      html: '',
    };
  }

  toggleDropDownMenu = () => {
    this.setState({
      dropdownOpen: !this.state.dropdownOpen,
    });
  }

  convertComment = (mdFile) => {
    processor.process(mdFile).then(
      (result) => {
        let html = String(result);
        this.setState({
          html: html
        });
      }
    );
  }

  scrollToQuote = () => {
    this.props.scrollToQuote(this.props.item.newIndex, this.props.item.oldIndex,
      this.props.item.selectedText);
  }

  componentWillMount() {
    this.convertComment(this.props.item.comment);
  }

  componentWillReceiveProps(nextProps) {
    this.convertComment(nextProps.item.comment);
  }

  render() {
    if (this.props.item.resolved && !this.props.showResolvedComment) {
      return null;
    }
    return (
      <li className={this.props.item.resolved ? 'seafile-comment-item seafile-comment-item-resolved'
        : 'seafile-comment-item'} id={this.props.item.id}>
        <div className="seafile-comment-info">
          <img className="avatar" src={this.props.item.avatarUrl} alt=""/>
          <div className="reviewer-info">
            <div className="reviewer-name">{this.props.item.name}</div>
            <div className="review-time">{this.props.item.time}</div>
          </div>
          { !this.props.item.resolved &&
            <Dropdown isOpen={this.state.dropdownOpen} size="sm"
              className="seafile-comment-dropdown" toggle={this.toggleDropDownMenu}>
              <DropdownToggle className="seafile-comment-dropdown-btn">
                <i className="fas fa-ellipsis-v"></i>
              </DropdownToggle>
              <DropdownMenu>
                { (this.props.item.userEmail === this.props.accountInfo.email) &&
                  <DropdownItem onClick={this.props.deleteComment}
                    className="delete-comment" id={this.props.item.id}>{gettext('Delete')}</DropdownItem>}
                <DropdownItem onClick={this.props.resolveComment}
                  className="seafile-comment-resolved" id={this.props.item.id}>{gettext('Mark as resolved')}</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          }
        </div>
        { this.props.item.newIndex ? 
          <div className="seafile-comment-content" onClick={this.scrollToQuote}
            dangerouslySetInnerHTML={{ __html: this.state.html }}></div>
          :
          <div className="seafile-comment-content"
            dangerouslySetInnerHTML={{ __html: this.state.html }}></div>
        }
      </li>
    );
  }
}

CommentItem.propTypes = commentItemPropTypes;

export default ReviewComments;
