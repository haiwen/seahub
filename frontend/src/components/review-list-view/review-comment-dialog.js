import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { reviewID, gettext } from '../../utils/constants';

import '../../css/review-comment-dialog.css';

const commentDialogPropTypes = {
  onCommentAdded: PropTypes.func.isRequired,
  toggleCommentDialog: PropTypes.func.isRequired,
  selectedText: PropTypes.string,
  newIndex: PropTypes.number,
  oldIndex: PropTypes.number,
  top: PropTypes.string
};

class ReviewCommentDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      comment: '',
      userName: '',
    };
  }

  handleCommentChange = (event) => {
    let comment = event.target.value;
    this.setState({
      comment: comment
    });
  }

  getUserName = () => {
    seafileAPI.getAccountInfo().then((res) => {
      this.setState({
        userName: res.data.name
      });
    });
  } 

  submitComment = () => {
    let comment = this.state.comment.trim();
    if (comment.length > 0) {
      if (this.props.selectedText.length > 0) {
        let detail = {
          selectedText: this.props.selectedText.slice(0, 10),
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

  setQuoteText = (text) => {
    if (text.length > 0) {
      this.setState({
        comment: text
      });
    }
  }

  componentWillMount() {
    this.getUserName();
  }

  componentDidMount() {
    this.setQuoteText(this.props.selectedText);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.selectedText !== nextProps.selectedText) {
      this.setQuoteText(nextProps.selectedText);
    }
  }

  render() {
    let dialogTop = (parseInt(this.props.top) - 80)+ 'px';
    return (
      <div className="review-comment-dialog" style={{top: (dialogTop)}}>
        <div>{this.state.userName}</div>
        <textarea value={this.state.comment} onChange={this.handleCommentChange}></textarea>
        <div className="button-group">
          <Button size="sm" color="primary" onClick={this.submitComment}>{gettext('Submit')}</Button>
          <Button size="sm" color="secondary" onClick={this.props.toggleCommentDialog}>{gettext('Cancle')}</Button>
        </div>
        <span className="review-comment-dialog-triangle"></span>
      </div>
    );
  }
}

ReviewCommentDialog.propTypes = commentDialogPropTypes;

export default ReviewCommentDialog;