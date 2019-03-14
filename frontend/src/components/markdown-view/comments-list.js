import React from 'react';
import PropTypes from 'prop-types';
import { processor } from '@seafile/seafile-editor/dist/utils/seafile-markdown2html';
import { Button, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import Loading from '../loading';
import { gettext } from '../../utils/constants';
import moment from 'moment';
import '../../css/markdown-viewer/comments-list.css';

const propTypes = {
  editorUtilities: PropTypes.object.isRequired,
  scrollToQuote: PropTypes.func.isRequired,
  getCommentsNumber: PropTypes.func.isRequired,
  commentsNumber: PropTypes.number.isRequired,
};

class CommentsList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      commentsList: [],
      showResolvedComment: true,
    };
  }

  listComments = () => {
    this.props.editorUtilities.listComments().then((response) => {
      this.setState({
        commentsList: response.data.comments
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
      this.props.editorUtilities.postComment(comment.trim()).then((response) => {
        this.listComments();
        this.props.getCommentsNumber();
      });
    }
    this.refs.commentTextarea.value = '';
  }

  resolveComment = (event) => {
    this.props.editorUtilities.updateComment(event.target.id, 'true').then((response) => {
      this.listComments();
    });
  }

  deleteComment = (event) => {
    this.props.editorUtilities.deleteComment(event.target.id).then((response) => {
      this.props.getCommentsNumber();
      this.listComments();
    });
  }

  editComment = (commentID, newComment) => {
    this.props.editorUtilities.updateComment(commentID, null, null, newComment).then((res) => {
      this.props.getCommentsNumber();
      this.listComments();
    });
  }

  setQuoteText = (text) => {
    if (text.length > 0) {
      this.refs.commentTextarea.value = '> ' + text;
    }
  }

  scrollToQuote = (detail) => {
    this.props.scrollToQuote(detail);
    this.refs.commentTextarea.value = '';
  }

  toggleResolvedComment = () => {
    this.setState({
      showResolvedComment: !this.state.showResolvedComment
    });
  }

  componentWillMount() {
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
          <div className="seafile-comment-text">{gettext('Show resolved comments')}</div>
          <div className="d-flex">
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
          { (this.state.commentsList.length > 0 && this.props.commentsNumber > 0) &&
            this.state.commentsList.map((item, index = 0, arr) => {
              let oldTime = (new Date(item.created_at)).getTime();
              let time = moment(oldTime).format('YYYY-MM-DD HH:mm');
              return (
                <CommentItem
                  item={item} time={time} key={index}
                  editorUtilities={this.props.editorUtilities}
                  editComment={this.editComment}
                  showResolvedComment={this.state.showResolvedComment}
                  deleteComment={this.deleteComment} resolveComment={this.resolveComment}
                  commentsList={this.state.commentsList} scrollToQuote={this.scrollToQuote}
                />
              );
            })
          }
          {(this.state.commentsList.length == 0 && this.props.commentsNumber > 0) && <Loading/>}
          { this.props.commentsNumber == 0 &&
            <li className="comment-vacant">{gettext('No comment yet.')}</li>
          }
        </ul>
        <div className="seafile-comment-footer">
          <div className="seafile-add-comment">
            <textarea className="add-comment-input" ref="commentTextarea"
              placeholder={gettext('Add a comment')}
              clos="100" rows="3" warp="virtual"></textarea>
            <Button className="submit-comment" color="success"
              size="sm" onClick={this.submitComment} >
              {gettext('Submit')}</Button>
          </div>
        </div>
      </div>
    );
  }
}

CommentsList.propTypes = propTypes;

const CommentItempropTypes = {
  editorUtilities: PropTypes.object.isRequired,
  item: PropTypes.object,
  time: PropTypes.string,
  editComment: PropTypes.func,
  showResolvedComment: PropTypes.bool,
  deleteComment: PropTypes.func,
  resolveComment: PropTypes.func,
  commentsList: PropTypes.array,
  scrollToQuote: PropTypes.func.isRequired,
};

class CommentItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      dropdownOpen: false,
      html: '',
      quote: '',
      newComment: this.props.item.comment,
      editable: false,
    };
  }

  toggleDropDownMenu = () => {
    this.setState({
      dropdownOpen: !this.state.dropdownOpen,
    });
  }

  convertComment = (item) => {
    processor.process(item.comment).then(
      (result) => {
        let comment = String(result);
        this.setState({
          comment: comment
        });
      }
    );
    if (item.detail) {
      const quote = JSON.parse(item.detail).quote;
      processor.process(quote).then(
        (result) => {
          let quote = String(result);
          this.setState({
            quote: quote
          });
        }
      );
    }
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

  scrollToQuote = () => {
    const position = JSON.parse(this.props.item.detail).position;
    this.props.scrollToQuote(position);
  }

  componentWillMount() {
    this.convertComment(this.props.item);
  }

  componentWillReceiveProps(nextProps) {
    this.convertComment(nextProps.item);
  }

  render() {
    const item = this.props.item;
    const { id, user_email, avatar_url, user_name, resolved } = item;
    if (item.resolved && !this.props.showResolvedComment) {
      return null;
    }
    if (this.state.editable) {
      return(
        <li className="seafile-comment-item" id={item.id}>
          <div className="seafile-comment-info">
            <img className="avatar" src={avatar_url} alt=""/>
            <div className="reviewer-info">
              <div className="reviewer-name">{user_name}</div>
              <div className="review-time">{this.props.time}</div>
            </div>
          </div>
          <div className="seafile-edit-comment">
            <textarea className="edit-comment-input" value={this.state.newComment} onChange={this.handleCommentChange} clos="100" rows="3" warp="virtual"></textarea>
            <Button className="comment-btn" color="success" size="sm" onClick={this.updateComment} id={item.id}>{gettext('Update')}</Button>{' '}
            <Button className="comment-btn" color="secondary" size="sm" onClick={this.toggleEditComment}>{gettext('Cancle')}</Button>
          </div>
        </li>
      );
    }
    return (
      <li className={resolved ? 'seafile-comment-item seafile-comment-item-resolved' : 'seafile-comment-item'} id={id}>
        <div className="seafile-comment-info">
          <img className="avatar" src={avatar_url} alt=""/>
          <div className="reviewer-info">
            <div className="reviewer-name">{user_name}</div>
            <div className="review-time">{this.props.time}</div>
          </div>          
          <Dropdown isOpen={this.state.dropdownOpen} size="sm"
            className="seafile-comment-dropdown" toggle={this.toggleDropDownMenu}>
            <DropdownToggle className="seafile-comment-dropdown-btn">
              <i className="fas fa-ellipsis-v"></i>
            </DropdownToggle>
            <DropdownMenu>
              {(user_email === this.props.editorUtilities.userName) &&
                <DropdownItem onClick={this.props.deleteComment}
                  className="delete-comment" id={item.id}>{gettext('Delete')}</DropdownItem>
                }
              {(user_email === this.props.editorUtilities.userName) &&
                <DropdownItem onClick={this.toggleEditComment}
                  className="edit-comment" id={item.id}>{gettext('Edit')}</DropdownItem>
              }
              {!resolved &&
                <DropdownItem onClick={this.props.resolveComment} className="seafile-comment-resolved"
                  id={item.id}>{gettext('Mark as resolved')}</DropdownItem>
              }
            </DropdownMenu>
          </Dropdown>
        </div>       
        {item.detail &&
          <blockquote className="seafile-comment-content">
            <div onClick={this.scrollToQuote} dangerouslySetInnerHTML={{ __html: this.state.quote }}></div>
          </blockquote>
        }
        <div className="seafile-comment-content" dangerouslySetInnerHTML={{ __html: this.state.comment }}></div>
      </li>
    );
  }
}

CommentItem.propTypes = CommentItempropTypes;

export default CommentsList;
