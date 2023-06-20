import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { processor } from '@seafile/seafile-editor';
import { Button, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import { MentionsInput, Mention } from 'react-mentions';
import { defaultStyle, defaultMentionStyle } from '../../css/react-mentions-default-style';

import '../../css/comments-list.css';

const { username, repoID, filePath } = window.app.pageOptions;

const CommentPanelPropTypes = {
  toggleCommentPanel: PropTypes.func.isRequired,
  commentsNumber: PropTypes.number,
  participants: PropTypes.array,
  onParticipantsChange: PropTypes.func,
};

class CommentPanel extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      commentsList: [],
      showResolvedComment: true,
      participants: null,
      relatedUsers: null,
      comment: '',
    };
    this.toBeAddedParticipant = [];
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

  listRepoRelatedUsers = () => {
    seafileAPI.listRepoRelatedUsers(repoID).then((res) => {
      let users = res.data.user_list.map((item) => {
        return { id: item.email, display: item.name};
      });
      this.setState({ relatedUsers: users });
    });
  }

  handleCommentChange = (event) => {
    this.setState({ comment: event.target.value });
  }

  addComment = () => {
    if (!this.state.comment.trim()) return;
    seafileAPI.postComment(repoID, filePath, this.state.comment.trim()).then(() => {
      this.listComments();
    }).catch(err => {
      toaster.danger(Utils.getErrorMsg(err));
    });
    this.setState({ comment: '' });
  }

  onSubmit = () => {
    this.addParticipant(username);
    if (this.toBeAddedParticipant.length === 0) {
      this.addComment();
    } else {
      seafileAPI.addFileParticipants(repoID, filePath, this.toBeAddedParticipant).then((res) => {
        this.onParticipantsChange(repoID, filePath);
        this.toBeAddedParticipant = [];
        this.addComment();
      }).catch((err) => {
        toaster.danger(Utils.getErrorMsg(err));
      });
    }
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

  onParticipantsChange = () => {
    if (this.props.onParticipantsChange) {
      this.props.onParticipantsChange();
    } else {
      this.getParticipants();
    }
  }

  getParticipants = () => {
    if (this.props.participants) {
      this.setState({ participants: this.props.participants });
    } else {
      seafileAPI.listFileParticipants(repoID, filePath).then((res) => {
        this.setState({ participants: res.data.participant_list });
      });
    }
  }

  checkParticipant = (email) => {
    return this.state.participants.map((participant) => {return participant.email;}).includes(email);
  }

  addParticipant = (email) => {
    if (this.checkParticipant(email)) return;
    this.toBeAddedParticipant.push(email);
  }

  renderUserSuggestion = (entry, search, highlightedDisplay, index, focused) => {
    return <div className={`user ${focused ? 'focused' : ''}`}>{highlightedDisplay}</div>;
  }

  componentDidMount() {
    this.listComments();
    this.getParticipants();
    this.listRepoRelatedUsers();
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.commentsNumber !== nextProps.commentsNumber) {
      this.listComments();
    }
    if (this.props.participants !== nextProps.participants) {
      this.setState({ participants: nextProps.participants });
    }
  }

  render() {
    const { commentsList } = this.state;
    return (
      <div className="seafile-comment">
        <div className="seafile-comment-title flex-shrink-0">
          <div onClick={this.props.toggleCommentPanel} className="seafile-comment-title-close">
            <i className="fa fa-times-circle"></i>
          </div>
          <div className="seafile-comment-title-text">{gettext('Comments')}</div>
        </div>
        <div className="flex-fill o-auto">
          {commentsList.length > 0 ? (
            <ul className="seafile-comment-list">
              {commentsList.map((item, index = 0, arr) => {
                let oldTime = (new Date(item.created_at)).getTime();
                let time = moment(oldTime).format('YYYY-MM-DD HH:mm');
                return (
                  <CommentItem
                    key={item.id}
                    item={item} time={time}
                    deleteComment={this.deleteComment}
                    resolveComment={this.resolveComment}
                    editComment={this.editComment}
                    showResolvedComment={this.state.showResolvedComment}
                  />
                );
              })}
            </ul>) :
            <p className="text-center my-4">{gettext('No comment yet.')}</p>
          }
        </div>
        <div className="seafile-comment-footer flex-shrink-0">
          <MentionsInput
            value={this.state.comment}
            onChange={this.handleCommentChange}
            placeholder={gettext('Add a comment...')}
            style={defaultStyle}
          >
            <Mention
              trigger="@"
              displayTransform={(username, display) => `@${display}`}
              data={this.state.relatedUsers}
              renderSuggestion={this.renderUserSuggestion}
              style={defaultMentionStyle}
              onAdd={(id, display) => {this.addParticipant(id);}}
              appendSpaceOnAdd={true}
            />
          </MentionsInput>
          <div className="comment-submit-container">
            <Button className="submit-comment" color="primary" size="sm" onClick={this.onSubmit}>{gettext('Submit')}</Button>
          </div>
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
    processor.process(mdFile).then((result) => {
      let html = String(result);
      this.setState({ html: html });
    });
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

  onCommentClick = (e) => {
    // click participant link, page shouldn't jump
    if (e.target.nodeName !== 'A') return;
    const preNode = e.target.previousSibling;
    if (preNode && preNode.nodeType === 3 && preNode.nodeValue.slice(-1) === '@') {
      e.preventDefault();
    }
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
            <Button className="comment-btn" color="primary" size="sm" onClick={this.updateComment} id={item.id}>{gettext('Update')}</Button>{' '}
            <Button className="comment-btn" color="secondary" size="sm" onClick={this.toggleEditComment}>{gettext('Cancel')}</Button>
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
              {(item.user_email === username) &&
                <DropdownItem onClick={this.props.deleteComment} className="delete-comment"
                  id={item.id}>{gettext('Delete')}</DropdownItem>}
              {(item.user_email === username) &&
                <DropdownItem onClick={this.toggleEditComment}
                  className="edit-comment" id={item.id}>{gettext('Edit')}</DropdownItem>
              }
              {!item.resolved &&
                <DropdownItem onClick={this.props.resolveComment} className="seafile-comment-resolved"
                  id={item.id}>{gettext('Mark as resolved')}</DropdownItem>
              }
            </DropdownMenu>
          </Dropdown>
        </div>
        <div
          className="seafile-comment-content"
          dangerouslySetInnerHTML={{ __html: this.state.html }}
          onClick={e => this.onCommentClick(e)}
        ></div>
      </li>
    );
  }
}

CommentItem.propTypes = commentItemPropTypes;

export default CommentPanel;
