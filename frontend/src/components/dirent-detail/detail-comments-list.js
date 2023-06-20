import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { processor } from '@seafile/seafile-editor';
import { Button, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { gettext, username, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import { MentionsInput, Mention } from 'react-mentions';
import { defaultStyle, defaultMentionStyle } from '../../css/react-mentions-default-style';
import '../../css/comments-list.css';

const DetailCommentListPropTypes = {
  repoID: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  onParticipantsChange: PropTypes.func.isRequired,
  fileParticipantList: PropTypes.array.isRequired,
};

class DetailCommentList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      commentsList: [],
      relatedUsers: null,
      comment: '',
    };
    this.toBeAddedParticipant = [];
  }

  componentDidMount() {
    this.listComments();
    this.checkParticipant();
    this.listRepoRelatedUsers();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.filePath !== this.props.filePath) {
      this.listComments(nextProps.filePath);
    }
  }

  handleCommentChange = (event) => {
    this.setState({ comment: event.target.value });
  }

  listComments = (filePath) => {
    seafileAPI.listComments(this.props.repoID, (filePath || this.props.filePath)).then((res) => {
      this.setState({ commentsList: res.data.comments });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  addComment = () => {
    const { repoID, filePath } = this.props;
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
      const { repoID, filePath } = this.props;
      seafileAPI.addFileParticipants(repoID, filePath, this.toBeAddedParticipant).then((res) => {
        this.props.onParticipantsChange(repoID, filePath);
        this.toBeAddedParticipant = [];
        this.addComment();
      }).catch((err) => {
        toaster.danger(Utils.getErrorMsg(err));
      });
    }
  }

  resolveComment = (event) => {
    const { repoID } = this.props;
    seafileAPI.updateComment(repoID, event.target.id, 'true').then(() => {
      this.listComments();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  deleteComment = (event) => {
    const { repoID } = this.props;
    seafileAPI.deleteComment(repoID, event.target.id).then(() => {
      this.listComments();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  editComment = (commentID, newComment) => {
    const { repoID } = this.props;
    seafileAPI.updateComment(repoID, commentID, null, null, newComment).then(() => {
      this.listComments();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  listRepoRelatedUsers = () => {
    const { repoID } = this.props;
    seafileAPI.listRepoRelatedUsers(repoID).then((res) => {
      let users = res.data.user_list.map((item) => {
        return { id: item.email, display: item.name};
      });
      this.setState({ relatedUsers: users });
    });
  }

  checkParticipant = (email) => {
    return this.props.fileParticipantList.map((participant) => {return participant.email;}).includes(email);
  }

  addParticipant = (email) => {
    if (this.checkParticipant(email)) return;
    this.toBeAddedParticipant.push(email);
  }

  renderUserSuggestion = (entry, search, highlightedDisplay, index, focused) => {
    return <div className={`user ${focused ? 'focused' : ''}`}>{highlightedDisplay}</div>;
  }

  render() {
    const { repoID, filePath } = this.props;
    const { commentsList } = this.state;
    return (
      <div className="seafile-comment detail-comments h-100">
        <div className="flex-fill o-auto">
          {commentsList.length > 0 ? (
            <ul className="seafile-comment-list">
              {commentsList.map((item, index = 0, arr) => {
                let oldTime = (new Date(item.created_at)).getTime();
                let time = moment(oldTime).format('YYYY-MM-DD HH:mm');
                return (
                  <CommentItem
                    key={item.id}
                    item={item}
                    time={time}
                    deleteComment={this.deleteComment}
                    resolveComment={this.resolveComment}
                    editComment={this.editComment}
                  />
                );
              })
              }
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

DetailCommentList.propTypes = DetailCommentListPropTypes;

const commentItemPropTypes = {
  time: PropTypes.string.isRequired,
  item: PropTypes.object.isRequired,
  deleteComment: PropTypes.func.isRequired,
  resolveComment: PropTypes.func.isRequired,
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

  componentWillMount() {
    this.convertComment(this.props.item.comment);
  }

  componentWillReceiveProps(nextProps) {
    this.convertComment(nextProps.item.comment);
  }

  convertComment = (mdFile) => {
    processor.process(mdFile).then((result) => {
      let html = String(result);
      this.setState({ html: html });
    });
  }

  toggleDropDownMenu = () => {
    this.setState({ dropdownOpen: !this.state.dropdownOpen });
  }

  toggleEditComment = () => {
    this.setState({ editable: !this.state.editable });
  }

  updateComment = (event) => {
    const newComment = this.state.newComment;
    if (this.props.item.comment !== newComment) {
      this.props.editComment(event.target.id, newComment);
    }
    this.toggleEditComment();
  }

  handleCommentChange = (event) => {
    this.setState({ newComment: event.target.value });
  }

  onCommentClick = (e) => {
    // click participant link, page shouldn't jump
    if (e.target.nodeName !== 'A') return;
    const preNode = e.target.previousSibling;
    if (preNode && preNode.nodeType === 3 && preNode.nodeValue.slice(-1) === '@') {
      e.preventDefault();
    }
  }

  renderInfo = (item) => {
    return (
      <Fragment>
        <img className="avatar" src={item.avatar_url} alt=""/>
        <div className="reviewer-info">
          <div className="reviewer-name ellipsis">{item.user_name}</div>
          <div className="review-time">{this.props.time}</div>
        </div>
      </Fragment>
    );
  }

  render() {
    const item = this.props.item;
    if (this.state.editable) {
      return(
        <li className="seafile-comment-item" id={item.id}>
          <div className="seafile-comment-info">
            {this.renderInfo(item)}
          </div>
          <div className="seafile-edit-comment">
            <textarea className="edit-comment-input" value={this.state.newComment}
              onChange={this.handleCommentChange} clos="100" rows="3" warp="virtual"
            ></textarea>
            <Button className="comment-btn" color="primary" size="sm" onClick={this.updateComment} id={item.id}>{gettext('Update')}</Button>{' '}
            <Button className="comment-btn" color="secondary" size="sm" onClick={this.toggleEditComment}> {gettext('Cancel')}</Button>
          </div>
        </li>
      );
    }
    return (
      <li className={item.resolved ? 'seafile-comment-item seafile-comment-item-resolved' : 'seafile-comment-item'} id={item.id}>
        <div className="seafile-comment-info">
          {this.renderInfo(item)}
          <Dropdown isOpen={this.state.dropdownOpen} size="sm" className="seafile-comment-dropdown" toggle={this.toggleDropDownMenu}>
            <DropdownToggle className="seafile-comment-dropdown-btn"><i className="fas fa-ellipsis-v"></i></DropdownToggle>
            <DropdownMenu>
              {item.user_email === username &&
                <DropdownItem onClick={this.props.deleteComment} className="delete-comment" id={item.id}>{gettext('Delete')}</DropdownItem>
              }
              {item.user_email === username &&
                <DropdownItem onClick={this.toggleEditComment} className="edit-comment" id={item.id}>{gettext('Edit')}</DropdownItem>
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

export default DetailCommentList;
