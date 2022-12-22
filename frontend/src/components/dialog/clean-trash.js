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
  refreshTrash: PropTypes.func.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class CleanTrash extends React.Component {
  constructor(props) {
    super(props);
    this.options = [
      {label: gettext('3 days ago'), value: 3},
      {label: gettext('1 week ago'), value: 7},
      {label: gettext('1 month ago'), value: 30},
      {label: gettext('all'), value: 0}
    ];
    this.state = {
      inputValue: this.options[0],
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
    const { repoID } = this.props;

    this.setState({
      submitBtnDisabled: true
    });

    seafileAPI.deleteRepoTrash(repoID, inputValue.value).then((res) => {
      toaster.success(gettext('Clean succeeded.'));
      this.props.refreshTrash();
      this.props.toggleDialog();
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
        <ModalHeader toggle={this.props.toggleDialog}>{gettext('Clean')}</ModalHeader>
        <ModalBody>
          <React.Fragment>
            <p>{gettext('Clear files in trash and history：')}</p>
            <CreatableSelect
              defaultValue={this.options[0]}
              options={this.options}
              autoFocus={false}
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

CleanTrash.propTypes = propTypes;

export default CleanTrash;
