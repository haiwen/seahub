import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api.js';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
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
      this.setState({ reviewers: res.data.reviewers });
    });
  }

  handleSelectChange = (option) => {
    this.setState({ selectedOption: option });
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
          this.setState({ errorMsg: errorMsg });
        }
        this.setState({
          selectedOption: null,
          loading: false
        });
        if (res.data.success.length > 0) {
          this.listReviewers();
        }
      }).catch(error => {
        let errorMsg = Utils.getErrorMsg(error);
        toaster.danger(errorMsg);
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
        this.setState({ reviewers: newReviewers });
      }
    }).catch(error => {
      let errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }

  render() {
    const toggleDialog = this.props.toggleAddReviewerDialog;
    const { reviewers, errorMsg } = this.state;
    return (
      <Modal isOpen={true} toggle={toggleDialog}>
        <ModalHeader toggle={toggleDialog}>{gettext('Request a review')}</ModalHeader>
        <ModalBody>
          <p>{gettext('Add new reviewer')}</p>
          <div className='add-reviewer'>
            <UserSelect
              placeholder={gettext('Search users...')}
              onSelectChange={this.handleSelectChange}
              ref="reviewSelect"
              isMulti={true}
              className='reviewer-select'
            />
            {(this.state.selectedOption && !this.state.loading)?
              <Button color="secondary" onClick={this.addReviewers}>{gettext('Submit')}</Button> :
              <Button color="secondary" disabled>{gettext('Submit')}</Button>
            }
          </div>
          {errorMsg.length > 0 &&
            errorMsg.map((item, index = 0, arr) => {
              return (
                <p className="reviewer-select-error error" key={index}>{errorMsg[index].email}
                  {': '}{errorMsg[index].error_msg}</p>
              );
            })
          }
          {reviewers.length > 0 &&
            reviewers.map((item, index = 0, arr) => {
              return (
                <div className="reviewer-select-info" key={index}>
                  <div className="d-flex">
                    <img className="avatar reviewer-select-avatar" src={item.avatar_url} alt=""/>
                    <span className="reviewer-select-name ellipsis">{item.user_name}</span>
                  </div>
                  <i className="fa fa-times" name={item.user_email} onClick={this.deleteReviewer}></i>
                </div>
              );
            })
          }
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleDialog}>{gettext('Close')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

AddReviewerDialog.propTypes = propTypes;

export default AddReviewerDialog;
