import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import CommentList from './comment-widget/comment-list';
import ReplyList from './comment-widget/reply-list';

import '../../css/comments-list.css';

const { username, repoID, filePath, docUuid } = window.app.pageOptions;

const CommentPanelPropTypes = {
  toggleCommentPanel: PropTypes.func.isRequired,
  participants: PropTypes.array,
  onParticipantsChange: PropTypes.func,
};

class CommentPanel extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      commentsList: [],
      showResolvedComment: true,
      participants: null,
      relatedUsers: null,
      currentComment: null,
    };
    this.toBeAddedParticipant = [];
  }

  listComments = () => {
    seafileAPI.listComments(repoID, docUuid, filePath).then((res) => {
      this.setState({
        commentsList: res.data.comments,
        isLoading: false,
      });
      if (this.state.currentComment) {
        let newCurrentComment = res.data.comments.find(comment => comment.id === this.state.currentComment.id);
        if (newCurrentComment) {
          this.setState({
            currentComment: newCurrentComment
          });
        }
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  listRepoRelatedUsers = () => {
    seafileAPI.listRepoRelatedUsers(repoID).then((res) => {
      let users = res.data.user_list.map((item) => {
        return { id: item.email, display: item.name, avatar_url: item.avatar_url, contact_email: item.contact_email };
      });
      this.setState({ relatedUsers: users });
    });
  };

  handleCommentChange = (event) => {
    this.setState({ comment: event.target.value });
  };

  addComment = (comment) => {
    seafileAPI.postComment(repoID, filePath, comment).then(() => {
      this.listComments();
    }).catch(err => {
      toaster.danger(Utils.getErrorMsg(err));
    });
  };

  addReply = (reply) => {
    const replyData = {
      author: username,
      reply,
      type: 'reply',
      updated_at: dayjs().format('YYYY-MM-DD HH:mm:ss')
    };
    seafileAPI.insertReply(repoID, docUuid, this.state.currentComment.id, replyData).then(() => {
      this.listComments();
    }).catch(err => {
      toaster.danger(Utils.getErrorMsg(err));
    });
  };

  resolveComment = (comment, resolveState = 'true') => {
    seafileAPI.updateComment(repoID, comment.id, resolveState).then(() => {
      this.listComments();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  deleteComment = (comment) => {
    seafileAPI.deleteComment(repoID, comment.id).then(() => {
      this.clearCurrentComment();
      this.listComments();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  deleteReply = (commentId, replyId) => {
    seafileAPI.deleteReply(repoID, docUuid, commentId, replyId).then(() => {
      this.listComments();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  updateReply = (commentId, replyId, reply) => {
    const replyData = {
      author: username,
      reply,
      type: 'reply',
      updated_at: dayjs().format('YYYY-MM-DD HH:mm:ss')
    };
    seafileAPI.updateReply(repoID, docUuid, commentId, replyId, replyData).then(() => {
      this.listComments();
    }).catch(err => {
      toaster.danger(Utils.getErrorMsg(err));
    });
  };

  editComment = (comment, newComment) => {
    seafileAPI.updateComment(repoID, comment.id, null, null, newComment).then((res) => {
      this.listComments();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onParticipantsChange = () => {
    if (this.props.onParticipantsChange) {
      this.props.onParticipantsChange();
    } else {
      this.getParticipants();
    }
  };

  getParticipants = () => {
    if (this.props.participants) {
      this.setState({ participants: this.props.participants });
    } else {
      seafileAPI.listFileParticipants(repoID, filePath).then((res) => {
        this.setState({ participants: res.data.participant_list });
      });
    }
  };

  componentDidMount() {
    this.listComments();
    this.getParticipants();
    this.listRepoRelatedUsers();
  }

  onClickComment = (currentComment) => {
    this.setState({ currentComment });
  };

  clearCurrentComment = () => {
    this.setState({ currentComment: null });
  };

  render() {
    const { commentsList } = this.state;
    return (
      <div className="seafile-comment">
        {
          this.state.currentComment ?
            <ReplyList
              currentComment={this.state.currentComment}
              clearCurrentComment={this.clearCurrentComment}
              toggleCommentList={this.props.toggleCommentPanel}
              commentsList={commentsList}
              relatedUsers={this.state.relatedUsers}
              participants={this.state.participants}
              deleteComment={this.deleteComment}
              resolveComment={this.resolveComment}
              editComment={this.editComment}
              addReply={this.addReply}
              deleteReply={this.deleteReply}
              updateReply={this.updateReply}
              onParticipantsChange={this.onParticipantsChange}
            />
            :
            <CommentList
              onClickComment={this.onClickComment}
              commentsList={commentsList}
              relatedUsers={this.state.relatedUsers}
              participants={this.state.participants}
              addComment={this.addComment}
              toggleCommentList={this.props.toggleCommentPanel}
              onParticipantsChange={this.onParticipantsChange}
              isLoading={this.state.isLoading}
            />
        }
      </div>
    );
  }
}

CommentPanel.propTypes = CommentPanelPropTypes;

export default CommentPanel;
