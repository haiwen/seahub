import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import { processor } from '@seafile/seafile-editor';
import { gettext } from '../../utils/constants';
import '../../css/markdown-viewer/comment-dialog.css';

const propTypes = {
  editorApi: PropTypes.object.isRequired,
  quote: PropTypes.string.isRequired,
  commentPosition: PropTypes.object.isRequired,
  onCommentAdded: PropTypes.func.isRequired,
  toggleCommentDialog: PropTypes.func.isRequired,
};

class CommentDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      comment: '',
      quote: '',
    };
  }

  handleCommentChange = (event) => {
    let comment = event.target.value;
    this.setState({
      comment: comment
    });
  }

  submitComment = () => {
    let comment = this.state.comment.trim();
    if (comment.length > 0 && this.props.quote.length > 0) {
      let detail = {
        quote: this.props.quote,
        position: this.props.commentPosition,
      };
      let detailJSON = JSON.stringify(detail);
      this.props.editorApi.postComment(comment, detailJSON).then((res) => {
        this.props.onCommentAdded();
      });
    }
  }

  setQuoteText = (mdQuote) => {
    processor.process(mdQuote).then(
      (result) => {
        let quote = String(result);
        this.setState({
          quote: quote
        });
      }
    );
  }

  componentDidMount() {
    this.setQuoteText(this.props.quote);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.quote !== nextProps.quote) {
      this.setQuoteText(nextProps.quote);
    }
  }

  render() {
    return (
      <div className="comment-dialog">
        <div>{this.props.editorApi.name}</div>
        <blockquote className="comment-dialog-quote">
          <div dangerouslySetInnerHTML={{ __html: this.state.quote}}></div>
        </blockquote>
        <textarea value={this.state.comment} onChange={this.handleCommentChange}></textarea>
        <div className="button-group">
          <Button size="sm" color="primary" onClick={this.submitComment}>{gettext('Submit')}</Button>
          <Button size="sm" color="secondary" onClick={this.props.toggleCommentDialog}>{gettext('Cancel')}</Button>
        </div>
        <span className="comment-dialog-triangle"></span>
      </div>
    );
  }
}

CommentDialog.propTypes = propTypes;

export default CommentDialog;