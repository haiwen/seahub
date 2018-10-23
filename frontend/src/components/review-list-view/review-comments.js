import React from 'react';
import { processor } from "../../utils/seafile-markdown2html";
import { Button, Input, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { draftID, reviewID, gettext } from '../../utils/constants';
import moment from 'moment';
import Loading from '../../components/loading.js';

import '../../css/review-comments.css';

class ReviewComments extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      commentsList: [],
      userAvatar: `${window.location.host}media/avatars/default.png`,
      inResizing: false,
      commentFooterHeight: 30,
    }
    this.accountInfo = {};
  }

  listComments = () => {
    seafileAPI.listReviewComments(reviewID).then((response) => {
      this.setState({
        commentsList: response.data.comments
      });
    });
  }

  getUserAvatar = () => {
    seafileAPI.getAccountInfo().then((res) => {
      this.accountInfo = res.data;
      this.setState({
        userAvatar: res.data.avatar_url,
      })
    })
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
        this.listComments();
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
    })
  };

  onResizeMouseMove = (event) => {
    let rate = (event.nativeEvent.clientY - 50 ) / this.refs.comment.clientHeight * 100;
    if (rate > 80 || rate < 40 ) {
      if (rate > 75) {
        this.setState({
          commentFooterHeight: 25
        })
      }
      if (rate < 40) {
        this.setState({
          commentFooterHeight: 60
        })
      }
      this.setState({
        inResizing: false
      })
      return
    }
    this.setState({
      commentFooterHeight: 100 - rate
    })
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
        </div>
        <div style={{height:(100-this.state.commentFooterHeight)+'%'}}>
        { this.props.commentsNumber == 0 &&
          <div className={"seafile-comment-list"}>
            <div className="comment-vacant">{gettext('No comment yet.')}</div>
          </div>
        }
        { (this.state.commentsList.length == 0 && this.props.commentsNumber > 0) &&
          <div><Loading/></div>
        }
        <ul className={"seafile-comment-list"}>
          { (this.state.commentsList.length > 0 && this.props.commentsNumber > 0) &&
            this.state.commentsList.map((item, index = 0, arr) => {
              if (item.resolved) {
                return
              } else {
                let oldTime = (new Date(item.created_at)).getTime();
                let time = moment(oldTime).format("YYYY-MM-DD HH:mm");
                return (
                  <CommentItem id={item.id} time={time} headUrl={item.avatar_url}
                    editorUtilities={this.props.editorUtilities}
                    comment={item.comment} name={item.user_name}
                    user_email={item.user_email} key={index}
                    deleteComment={this.deleteComment}
                    resolveComment={this.resolveComment}
                    commentsList={this.state.commentsList}
                    accountInfo={this.accountInfo}
                  />
                )
              }
            })
          }
        </ul>
        </div>
        <div className="seafile-comment-footer" style={{height:this.state.commentFooterHeight+'%'}}>
          <div className="seafile-comment-row-resize" onMouseDown={this.onResizeMouseDown}></div>
          <div className="user-header">
            <img className="avatar" src={this.state.userAvatar}/>
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
    )
  }
}

class CommentItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      dropdownOpen: false,
      html: '',
    }
  }

  toggleDropDownMenu = () => {
    this.setState({
      dropdownOpen: !this.state.dropdownOpen,
    })
  }

  convertComment = (mdFile) => {
    processor.process(mdFile).then(
      (result) => {
        let html = String(result);
        this.setState({
          html: html
        })
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
    return (
      <li className="seafile-comment-item" id={this.props.id}>
        <div className="seafile-comment-info">
          <img className="avatar" src={this.props.headUrl} />
          <div className="reviewer-info">
            <div className="reviewer-name">{this.props.name}</div>
            <div className="review-time">{this.props.time}</div>
          </div>
          <Dropdown isOpen={this.state.dropdownOpen} size="sm"
            className="seafile-comment-dropdown" toggle={this.toggleDropDownMenu}>
            <DropdownToggle className="seafile-comment-dropdown-btn">
              <i className="fas fa-ellipsis-v"></i>
            </DropdownToggle>
            <DropdownMenu>
              {
                (this.props.user_email === this.props.accountInfo.email) &&
              <DropdownItem onClick={this.props.deleteComment}
                className="delete-comment" id={this.props.id}>{gettext('Delete')}</DropdownItem>
              }
              <DropdownItem onClick={this.props.resolveComment}
                className="seafile-comment-resolved" id={this.props.id}>{gettext('Mark as resolved')}</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
        <div className="seafile-comment-content" dangerouslySetInnerHTML={{ __html: this.state.html }}></div>
      </li>
    )
  }
}

export default ReviewComments;
