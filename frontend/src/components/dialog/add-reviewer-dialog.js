import React from 'react';
import Select from 'react-select';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api.js';
import '../../css/add-reviewer-dialog.css';

class AddReviewerDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      reviewers: [],
      avatar: [],
      selectedOption: null,
      errorMsg: [],
      options: [],
    };
  }
    
  listReviewers = () => {
    seafileAPI.listReviewers(this.props.reviewID).then((res) => {
      this.setState({
        reviewers: res.data.reviewers
      });
      let array = [];
      for (let i = 0; i < this.state.reviewers.length ; i ++) {
        seafileAPI.getUserAvatar(this.state.reviewers[i].name, 80).then((res) => {
          array.push(res.data.url);
          this.setState({
            avatar: array
          });
        });
      }
    });
  }

  handleKeyUp = (e) => {
    this.setState({
      options: []
    });
    if (e.target.value.trim().length > 0) {
      let value = encodeURIComponent(e.target.value.trim());
      seafileAPI.searchUsers(value).then((res) => {
        let options = [];
        for (let i = 0 ; i < res.data.users.length; i ++) {
          let obj = {};
          obj.value = res.data.users[i].name;
          obj.email = res.data.users[i].email;
          obj.label = 
            <div>
              <img src={res.data.users[i].avatar_url} className="avatar reviewer-select-avatar" alt=""/>
              <span className='reviewer-select-name'>{res.data.users[i].name}</span>
            </div>;
          options.push(obj);
        }
        this.setState({
          options: options
        });
      });
    }
  }

  handleSelectChange = (option) => {
    this.setState({
      selectedOption: option,
      options: [],
    });
  }

  addReviewers = () => {
    if (this.state.selectedOption.length > 0 ) {
      let reviewersArray = [];
      for (let i = 0; i < this.state.selectedOption.length; i ++) {
        reviewersArray[i] = this.state.selectedOption[i].email;
      }
      seafileAPI.addReviewers(this.props.reviewID, reviewersArray).then((res) => {
        if (res.data.failed.length > 0) {
          let errorMsg = [];
          for (let i = 0 ; i < res.data.failed.length ; i++) {
            errorMsg[i] = res.data.failed[i];
          }
          this.setState({
            errorMsg: errorMsg
          });
          let that = this;
          setTimeout(() => {
            that.setState({
              errorMsg: []
            });
          }, 3000);
        }
        this.setState({
          selectedOption: null
        });
        if (res.data.success.length > 0) {
          this.listReviewers();
        }
      });
    }
  }

  componentWillMount() {
    this.listReviewers();
  }

  render() {
    let isMulti = true;
    return (
      <Modal isOpen={this.props.showReviewerDialog}>
        <ModalHeader>{gettext('Request a review')}</ModalHeader>
        <ModalBody onKeyUp={this.handleKeyUp}>
          <p>{gettext('Add new reviewer')}</p>
          <Select
            value={this.state.selectedOption}
            onChange={this.handleSelectChange}
            placeholder={gettext('Please enter 1 or more character')}
            options={this.state.options}
            isMulti= {isMulti}
            className='reviewer-select'
          />
          {this.state.errorMsg.length > 0 &&
            this.state.errorMsg.map((item, index = 0, arr) => {
              return (
                <p className="error" key={index}>{this.state.errorMsg[index].error_msg}</p>
              );
            })
          }
          { this.state.reviewers.length > 0 &&
            this.state.reviewers.map((item, index = 0, arr) => {
              return (
                <div className="reviewer-select-info" key={index}>
                  <img className="avatar reviewer-select-avatar" src={this.state.avatar[index]} alt=""/>
                  <span className="reviewer-select-name">{item.nickname}</span>
                </div>
              );
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

const propTypes = {
  showReviewerDialog: PropTypes.bool.isRequired,
  reviewID: PropTypes.string.isRequired,
  toggleAddReviewerDialog: PropTypes.func.isRequired
};

AddReviewerDialog.propTypes = propTypes;

export default AddReviewerDialog;
