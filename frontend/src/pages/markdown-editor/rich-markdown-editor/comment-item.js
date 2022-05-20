import React from 'react';
import PropTypes from 'prop-types';
import { processor } from '@seafile/seafile-editor';
import { Button, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { gettext } from '../../../utils/constants';

const userInfo = window.app.userInfo;
const username = userInfo.username;

const commentItemPropTypes = {
  time: PropTypes.string.isRequired,
  item: PropTypes.object.isRequired,
  deleteComment: PropTypes.func.isRequired,
  resolveComment: PropTypes.func.isRequired,
  showResolvedComment: PropTypes.bool.isRequired,
  editComment: PropTypes.func.isRequired,
  scrollToQuote: PropTypes.func.isRequired,
};

class CommentItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      dropdownOpen: false,
      html: '',
      newComment: this.props.item.comment,
      editable: false,
      quote: '',
      position: null,
    };
  }

  toggleDropDownMenu = () => {
    this.setState({dropdownOpen: !this.state.dropdownOpen});
  }

  convertComment = (item) => {
    processor.process(item.comment).then((result) => {
      let html = String(result);
      this.setState({
        html: html
      });
    });
    if (item.detail) {
      const detail = JSON.parse(item.detail);
      processor.process(detail.quote).then((result) => {
        let quote = String(result);
        this.setState({
          quote: quote,
          position: detail.position,
        });
      });
    }
  }

  toggleEditComment = () => {
    this.setState({editable: !this.state.editable});
  }

  updateComment = (event) => {
    const newComment = this.state.newComment;
    if (this.props.item.comment !== newComment) {
      this.props.editComment(event.target.id, newComment);
    }
    this.toggleEditComment();
  }

  handleCommentChange = (event) => {
    this.setState({newComment: event.target.value});
  }
  
  onScrollToQuote = () => {
    const { position } = this.state;
    this.props.scrollToQuote(position);
  }

  componentWillMount() {
    this.convertComment(this.props.item);
  }

  componentWillReceiveProps(nextProps) {
    this.convertComment(nextProps.item);
  }

  render() {
    const item = this.props.item;
    if (item.resolved && !this.props.showResolvedComment) {
      return null;
    }
    if (this.state.editable) {
      return(
        <li className="seafile-comment-item" id={item.id}>
          <div className="seafile-comment-info">
            <img className="avatar" src={item.avatar_url} alt=""/>
            <div className="reviewer-info">
              <div className="reviewer-name ellipsis">{item.user_name}</div>
              <div className="review-time">{this.props.time}</div>
            </div>
          </div>
          <div className="seafile-edit-comment">
            <textarea className="edit-comment-input" value={this.state.newComment} onChange={this.handleCommentChange} clos="100" rows="3" warp="virtual"></textarea>
            <Button className="comment-btn" color="primary" size="sm" onClick={this.updateComment} id={item.id}>{gettext('Update')}</Button>{' '}
            <Button className="comment-btn" color="secondary" size="sm" onClick={this.toggleEditComment}>{gettext('Cancel')}</Button>
          </div>
        </li>
      );
    }
    return (
      <li className={item.resolved ? 'seafile-comment-item seafile-comment-item-resolved'
        : 'seafile-comment-item'} id={item.id}>
        <div className="seafile-comment-info">
          <img className="avatar" src={item.avatar_url} alt=""/>
          <div className="reviewer-info">
            <div className="reviewer-name ellipsis">{item.user_name}</div>
            <div className="review-time">{this.props.time}</div>
          </div>
          <Dropdown isOpen={this.state.dropdownOpen} size="sm"
            className="seafile-comment-dropdown" toggle={this.toggleDropDownMenu}>
            <DropdownToggle className="seafile-comment-dropdown-btn">
              <i className="fas fa-ellipsis-v"></i>
            </DropdownToggle>
            <DropdownMenu>
              {(item.user_email === username) &&
                <DropdownItem onClick={this.props.deleteComment} className="delete-comment"
                  id={item.id}>{gettext('Delete')}</DropdownItem>}
              {(item.user_email === username) &&
                <DropdownItem onClick={this.toggleEditComment}
                  className="edit-comment" id={item.id}>{gettext('Edit')}</DropdownItem>
              }
              {!item.resolved &&
                <DropdownItem onClick={this.props.resolveComment} className="seafile-comment-resolved"
                  id={item.id}>{gettext('Mark as resolved')}</DropdownItem>
              }
            </DropdownMenu>
          </Dropdown>
        </div>
        {item.detail &&
          <blockquote className="seafile-comment-content">
            <div onClick={this.onScrollToQuote} dangerouslySetInnerHTML={{ __html: this.state.quote }}></div>
          </blockquote>
        }
        <div className="seafile-comment-content" dangerouslySetInnerHTML={{ __html: this.state.html }}></div>
      </li>
    );
  }
}

CommentItem.propTypes = commentItemPropTypes;

export default CommentItem;
