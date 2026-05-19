import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { SeafileCommentEditor, commentProcessor } from '@seafile/comment-editor';
import { gettext } from '../../../utils/constants';
import CommentDeletePopover from './comment-delete-popover';
import CustomDropdown from '../../dropdown';

const commentItemPropTypes = {
  time: PropTypes.string,
  item: PropTypes.object,
  deleteComment: PropTypes.func,
  showResolvedComment: PropTypes.bool,
  editComment: PropTypes.func,
};

const { username } = window.app.pageOptions;

class CommentItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      html: '',
      newComment: this.props.item.comment,
      editable: false,
      isShowDeletePopover: false,
    };
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

  updateComment = (commentData) => {
    const newComment = commentData.trim();
    this.setState({ newComment });
    if (this.props.item.comment !== newComment) {
      this.props.editComment(this.props.item, newComment);
    }
    this.toggleEditComment();
  };

  onCommentContentClick = (e) => {
    // click participant link, page shouldn't jump
    if (e.target.nodeName !== 'A') return;
    const preNode = e.target.previousSibling;
    if (preNode && preNode.nodeType === 3 && preNode.nodeValue.slice(-1) === '@') {
      e.preventDefault();
    }
  };

  componentWillMount() {
    this.convertComment(this.props.item.comment);
  }

  componentWillReceiveProps(nextProps) {
    this.convertComment(nextProps.item.comment);
  }

  onCommentClick = (e) => {
    // click participant link, page shouldn't jump
    if (e.target.nodeName !== 'A') return;
    const preNode = e.target.previousSibling;
    if (preNode && preNode.nodeType === 3 && preNode.nodeValue.slice(-1) === '@') {
      e.preventDefault();
    }
  };

  getMenuItems = () => {
    const items = [
      { key: 'delete', label: gettext('Delete'), onClick: this.toggleShowDeletePopover },
      { key: 'edit', label: gettext('Edit'), onClick: this.toggleEditComment },
    ];
    if (!this.props.item.resolved) {
      items.push({ key: 'resolve', label: gettext('Mark as resolved'), onClick: () => this.props.resolveComment(this.props.item, 'true') });
    } else {
      items.push({ key: 'resubmit', label: gettext('Resubmit'), onClick: () => this.props.resolveComment(this.props.item, 'false') });
    }
    return items;
  };

  toggleShowDeletePopover = () => {
    this.setState({
      isShowDeletePopover: !this.state.isShowDeletePopover
    });
  };

  render() {
    const item = this.props.item;
    let oldTime = (new Date(item.created_at)).getTime();
    let time = dayjs(oldTime).format('YYYY-MM-DD HH:mm');
    const commentOpToolsId = `commentOpTools_${item?.id}`;
    if (this.state.editable) {
      return (
        <li className="seafile-comment-item" id={item.id}>
          <div className="seafile-comment-info">
            <img className="avatar mt-1" src={item.avatar_url} alt="" />
            <div className="comment-author-info">
              <div className="comment-author-name ellipsis">{item.user_name}</div>
              <div className="comment-author-time">{time}</div>
            </div>
          </div>
          <SeafileCommentEditor
            type="reply"
            content={this.state.newComment}
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
            <div className="comment-author-time">
              {time}
              {item.resolved &&
                <span className="comment-success-resolved sdocfont sdoc-mark-as-resolved"></span>
              }
            </div>
          </div>
          {(item.user_email === username) &&
            <CustomDropdown
              target={commentOpToolsId}
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
            type="comment"
            targetId={commentOpToolsId}
            deleteConfirm={() => this.props.deleteComment(this.props.item)}
            setIsShowDeletePopover={this.toggleShowDeletePopover}
          />
        )}
      </li>
    );
  }
}

CommentItem.propTypes = commentItemPropTypes;

export default CommentItem;
