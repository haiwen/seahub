import React from 'react';
import PropTypes from 'prop-types';
import { processor } from '@seafile/seafile-editor';
import { Button, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import CommentDeletePopover from './comment-delete-popover';

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
      dropdownOpen: false,
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

  toggleDropDownMenu = () => {
    this.setState({
      dropdownOpen: !this.state.dropdownOpen,
    });
  };

  convertComment = (mdFile) => {
    processor.process(mdFile).then((result) => {
      let html = String(result);
      this.setState({ html: html });
    });
  };

  toggleEditComment = () => {
    this.setState({
      editable: !this.state.editable
    });
  };

  updateComment = () => {
    const newReply = this.state.newReply.trim();
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
            <img className="avatar" src={item.avatar_url} alt=""/>
            <div className="comment-author-info">
              <div className="comment-author-name ellipsis">{item.user_name}</div>
              <div className="comment-author-time">{this.props.time}</div>
            </div>
          </div>
          <div className="seafile-edit-comment">
            <textarea className="edit-comment-input" value={this.state.newReply} onChange={this.handleCommentChange} clos="100" rows="3" warp="virtual"></textarea>
            <Button className="comment-btn" color="primary" size="sm" onClick={this.updateComment} id={item.id}>{gettext('Update')}</Button>{' '}
            <Button className="comment-btn" color="secondary" size="sm" onClick={this.toggleEditComment}>{gettext('Cancel')}</Button>
          </div>
        </li>
      );
    }
    return (
      <li className={'seafile-comment-item'} id={item.id}>
        <div className="seafile-comment-info mt-1">
          <img className="avatar" src={item.avatar_url} alt=""/>
          <div className="comment-author-info">
            <div className="comment-author-name ellipsis">{item.user_name}</div>
            <div className="comment-author-time">{this.props.time}</div>
          </div>
          <Dropdown
            isOpen={this.state.dropdownOpen}
            size="sm"
            className="seafile-comment-dropdown"
            toggle={this.toggleDropDownMenu}
            id={replyOpToolsId}
          >
            <DropdownToggle
              tag="i"
              role="button"
              tabIndex="0"
              className="seafile-comment-dropdown-btn sf-dropdown-toggle sf3-font-more sf3-font"
              title={gettext('More operations')}
              aria-label={gettext('More operations')}
              data-toggle="dropdown"
              aria-expanded={this.state.dropdownOpen}
              aria-haspopup={true}
            />
            <DropdownMenu>
              {(item.user_email === username) &&
                <DropdownItem
                  onClick={this.toggleShowDeletePopover}
                  className="delete-comment"
                  id={item.id}
                >
                  {gettext('Delete')}
                </DropdownItem>
              }
              {(item.user_email === username) &&
                <DropdownItem
                  onClick={this.toggleEditComment}
                  className="edit-comment"
                  id={item.id}
                >
                  {gettext('Edit')}
                </DropdownItem>
              }
            </DropdownMenu>
          </Dropdown>
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
