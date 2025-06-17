import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import deepCopy from 'deep-copy';
import { gettext } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';
import Loading from '../../loading';
import { MentionsInput, Mention } from 'react-mentions';
import { defaultStyle } from '../../../css/react-mentions-default-style';
import CommentItemReadOnly from './comment-item-readonly';
import CommentBodyHeader from './comment-body-header';

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
      defaultStyle: defaultStyle,
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
    if (!this.state.comment.trim()) {
      return;
    }
    this.addParticipant(username);
    if (this.toBeAddedParticipant.length === 0) {
      this.props.addComment(this.state.comment.trim());
      this.setState({ comment: '' });
    } else {
      seafileAPI.addFileParticipants(repoID, filePath, this.toBeAddedParticipant).then((res) => {
        this.onParticipantsChange(repoID, filePath);
        this.toBeAddedParticipant = [];
        this.props.addComment(this.state.comment.trim());
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
    if (this.inputBlurTimer) {
      clearTimeout(this.inputBlurTimer);
      this.inputBlurTimer = null;
    }
    if (this.state.isInputFocus === false) {
      let defaultStyle = this.state.defaultStyle;
      defaultStyle['&multiLine']['input'].border = '1px solid #ff8e03';
      this.setState({
        isInputFocus: true,
        defaultStyle: deepCopy(defaultStyle),
      });
    }
  };

  onInputBlur = () => {
    if (this.state.isInputFocus === true) {
      this.inputBlurTimer = setTimeout(() => {
        let defaultStyle = this.state.defaultStyle;
        defaultStyle['&multiLine']['input'].border = '1px solid #e6e6dd';
        this.setState({
          isInputFocus: false,
          defaultStyle: deepCopy(defaultStyle),
        });
      }, 100);
    }
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
              <i className="sdocfont sdoc-sm-close"></i>
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
          <MentionsInput
            value={this.state.comment}
            onChange={this.handleCommentChange}
            onKeyDown={this.onKeyDown}
            placeholder={gettext('Enter comment, Shift + Enter for new line, Enter to send')}
            style={this.state.defaultStyle}
            onFocus={this.onInputFocus}
            onBlur={this.onInputBlur}
          >
            <Mention
              trigger="@"
              displayTransform={(username, display) => `@${display}`}
              data={this.props.relatedUsers}
              renderSuggestion={this.renderUserSuggestion}
              onAdd={(id, display) => {this.addParticipant(id);}}
              appendSpaceOnAdd={true}
            />
          </MentionsInput>
          <div className="comment-submit-container" style={{ borderColor: this.state.isInputFocus ? '#ff8e03' : '#e6e6dd' }}>
            <div onClick={this.onSubmit}>
              <i className="sdocfont sdoc-save sdoc-comment-btn"></i>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

CommentList.propTypes = CommentListPropTypes;

export default CommentList;
