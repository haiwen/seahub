import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import classname from 'classnames';
import deepCopy from 'deep-copy';
import { gettext } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';
import { MentionsInput, Mention } from 'react-mentions';
import { defaultStyle } from '../../../css/react-mentions-default-style';
import CommentItem from './comment-item';
import ReplyItem from './reply-item';

const { username, repoID, filePath } = window.app.pageOptions;

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
    const initStyle = defaultStyle;
    initStyle['&multiLine']['input'].minHeight = 40;
    initStyle['&multiLine']['input'].height = 40;
    initStyle['&multiLine']['input'].borderRadius = '5px';
    initStyle['&multiLine']['input'].borderBottom = '1px solid rgb(230, 230, 221)';
    initStyle['&multiLine']['input'].lineHeight = '24px';
    this.state = {
      comment: '',
      isInputFocus: false,
      defaultStyle: initStyle,
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

  onKeyDown = (e) => {
    if (e.key == 'Enter') {
      e.preventDefault();
      this.onSubmit();
    }
  };

  handleCommentChange = (event) => {
    this.setState({ comment: event.target.value });
  };

  onSubmit = () => {
    if (!this.state.comment.trim()) return;
    this.addParticipant(username);
    if (this.toBeAddedParticipant.length === 0) {
      this.props.addReply(this.state.comment.trim());
      this.setState({ comment: '' });
    } else {
      seafileAPI.addFileParticipants(repoID, filePath, this.toBeAddedParticipant).then((res) => {
        this.onParticipantsChange(repoID, filePath);
        this.toBeAddedParticipant = [];
        this.props.addReply(this.state.comment.trim());
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

  renderUserSuggestion = (entry, search, highlightedDisplay, index, focused) => {
    return (
      <div className={`comment-participant-item user ${focused ? 'active' : ''}`}>
        <div className="comment-participant-container">
          <img className="comment-participant-avatar" alt={highlightedDisplay} src={entry.avatar_url}/>
          <div className="comment-participant-name">{highlightedDisplay}</div>
        </div>
      </div>
    );
  };

  onInputFocus = () => {
    if (this.inpurBlurTimer) {
      clearTimeout(this.inpurBlurTimer);
      this.inpurBlurTimer = null;
    }
    if (this.state.isInputFocus === false) {
      let defaultStyle = this.state.defaultStyle;
      defaultStyle['&multiLine']['input'].maxHeight = 90;
      defaultStyle['&multiLine']['input'].minHeight = 90;
      defaultStyle['&multiLine']['input'].height = 90;
      defaultStyle['&multiLine']['input'].borderBottom = 'none';
      defaultStyle['&multiLine']['input'].borderRadius = '5px 5px 0 0';
      defaultStyle['&multiLine']['input'].overflowY = 'auto';
      defaultStyle['&multiLine']['input'].lineHeight = 'default';
      this.setState({
        isInputFocus: true,
        defaultStyle: deepCopy(defaultStyle),
      });
    }
  };

  onInputBlur = () => {
    if (this.state.isInputFocus === true) {
      this.inpurBlurTimer = setTimeout(() => {
        let defaultStyle = this.state.defaultStyle;
        defaultStyle['&multiLine']['input'].minHeight = 40;
        defaultStyle['&multiLine']['input'].height = 40;
        defaultStyle['&multiLine']['input'].borderBottom = '1px solid rgb(230, 230, 221)';
        defaultStyle['&multiLine']['input'].borderRadius = '5px';
        defaultStyle['&multiLine']['input'].lineHeight = '24px';
        this.setState({
          isInputFocus: false,
          defaultStyle: deepCopy(defaultStyle),
        });
      }, 100);
    }
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
          style={{ height: this.state.isInputFocus ? 'calc(100% - 170px)' : 'calc(100% - 124px)' }}
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
        <div
          className={classname('seafile-comment-footer flex-shrink-0')}
          style={{ height: this.state.isInputFocus ? '120px' : '72px' }}
        >
          <MentionsInput
            value={this.state.comment}
            onChange={this.handleCommentChange}
            placeholder={gettext('Enter reply, Shift + Enter for new line, Enter to send')}
            onKeyDown={this.onKeyDown}
            style={this.state.defaultStyle}
            onFocus={this.onInputFocus}
            onBlur={this.onInputBlur}
          >
            <Mention
              trigger="@"
              displayTransform={(username, display) => `@${display}`}
              data={this.state.relatedUsers}
              renderSuggestion={this.renderUserSuggestion}
              onAdd={(id, display) => {this.addParticipant(id);}}
              appendSpaceOnAdd={true}
            />
          </MentionsInput>
          {this.state.isInputFocus &&
            <div className="comment-submit-container">
              <div onClick={this.onSubmit}>
                <i className="sdocfont sdoc-save sdoc-comment-btn"></i>
              </div>
            </div>
          }
        </div>
      </div>
    );
  }
}

ReplyList.propTypes = ReplyListPropTypes;

export default ReplyList;
