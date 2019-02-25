import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { processor } from '@seafile/seafile-editor/dist/utils/seafile-markdown2html';
import { Button, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import '../../css/comments-list.css';

const { username, repoID, filePath } = window.app.pageOptions;

const CommentPanelPropTypes = {
  toggleCommentPanel: PropTypes.func.isRequired
};

class CommentPanel extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      commentsList: [],
      showResolvedComment: true,
    };
  }

  toggleResolvedComment = () => {
    this.setState({
      showResolvedComment: !this.state.showResolvedComment
    });
  }

  listComments = () => {
    seafileAPI.listComments(repoID, filePath).then((res) => {
      this.setState({
        commentsList: res.data.comments
      });
    });
  }

  handleCommentChange = (event) => {
    this.setState({
      comment: event.target.value,
    });
  }

  submitComment = () => {
    let comment = this.refs.commentTextarea.value;
    if (comment.trim()) {
      seafileAPI.postComment(repoID, filePath, comment).then(() => {
        this.listComments();
      });
    }
    this.refs.commentTextarea.value = '';
  }

  resolveComment = (event) => {
    seafileAPI.updateComment(repoID, event.target.id, 'true').then(() => {
      this.listComments();
    });
  }

  deleteComment = (event) => {
    seafileAPI.deleteComment(repoID, event.target.id).then(() => {
      this.listComments();
    });
  }

  componentDidMount() {
    this.listComments();
  }

  render() {
    return (
      <div className="seafile-comment">
        <div className="seafile-comment-title">
          <div onClick={this.props.toggleCommentPanel} className={'seafile-comment-title-close'}>
            <i className={'fa fa-times-circle'}/>
          </div>
          <div className={'seafile-comment-title-text'}>{gettext('Comments')}</div>
        </div>
        <div className="seafile-comment-toggle-resolved">
          <div className={'seafile-comment-title-text'}>{gettext('Show resolved comments')}</div>
          <div className={'seafile-comment-title-toggle d-flex'}>
            <label className="custom-switch" id="toggle-resolved-comments">
              <input type="checkbox" name="option" className="custom-switch-input"
                onChange={this.toggleResolvedComment}
                checked={this.state.showResolvedComment && 'checked'}
              />
              <span className="custom-switch-indicator"></span>
            </label>
          </div>
        </div>
        <ul className={'seafile-comment-list'}>
          {this.state.commentsList.length > 0 &&
            this.state.commentsList.map((item, index = 0, arr) => {
              let oldTime = (new Date(item.created_at)).getTime();
              let time = moment(oldTime).format('YYYY-MM-DD HH:mm');
              return (
                <React.Fragment key={item.id}>
                  <CommentItem
                    item={item} time={time}
                    deleteComment={this.deleteComment}
                    resolveComment={this.resolveComment}
                    showResolvedComment={this.state.showResolvedComment}
                  />
                </React.Fragment>
              );
            })
          }
          {(this.state.commentsList.length == 0 ) &&
            <li className="comment-vacant">{gettext('No comment yet.')}</li>}
        </ul>
        <div className="seafile-comment-footer">
            <textarea
              className="add-comment-input" ref="commentTextarea"
              placeholder={gettext('Add a comment.')}
              clos="100" rows="3" warp="virtual"></textarea>
            <Button
              className="submit-comment" color="success"
              size="sm" onClick={this.submitComment} >
              {gettext('Submit')}</Button>
        </div>
      </div>
    );
  }
}

CommentPanel.propTypes = CommentPanelPropTypes;


const commentItemPropTypes = {
  time: PropTypes.string.isRequired,
  item: PropTypes.object.isRequired,
  deleteComment: PropTypes.func.isRequired,
  resolveComment: PropTypes.func.isRequired,
  showResolvedComment: PropTypes.bool.isRequired,
};

class CommentItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      dropdownOpen: false,
      html: '',
    };
  }

  toggleDropDownMenu = () => {
    this.setState({
      dropdownOpen: !this.state.dropdownOpen,
    });
  }

  convertComment = (mdFile) => {
    processor.process(mdFile).then(
      (result) => {
        let html = String(result);
        this.setState({
          html: html
        });
      }
    );
  }

  componentWillMount() {
    this.convertComment(this.props.item.comment);
  }

  componentWillReceiveProps(nextProps) {
    this.convertComment(nextProps.item.comment);
  }

  render() {
    const item = this.props.item;
    if (item.resolved && !this.props.showResolvedComment) {
      return null;
    }
    return (
      <li className={item.resolved ? 'seafile-comment-item seafile-comment-item-resolved'
        : 'seafile-comment-item'} id={item.id}>
        <div className="seafile-comment-info">
          <img className="avatar" src={item.avatar_url} alt=""/>
          <div className="reviewer-info">
            <div className="reviewer-name">{item.user_name}</div>
            <div className="review-time">{this.props.time}</div>
          </div>
          <Dropdown isOpen={this.state.dropdownOpen} size="sm"
            className="seafile-comment-dropdown" toggle={this.toggleDropDownMenu}>
            <DropdownToggle className="seafile-comment-dropdown-btn">
              <i className="fas fa-ellipsis-v"></i>
            </DropdownToggle>
            <DropdownMenu>
              {
                (item.user_email === username) &&
                <DropdownItem onClick={this.props.deleteComment} className="delete-comment"
                  id={item.id}>{gettext('Delete')}</DropdownItem>}
              {
                !item.resolved &&
                <DropdownItem onClick={this.props.resolveComment} className="seafile-comment-resolved"
                  id={item.id}>{gettext('Mark as resolved')}</DropdownItem>
              }
            </DropdownMenu>
          </Dropdown>
        </div>
        <div className="seafile-comment-content" dangerouslySetInnerHTML={{ __html: this.state.html }}></div>
      </li>
    );
  }
}

CommentItem.propTypes = commentItemPropTypes;

export default CommentPanel;
