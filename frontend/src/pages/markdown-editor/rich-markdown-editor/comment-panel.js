import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Button } from 'reactstrap';
import { MentionsInput, Mention } from 'react-mentions';
import { EditorContext } from '@seafile/seafile-editor';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import toaster from '../../../components/toast';
import CommentItem from './comment-item';

import { defaultStyle, defaultMentionStyle } from '../../../css/react-mentions-default-style';

import '../css/comments-list.css';

const { repoID, filePath } = window.app.pageOptions;
const userInfo = window.app.userInfo;
const username = userInfo.username;

const CommentPanelPropTypes = {
  relistComment: PropTypes.number,
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

  listComments = (isScroll) => {
    seafileAPI.listComments(repoID, filePath).then((res) => {
      this.setState({commentsList: res.data.comments});
      if (isScroll) {
        let that = this;
        setTimeout(() => {
          that.commentsListRef.scrollTo(0, 10000);
        }, 100);
      }
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
      this.listComments(true);
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
    if (this.props.relistComment !== nextProps.relistComment) {
      this.listComments(true);
    }
    if (this.props.participants !== nextProps.participants) {
      this.setState({ participants: nextProps.participants });
    }
  }

  scrollToQuote = (path) => {
    const editorRef = EditorContext.getEditorRef();
    editorRef.scrollToQuote(path);
  }

  setCommentsListRef = (ref) => {
    this.commentsListRef = ref;
  }

  render() {
    const { participants, commentsList } = this.state;
    return (
      <div className="seafile-comment">
        <div className="flex-fill o-auto" ref={this.setCommentsListRef}>
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
                    showResolvedComment={this.state.showResolvedComment}
                    scrollToQuote={this.scrollToQuote}
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

export default CommentPanel;
