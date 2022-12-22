import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import CreatableSelect from 'react-select/creatable';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  commitID: PropTypes.string.isRequired,
  commitLabels: PropTypes.array.isRequired,
  updateCommitLabels: PropTypes.func.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class UpdateRepoCommitLabels extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      inputValue: this.props.commitLabels.map((item, index) => {
        return {label: item, value: item};
      }),
      submitBtnDisabled: false
    };
  }

  handleInputChange = (value) => {
    this.setState({
      inputValue: value
    });
  }

  formSubmit = () => {
    const inputValue = this.state.inputValue;
    const labels = inputValue.map((item, index) => item.value).join(',');
    const {repoID, commitID} = this.props;

    this.setState({
      submitBtnDisabled: true
    });

    seafileAPI.updateRepoCommitLabels(repoID, commitID, labels).then((res) => {
      this.props.updateCommitLabels(res.data.revisionTags.map((item, index) => item.tag));
      this.props.toggleDialog();
      toaster.success(gettext('Successfully edited labels.'));
    }).catch((error) => {
      let errorMsg = Utils.getErrorMsg(error);
      this.setState({
        formErrorMsg: errorMsg,
        submitBtnDisabled: false
      });
    });
  }

  render() {
    const { formErrorMsg } = this.state;
    return (
      <Modal isOpen={true} centered={true} toggle={this.props.toggleDialog}>
        <ModalHeader toggle={this.props.toggleDialog}>{gettext('Edit labels')}</ModalHeader>
        <ModalBody>
          <React.Fragment>
            <CreatableSelect
              defaultValue={this.props.commitLabels.map((item, index) => { return {label: item, value: item}; })}
              isMulti={true}
              onChange={this.handleInputChange}
              placeholder=''
            />
            {formErrorMsg && <p className="error m-0 mt-2">{formErrorMsg}</p>}
          </React.Fragment>
        </ModalBody>
        <ModalFooter>
          <button className="btn btn-primary" disabled={this.state.submitBtnDisabled} onClick={this.formSubmit}>{gettext('Submit')}</button>
        </ModalFooter>
      </Modal>
    );
  }
}

UpdateRepoCommitLabels.propTypes = propTypes;

export default UpdateRepoCommitLabels;
