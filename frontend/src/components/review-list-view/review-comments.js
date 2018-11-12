import React from 'react';
import PropTypes from 'prop-types';
import { processor } from '../../utils/seafile-markdown2html';
import { Button, Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Tooltip } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { reviewID, gettext } from '../../utils/constants';
import moment from 'moment';
import Loading from '../../components/loading.js';

import '../../css/review-comments.css';

const commentPropTypes = {
  getCommentsNumber: PropTypes.func.isRequired,
  inResizing: PropTypes.bool.isRequired,
  toggleCommentList: PropTypes.func.isRequired,
  commentsNumber: PropTypes.number.isRequired
};

class ReviewComments extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      commentsList: [],
      userAvatar: `${window.location.host}media/avatars/default.png`,
      inResizing: false,
      commentFooterHeight: 30,
      showResolvedComment: false,
      openResolvedTooltip: false,
    };
    this.accountInfo = {};
  }

  listComments = (scroll) => {
    seafileAPI.listReviewComments(reviewID).then((response) => {
      response.data.comments.reverse();
      this.setState({
        commentsList: response.data.comments
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
    let comment = this.refs.commentTextarea.value;
    if (comment.trim().length > 0) {
      seafileAPI.addReviewComment(reviewID, comment.trim()).then((res) => {
        this.listComments(true);
        this.props.getCommentsNumber();
      });
      this.refs.commentTextarea.value = '';
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

  componentWillMount() {
    this.getUserAvatar();
    this.listComments();
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
                this.state.commentsList.map((item, index = 0, arr) => {
                  let oldTime = (new Date(item.created_at)).getTime();
                  let time = moment(oldTime).format('YYYY-MM-DD HH:mm');
                  return (
                    <CommentItem id={item.id} time={time} headUrl={item.avatar_url}
                      comment={item.comment} name={item.user_name}
                      user_email={item.user_email} key={index} resolved={item.resolved}
                      deleteComment={this.deleteComment}
                      resolveComment={this.resolveComment}
                      commentsList={this.state.commentsList}
                      accountInfo={this.accountInfo}
                      showResolvedComment={this.state.showResolvedComment}
                    />
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
            <textarea className="add-comment-input" ref="commentTextarea"
              placeholder={gettext('Add a comment.')}
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
  comment: PropTypes.string.isRequired,
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  time: PropTypes.string.isRequired,
  user_email: PropTypes.string.isRequired,
  deleteComment: PropTypes.func.isRequired,
  resolveComment: PropTypes.func.isRequired,
  accountInfo: PropTypes.object.isRequired,
  headUrl: PropTypes.string.isRequired,
  resolved: PropTypes.bool.isRequired,
  showResolvedComment: PropTypes.bool.isRequired
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

  componentWillMount() {
    this.convertComment(this.props.comment);
  }

  componentWillReceiveProps(nextProps) {
    this.convertComment(nextProps.comment);
  }

  render() {
    if (this.props.resolved && !this.props.showResolvedComment) {
      return null;
    }
    return (
      <li className={this.props.resolved ? 'seafile-comment-item seafile-comment-item-resolved'
        : 'seafile-comment-item'} id={this.props.id}>
        <div className="seafile-comment-info">
          <img className="avatar" src={this.props.headUrl} alt="avatar"/>
          <div className="reviewer-info">
            <div className="reviewer-name">{this.props.name}</div>
            <div className="review-time">{this.props.time}</div>
          </div>
          { !this.props.resolved &&
            <Dropdown isOpen={this.state.dropdownOpen} size="sm"
              className="seafile-comment-dropdown" toggle={this.toggleDropDownMenu}>
              <DropdownToggle className="seafile-comment-dropdown-btn">
                <i className="fas fa-ellipsis-v"></i>
              </DropdownToggle>
              <DropdownMenu>
                { (this.props.user_email === this.props.accountInfo.email) &&
                  <DropdownItem onClick={this.props.deleteComment}
                    className="delete-comment" id={this.props.id}>{gettext('Delete')}</DropdownItem>}
                <DropdownItem onClick={this.props.resolveComment}
                  className="seafile-comment-resolved" id={this.props.id}>{gettext('Mark as resolved')}</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          }
        </div>
        <div className="seafile-comment-content" dangerouslySetInnerHTML={{ __html: this.state.html }}></div>
      </li>
    );
  }
}

CommentItem.propTypes = commentItemPropTypes;

export default ReviewComments;
