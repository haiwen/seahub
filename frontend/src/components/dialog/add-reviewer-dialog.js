import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Input, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api.js';
import '../../css/add-reviewer-dialog.css';

const propTypes = {
  showReviewerDialog: PropTypes.bool.isRequired
};

class AddReviewerDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      newReviewer: '',
      errorMsg: '',
      reviewers: [],
      avatar: [],
    };
  }
  
  handleChange = (e) => {
    this.setState({
      newReviewer: e.target.value, 
    }); 
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.addReviewers();
    } 
  }

  addReviewers = () => {
    let array = this.state.newReviewer;
    seafileAPI.addReviewers(this.props.reviewID, array).then((response) => {
      if (response.data.failed.length > 0) {
        this.setState({
          errorMsg: response.data.failed[0].error_msg
        });
        let that = this;
        setTimeout(function(){
          that.setState({
            errorMsg: ''
          })
        }, 3000);
      }
      if (response.data.success.length > 0) {
        this.getReviewers();
      }
    });
  }
    
  getReviewers = () => {
    seafileAPI.listReviewers(this.props.reviewID).then((response) => {
      this.setState({
        reviewers: response.data.reviewers,
      });
      let array = [];
      for (let i = 0; i < this.state.reviewers.length ; i ++) {
        seafileAPI.getUserAvatar(this.state.reviewers[i].name, 80).then((response) => {
          array.push(response.data.url);
          this.setState({
            avatar: array,
          });
        })
      }
    });
  }

  componentWillMount() {
    this.getReviewers();
  }

  render() {
    return (
      <Modal isOpen={this.props.showReviewerDialog} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Request a review')}</ModalHeader>
        <ModalBody>
          <p>{gettext('Add new reviewer')}</p>
          <Input onKeyPress={this.handleKeyPress}
            value={this.state.newReviewer}
            onChange={this.handleChange} />
            <p className="error">{this.state.errorMsg}</p>
          { this.state.reviewers.length > 0 &&
            this.state.reviewers.map((item, index = 0, arr) => {
              return (
                <div className="reviewer-info" key={index}>
                  <img className="avatar reviewer-avatar" src={this.state.avatar[index]} alt=""/>
                  <span className="reviewer-nickname">{item.nickname}</span>
                </div>
              )
            })
          }
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.addReviewers}>{gettext('Submit')}</Button>
          <Button color="secondary" onClick={this.props.toggleAddReviewerDialog}>
            {gettext('Cancel')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

AddReviewerDialog.propTypes = propTypes;

export default AddReviewerDialog;
