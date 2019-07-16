import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { processor } from '@seafile/seafile-editor/dist/utils/seafile-markdown2html';
import { Button, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import '../../css/comments-list.css';

const { username, repoID, filePath } = window.app.pageOptions;

const CommentPanelPropTypes = {
  toggleCommentPanel: PropTypes.func.isRequired,
  commentsNumber: PropTypes.number,
};

class CommentPanel extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      commentsList: [],
      showResolvedComment: true,
    };
  }

  toggleResolvedComment = () => {
    this.setState({
      showResolvedComment: !this.state.showResolvedComment
    });
  }

  listComments = () => {
    seafileAPI.listComments(repoID, filePath).then((res) => {
      this.setState({
        commentsList: res.data.comments
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  handleCommentChange = (event) => {
    this.setState({
      comment: event.target.value,
    });
  }

  submitComment = () => {
    let comment = this.refs.commentTextarea.value;
    if (comment.trim()) {
      seafileAPI.postComment(repoID, filePath, comment).then(() => {
        this.listComments();
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
    this.refs.commentTextarea.value = '';
  }

  resolveComment = (event) => {
    seafileAPI.updateComment(repoID, event.target.id, 'true').then(() => {
      this.listComments();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  deleteComment = (event) => {
    seafileAPI.deleteComment(repoID, event.target.id).then(() => {
      this.listComments();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  editComment = (commentID, newComment) => {
    seafileAPI.updateComment(repoID, commentID, null, null, newComment).then((res) => {
      this.listComments();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  componentDidMount() {
    this.listComments();
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.commentsNumber !== nextProps.commentsNumber) {
      this.listComments();
    }
  }

  render() {
    return (
      <div className="seafile-comment">
        <div className="seafile-comment-title">
          <div onClick={this.props.toggleCommentPanel} className={'seafile-comment-title-close'}>
            <i className={'fa fa-times-circle'}/>
          </div>
          <div className={'seafile-comment-title-text'}>{gettext('Comments')}</div>
        </div>
        <div className="seafile-comment-toggle-resolved">
          <div className={'seafile-comment-title-text'}>{gettext('Show resolved comments')}</div>
          <div className={'seafile-comment-title-toggle d-flex'}>
            <label className="custom-switch" id="toggle-resolved-comments">
              <input type="checkbox" name="option" className="custom-switch-input"
                onChange={this.toggleResolvedComment}
                checked={this.state.showResolvedComment && 'checked'}
              />
              <span className="custom-switch-indicator"></span>
            </label>
          </div>
        </div>
        <ul className={'seafile-comment-list'}>
          {this.state.commentsList.length > 0 &&
            this.state.commentsList.map((item, index = 0, arr) => {
              let oldTime = (new Date(item.created_at)).getTime();
              let time = moment(oldTime).format('YYYY-MM-DD HH:mm');
              return (
                <React.Fragment key={item.id}>
                  <CommentItem
                    item={item} time={time}
                    deleteComment={this.deleteComment}
                    resolveComment={this.resolveComment}
                    editComment={this.editComment}
                    showResolvedComment={this.state.showResolvedComment}
                  />
                </React.Fragment>
              );
            })
          }
          {(this.state.commentsList.length == 0 ) &&
            <li className="comment-vacant">{gettext('No comment yet.')}</li>}
        </ul>
        <div className="seafile-comment-footer">
          <textarea
            className="add-comment-input" ref="commentTextarea"
            placeholder={gettext('Add a comment.')}
            clos="100" rows="3" warp="virtual"></textarea>
          <Button
            className="submit-comment" color="primary"
            size="sm" onClick={this.submitComment} >
            {gettext('Submit')}</Button>
        </div>
      </div>
    );
  }
}

CommentPanel.propTypes = CommentPanelPropTypes;


const commentItemPropTypes = {
  time: PropTypes.string.isRequired,
  item: PropTypes.object.isRequired,
  deleteComment: PropTypes.func.isRequired,
  resolveComment: PropTypes.func.isRequired,
  showResolvedComment: PropTypes.bool.isRequired,
  editComment: PropTypes.func.isRequired,
};

class CommentItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      dropdownOpen: false,
      html: '',
      newComment: this.props.item.comment,
      editable: false,
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

  toggleEditComment = () => {
    this.setState({
      editable: !this.state.editable
    });
  }

  updateComment = (event) => {
    const newComment = this.state.newComment;
    if (this.props.item.comment !== newComment) {
      this.props.editComment(event.target.id, newComment);
    }
    this.toggleEditComment();
  }

  handleCommentChange = (event) => {
    this.setState({
      newComment: event.target.value,
    });
  }

  componentWillMount() {
    this.convertComment(this.props.item.comment);
  }

  componentWillReceiveProps(nextProps) {
    this.convertComment(nextProps.item.comment);
  }

  render() {
    const item = this.props.item;
    if (item.resolved && !this.props.showResolvedComment) {
      return null;
    }
    if (this.state.editable) {
      return(
        <li className="seafile-comment-item" id={item.id}>
          <div className="seafile-comment-info">
            <img className="avatar" src={item.avatar_url} alt=""/>
            <div className="reviewer-info">
              <div className="reviewer-name ellipsis">{item.user_name}</div>
              <div className="review-time">{this.props.time}</div>
            </div>
          </div>
          <div className="seafile-edit-comment">
            <textarea className="edit-comment-input" value={this.state.newComment} onChange={this.handleCommentChange} clos="100" rows="3" warp="virtual"></textarea>
            <Button className="comment-btn" color="success" size="sm" onClick={this.updateComment} id={item.id}>{gettext('Update')}</Button>{' '}
            <Button className="comment-btn" color="secondary" size="sm" onClick={this.toggleEditComment}> {gettext('Cancel')}</Button>
          </div>
        </li>
      );
    }
    return (
      <li className={item.resolved ? 'seafile-comment-item seafile-comment-item-resolved'
        : 'seafile-comment-item'} id={item.id}>
        <div className="seafile-comment-info">
          <img className="avatar" src={item.avatar_url} alt=""/>
          <div className="reviewer-info">
            <div className="reviewer-name ellipsis">{item.user_name}</div>
            <div className="review-time">{this.props.time}</div>
          </div>
          <Dropdown isOpen={this.state.dropdownOpen} size="sm"
            className="seafile-comment-dropdown" toggle={this.toggleDropDownMenu}>
            <DropdownToggle className="seafile-comment-dropdown-btn">
              <i className="fas fa-ellipsis-v"></i>
            </DropdownToggle>
            <DropdownMenu>
              {
                (item.user_email === username) &&
                <DropdownItem onClick={this.props.deleteComment} className="delete-comment"
                  id={item.id}>{gettext('Delete')}</DropdownItem>}
              {
                (item.user_email === username) &&
                  <DropdownItem onClick={this.toggleEditComment}
                    className="edit-comment" id={item.id}>{gettext('Edit')}</DropdownItem>
              }
              {
                !item.resolved &&
                <DropdownItem onClick={this.props.resolveComment} className="seafile-comment-resolved"
                  id={item.id}>{gettext('Mark as resolved')}</DropdownItem>
              }
            </DropdownMenu>
          </Dropdown>
        </div>
        <div className="seafile-comment-content" dangerouslySetInnerHTML={{ __html: this.state.html }}></div>
      </li>
    );
  }
}

CommentItem.propTypes = commentItemPropTypes;

export default CommentPanel;
