import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { SeafileCommentEditor } from '@seafile/comment-editor';
import { gettext } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';
import Loading from '../../loading';
import CommentItemReadOnly from './comment-item-readonly';
import CommentBodyHeader from './comment-body-header';
import Icon from '../../icon';

const { username, repoID, filePath } = window.app.pageOptions;

const CommentListPropTypes = {
  toggleCommentList: PropTypes.func.isRequired,
  participants: PropTypes.array,
  onParticipantsChange: PropTypes.func,
};

class CommentList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      comment: '',
      isInputFocus: false,
      commentType: 'All comments',
    };
    this.toBeAddedParticipant = [];
    this.commentListScrollRef = React.createRef();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.commentsList.length < this.props.commentsList.length) {
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
    this.addParticipant(username);
    if (this.toBeAddedParticipant.length === 0) {
      this.props.addComment(commentData.trim());
      this.setState({ comment: '' });
    } else {
      seafileAPI.addFileParticipants(repoID, filePath, this.toBeAddedParticipant).then((res) => {
        this.onParticipantsChange(repoID, filePath);
        this.toBeAddedParticipant = [];
        this.props.addComment(commentData.trim());
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

  setCommentType = (e, commentType) => {
    this.setState({ commentType });
  };

  getFilteredComments = () => {
    const { commentsList } = this.props;
    if (this.state.commentType === 'All comments') {
      return commentsList;
    } else if (this.state.commentType === 'Resolved comments') {
      return commentsList.filter((comment) => comment.resolved);
    } else if (this.state.commentType === 'Unresolved comments') {
      return commentsList.filter((comment) => !comment.resolved);
    }
    return commentsList;
  };

  render() {
    const { commentsList, isLoading } = this.props;
    const filteredComments = this.getFilteredComments();
    return (
      <div className="seafile-comment-page h-100">

        <div className="seafile-comment-title">
          <div className="comments-panel-header-left">
            {gettext('Comments')}
          </div>
          <div className="comments-panel-header-right">
            <span className="sdoc-icon-btn" onClick={this.props.toggleCommentList}>
              <Icon symbol="x-01" />
            </span>
          </div>
        </div>

        <div
          className="flex-fill o-auto"
          style={{ height: 'calc(100% - 170px)' }}
          ref={this.commentListScrollRef}
        >
          <CommentBodyHeader
            commentList={commentsList}
            commentType={this.state.commentType}
            setCommentType={this.setCommentType}
          />
          {isLoading && <Loading/>}
          {!isLoading && filteredComments.length > 0 &&
            <ul className="seafile-comment-list">
              {filteredComments.map((item) => {
                let oldTime = (new Date(item.created_at)).getTime();
                let time = dayjs(oldTime).format('YYYY-MM-DD HH:mm');
                return (
                  <CommentItemReadOnly
                    key={item.id}
                    item={item}
                    time={time}
                    onClickComment={this.props.onClickComment}
                  />
                );
              })}
            </ul>
          }
          {!isLoading && filteredComments.length === 0 &&
            <p className="text-center my-4">{gettext('No comment yet.')}</p>
          }
        </div>
        <div className='seafile-comment-footer flex-shrink-0'>
          <SeafileCommentEditor
            type="comment"
            settings={{
              ...window.app.config,
              name: window.app.pageOptions.userNickName,
              mediaUrl: window.app.config.mediaUrl + 'comment-editor/'
            }}
            hiddenUserInfo={true}
            toolMenus={[]}
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

CommentList.propTypes = CommentListPropTypes;

export default CommentList;
