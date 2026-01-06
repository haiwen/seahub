import React from 'react';
import PropTypes from 'prop-types';
import { commentProcessor } from '@seafile/comment-editor';

const commentItemPropTypes = {
  time: PropTypes.string,
  item: PropTypes.object,
  showResolvedComment: PropTypes.bool,
  onClickComment: PropTypes.func,
};

class CommentItemReadOnly extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      html: '',
      newComment: this.props.item.comment,
    };
  }

  convertComment = (mdFile) => {
    commentProcessor.process(mdFile).then((result) => {
      let html = String(result);
      this.setState({ html: html });
    });
  };

  handleCommentChange = (event) => {
    this.setState({
      newComment: event.target.value,
    });
  };

  componentWillMount() {
    this.convertComment(this.props.item.comment);
  }

  componentWillReceiveProps(nextProps) {
    this.convertComment(nextProps.item.comment);
  }

  onCommentContentClick = (e) => {
    // click participant link, page shouldn't jump
    if (e.target.nodeName !== 'A') return;
    const preNode = e.target.previousSibling;
    if (preNode && preNode.nodeType === 3 && preNode.nodeValue.slice(-1) === '@') {
      e.preventDefault();
    }
  };

  render() {
    const item = this.props.item;
    const replies = item.replies || [];
    const lastReply = replies[replies.length - 1];
    return (
      <li className={'seafile-comment-item'} id={item.id} onClick={() => this.props.onClickComment(item)}>
        <div className="seafile-comment-info">
          <img className="avatar mt-1" src={item.avatar_url} alt=""/>
          <div className="comment-author-info">
            <div className="comment-author-name ellipsis">{item.user_name}</div>
            <div className="comment-author-time">
              {this.props.time}
              {item.resolved &&
                <span className="comment-success-resolved sdocfont sdoc-mark-as-resolved"></span>
              }
            </div>
          </div>
        </div>
        <div
          className="seafile-comment-content"
          dangerouslySetInnerHTML={{ __html: this.state.html }}
          onClick={e => this.onCommentContentClick(e)}
        >
        </div>
        {replies.length > 0 &&
          <div className="comment-footer">
            <span className="comments-count">
              <i className="sdocfont sdoc-comments"></i>
              <span className="comments-count-number">{replies.length}</span>
            </span>
            <div className="comment-author">
              <span className="comment-author__avatar">
                <img alt="" src={lastReply.avatar_url}/>
              </span>
              <div className="comment-author__latest-reply">
                <p>{lastReply.reply}</p>
              </div>
            </div>
          </div>
        }
      </li>
    );
  }
}

CommentItemReadOnly.propTypes = commentItemPropTypes;

export default CommentItemReadOnly;
