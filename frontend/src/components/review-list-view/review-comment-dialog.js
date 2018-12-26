import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { reviewID, gettext, name } from '../../utils/constants';
import { processor } from '../../utils/seafile-markdown2html';

import '../../css/review-comment-dialog.css';

const commentDialogPropTypes = {
  onCommentAdded: PropTypes.func.isRequired,
  toggleCommentDialog: PropTypes.func.isRequired,
  quote: PropTypes.string,
  newIndex: PropTypes.number,
  oldIndex: PropTypes.number,
};

class ReviewCommentDialog extends React.Component {

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
    if (comment.length > 0) {
      if (this.props.quote.length > 0) {
        let detail = {
          quote: this.props.quote,
          newIndex: this.props.newIndex,
          oldIndex: this.props.oldIndex
        };
        let detailJSON = JSON.stringify(detail);
        seafileAPI.addReviewComment(reviewID, comment, detailJSON).then((response) => {
          this.props.onCommentAdded();
        });
      }
      else {
        seafileAPI.addReviewComment(reviewID, comment).then((response) => {
          this.props.onCommentAdded();
        });
      }
      this.setState({
        comment: ''
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
      <div className="review-comment-dialog">
        <div>{name}</div>
        <blockquote className="review-comment-dialog-quote">
          <div dangerouslySetInnerHTML={{ __html: this.state.quote}}></div>
        </blockquote>
        <textarea value={this.state.comment} onChange={this.handleCommentChange}></textarea>
        <div className="button-group">
          <Button size="sm" color="primary" onClick={this.submitComment}>{gettext('Submit')}</Button>
          <Button size="sm" color="secondary" onClick={this.props.toggleCommentDialog}>{gettext('Cancel')}</Button>
        </div>
        <span className="review-comment-dialog-triangle"></span>
      </div>
    );
  }
}

ReviewCommentDialog.propTypes = commentDialogPropTypes;

export default ReviewCommentDialog;