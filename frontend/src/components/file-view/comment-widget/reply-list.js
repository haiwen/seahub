import React from 'react';
import PropTypes from 'prop-types';
import { SeafileCommentEditor } from '@seafile/comment-editor';
import dayjs from 'dayjs';
import { gettext } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';
import CommentItem from './comment-item';
import ReplyItem from './reply-item';

const { repoID, filePath } = window.app.pageOptions;

const ReplyListPropTypes = {
  toggleCommentList: PropTypes.func.isRequired,
  participants: PropTypes.array,
  onParticipantsChange: PropTypes.func,
  currentComment: PropTypes.object,
  clearCurrentComment: PropTypes.func,
  commentsList: PropTypes.array,
};

class ReplyList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      comment: '',
      isInputFocus: false,
    };
    this.toBeAddedParticipant = [];
    this.commentListScrollRef = React.createRef();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.currentComment.replies.length < this.props.currentComment.replies.length) {
      let container = this.commentListScrollRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight + 100;
      }
    }
  }

  onSubmit = (commentData) => {
    if (!commentData.trim()) {
      return;
    }
    if (this.toBeAddedParticipant.length === 0) {
      this.props.addReply(commentData.trim());
      this.setState({ comment: '' });
    } else {
      seafileAPI.addFileParticipants(repoID, filePath, this.toBeAddedParticipant).then((res) => {
        this.onParticipantsChange(repoID, filePath);
        this.toBeAddedParticipant = [];
        this.props.addReply(commentData.trim());
        this.setState({ comment: '' });
      }).catch((err) => {
        toaster.danger(Utils.getErrorMsg(err));
      });
    }
  };

  onParticipantsChange = () => {
    if (this.props.onParticipantsChange) {
      this.props.onParticipantsChange();
    } else {
      this.getParticipants();
    }
  };

  checkParticipant = (email) => {
    return this.props.participants.map((participant) => {return participant.email;}).includes(email);
  };

  addParticipant = (email) => {
    if (this.checkParticipant(email)) return;
    this.toBeAddedParticipant.push(email);
  };

  render() {
    const { currentComment } = this.props;
    const { replies } = currentComment;
    return (
      <div className="seafile-reply-page h-100">

        <div className="seafile-comment-title">
          <div className="comments-panel-header-left">
            <div className="goback sdoc-icon-btn ml-0 mr-1" onClick={this.props.clearCurrentComment}>
              <i className="sdocfont sdoc-previous-page" style={{ transform: 'scale(1.2)' }}></i>
            </div>
            <span className="title">{gettext('Comment details')}</span>
          </div>
          <div className="comments-panel-header-right">
            <div className="sdoc-icon-btn" onClick={this.props.toggleCommentList}>
              <i className="sdocfont sdoc-sm-close"></i>
            </div>
          </div>
        </div>

        <div
          className="flex-fill o-auto"
          style={{ height: 'calc(100% - 170px)' }}
          ref={this.commentListScrollRef}
        >
          <ul className="seafile-comment-list">
            <CommentItem
              key={currentComment.id}
              item={currentComment}
              deleteComment={this.props.deleteComment}
              resolveComment={this.props.resolveComment}
              editComment={this.props.editComment}
            />
            {replies.map((item) => {
              let oldTime = (new Date(item.created_at)).getTime();
              let time = dayjs(oldTime).format('YYYY-MM-DD HH:mm');
              return (
                <ReplyItem
                  key={item.id}
                  item={item}
                  time={time}
                  deleteReply={() => this.props.deleteReply(currentComment.id, item.id)}
                  updateReply={(replyContent) => this.props.updateReply(currentComment.id, item.id, replyContent)}
                />
              );
            })}
          </ul>
        </div>
        <div className='seafile-comment-footer flex-shrink-0'>
          <SeafileCommentEditor
            type="reply"
            settings={{ ...window.app.pageOptions, name: window.app.pageOptions.userNickName }}
            hiddenUserInfo={true}
            hiddenToolMenu={true}
            insertContent={this.onSubmit}
            collaborators={this.props.relatedUsers ? this.props.relatedUsers : []}
            participants={this.props.participants ? this.props.participants : []}
            addParticipants={(email) => {this.addParticipant(email);}}
          />
        </div>
      </div>
    );
  }
}

ReplyList.propTypes = ReplyListPropTypes;

export default ReplyList;
