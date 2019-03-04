import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api.js';
import UserSelect from '../user-select.js';
import '../../css/add-reviewer-dialog.css';

const propTypes = {
  showReviewerDialog: PropTypes.bool.isRequired,
  draftID: PropTypes.string.isRequired,
  toggleAddReviewerDialog: PropTypes.func.isRequired,
  reviewers: PropTypes.array.isRequired
};

class AddReviewerDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      reviewers: this.props.reviewers,
      selectedOption: null,
      errorMsg: [],
      loading: false,
    };
    this.Options = [];
  }

  listReviewers = () => {
    seafileAPI.listDraftReviewers(this.props.draftID).then((res) => {
      this.setState({
        reviewers: res.data.reviewers
      });
    });
  }

  handleSelectChange = (option) => {
    this.setState({
      selectedOption: option,
    });
    this.Options = [];
  }

  addReviewers = () => {
    if (this.state.selectedOption.length > 0 ) {
      this.refs.reviewSelect.clearSelect();
      let reviewers = [];
      for (let i = 0; i < this.state.selectedOption.length; i ++) {
        reviewers[i] = this.state.selectedOption[i].email;
      }
      this.setState({
        loading: true,
        errorMsg: [],
      });
      seafileAPI.addDraftReviewers(this.props.draftID, reviewers).then((res) => {
        if (res.data.failed.length > 0) {
          let errorMsg = [];
          for (let i = 0 ; i < res.data.failed.length ; i++) {
            errorMsg[i] = res.data.failed[i];
          }
          this.setState({
            errorMsg: errorMsg
          });
        }
        this.setState({
          selectedOption: null,
          loading: false
        });
        if (res.data.success.length > 0) {
          this.listReviewers();
        }
      });
    }
  }

  deleteReviewer = (event) => {
    let reviewer = event.target.getAttribute('name');
    seafileAPI.deleteDraftReviewer(this.props.draftID, reviewer).then((res) => {
      if (res.data === 200) {
        let newReviewers = [];
        for (let i = 0; i < this.state.reviewers.length; i ++) {
          if (this.state.reviewers[i].user_email !== reviewer) {
            newReviewers.push(this.state.reviewers[i]);
          }
        }
        this.setState({
          reviewers: newReviewers
        });
      }
    });
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.props.toggleAddReviewerDialog}>
        <ModalHeader>{gettext('Request a review')}</ModalHeader>
        <ModalBody >
          <p>{gettext('Add new reviewer')}</p>
          <UserSelect
            placeholder={gettext('Please enter 1 or more character')}
            onSelectChange={this.handleSelectChange}
            ref="reviewSelect"
            isMulti={true}
            className='reviewer-select'
          />
          {this.state.errorMsg.length > 0 &&
            this.state.errorMsg.map((item, index = 0, arr) => {
              return (
                <p className="reviewer-select-error error" key={index}>{this.state.errorMsg[index].email}
                  {': '}{this.state.errorMsg[index].error_msg}</p>
              );
            })
          }
          { this.state.reviewers.length > 0 &&
            this.state.reviewers.map((item, index = 0, arr) => {
              return (
                <div className="reviewer-select-info" key={index}>
                  <div>
                    <img className="avatar reviewer-select-avatar" src={item.avatar_url} alt=""/>
                    <span className="reviewer-select-name">{item.user_name}</span>
                  </div>
                  <i className="fa fa-times" name={item.user_email} onClick={this.deleteReviewer}></i>
                </div>
              );
            })
          }
        </ModalBody>
        <ModalFooter>
          { this.state.loading ?
            <Button disabled><i className="fa fa-spinner" aria-hidden="true"></i></Button>
            :
            <Button color="primary" onClick={this.addReviewers}>{gettext('Submit')}</Button>
          }
          <Button color="secondary" onClick={this.props.toggleAddReviewerDialog}>
            {gettext('Close')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

AddReviewerDialog.propTypes = propTypes;

export default AddReviewerDialog;
