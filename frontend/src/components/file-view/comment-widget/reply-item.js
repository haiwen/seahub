import React from 'react';
import PropTypes from 'prop-types';
import { SeafileCommentEditor, commentProcessor } from '@seafile/comment-editor';
import { gettext } from '../../../utils/constants';
import CommentDeletePopover from './comment-delete-popover';
import CustomDropdown from '../../dropdown';

const { username } = window.app.pageOptions;

const commentItemPropTypes = {
  time: PropTypes.string,
  item: PropTypes.object,
  deleteReply: PropTypes.func,
  showResolvedComment: PropTypes.bool,
  editComment: PropTypes.func,
};

class ReplyItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      html: '',
      newReply: this.props.item.reply,
      editable: false,
      isShowDeletePopover: false,
    };
  }

  componentWillMount() {
    this.convertComment(this.props.item.reply);
  }

  componentWillReceiveProps(nextProps) {
    this.convertComment(nextProps.item.reply);
  }

  convertComment = (mdFile) => {
    commentProcessor.process(mdFile).then((result) => {
      let html = String(result);
      this.setState({ html: html });
    });
  };

  toggleEditComment = () => {
    this.setState({
      editable: !this.state.editable
    });
  };

  updateComment = (replayData) => {
    const newReply = replayData.trim();
    this.setState({ newReply, });
    if (this.props.item.reply !== newReply) {
      this.props.updateReply(newReply);
    }
    this.toggleEditComment();
  };

  handleCommentChange = (event) => {
    this.setState({
      newReply: event.target.value,
    });
  };

  onCommentContentClick = (e) => {
    // click participant link, page shouldn't jump
    if (e.target.nodeName !== 'A') return;
    const preNode = e.target.previousSibling;
    if (preNode && preNode.nodeType === 3 && preNode.nodeValue.slice(-1) === '@') {
      e.preventDefault();
    }
  };

  getMenuItems = () => {
    return [
      { key: 'delete', label: gettext('Delete'), onClick: this.toggleShowDeletePopover },
      { key: 'edit', label: gettext('Edit'), onClick: this.toggleEditComment },
    ];
  };

  toggleShowDeletePopover = () => {
    this.setState({
      isShowDeletePopover: !this.state.isShowDeletePopover
    });
  };

  render() {
    const item = this.props.item;
    const replyOpToolsId = `commentOpTools_${item?.id}`;
    if (this.state.editable) {
      return (
        <li className="seafile-comment-item" id={item.id}>
          <div className="seafile-comment-info mt-1">
            <img className="avatar" src={item.avatar_url} alt="" />
            <div className="comment-author-info">
              <div className="comment-author-name ellipsis">{item.user_name}</div>
              <div className="comment-author-time">{this.props.time}</div>
            </div>
          </div>
          <SeafileCommentEditor
            type="reply"
            content={this.state.newReply}
            settings={{
              ...window.app.config,
              name: window.app.pageOptions.userNickName,
              mediaUrl: window.app.config.mediaUrl + 'comment-editor/'
            }}
            hiddenUserInfo={true}
            toolMenus={[]}
            insertContent={this.updateComment}
          />
        </li>
      );
    }
    return (
      <li className={'seafile-comment-item'} id={item.id}>
        <div className="seafile-comment-info">
          <img className="avatar" src={item.avatar_url} alt="" />
          <div className="comment-author-info">
            <div className="comment-author-name ellipsis">{item.user_name}</div>
            <div className="comment-author-time">{this.props.time}</div>
          </div>
          {(item.user_email === username) &&
            <CustomDropdown
              target={replyOpToolsId}
              items={this.getMenuItems()}
              triggerClassName="op-icon"
            />
          }
        </div>
        <div
          className="seafile-comment-content"
          dangerouslySetInnerHTML={{ __html: this.state.html }}
          onClick={e => this.onCommentContentClick(e)}
        >
        </div>
        {this.state.isShowDeletePopover && (
          <CommentDeletePopover
            type="reply"
            deleteConfirm={this.props.deleteReply}
            setIsShowDeletePopover={this.toggleShowDeletePopover}
            targetId={replyOpToolsId}
          />
        )}
      </li>
    );
  }
}

ReplyItem.propTypes = commentItemPropTypes;

export default ReplyItem;
