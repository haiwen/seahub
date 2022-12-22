import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import CreatableSelect from 'react-select/creatable';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import Loading from '../loading';
import toaster from '../toast';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class LabelRepoStateDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      existingLabels: null,
      errorMsg: '',
      submitBtnDisabled: false
    };
  }

  componentDidMount() {
    seafileAPI.getAllRepoSnapshotLabels().then((res) => {
      this.setState({
        isLoading: false,
        existingLabels: res.data,
        errorMsg: ''
      });
    }).catch((error) => {
      let errorMsg = Utils.getErrorMsg(error);
      this.setState({
        isLoading: false,
        errorMsg: errorMsg
      });
    });
  }

  handleInputChange = (value) => {
    this.setState({
      inputValue: value
    });
  }

  formSubmit = () => {
    const inputValue = this.state.inputValue;

    if (!inputValue || !inputValue.length) { // undefined or []
      this.setState({
        formErrorMsg: gettext('It is required.')
      });
      return;
    }

    this.setState({
      submitBtnDisabled: true
    });

    const {repoID, repoName} = this.props;
    const labels = inputValue.map((item, index) => item.value).join(',');
    seafileAPI.addNewRepoLabels(repoID, labels).then((res) => {
      const msg = gettext('Successfully added label(s) for library {placeholder}').replace('{placeholder}', repoName);
      toaster.success(msg);
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
    return (
      <Modal isOpen={true} toggle={this.props.toggleDialog}>
        <ModalHeader toggle={this.props.toggleDialog}>{gettext('Label Current State')}</ModalHeader>
        <ModalBody>
          <Content data={this.state} handleChange={this.handleInputChange} />
        </ModalBody>
        {this.state.existingLabels && (
          <ModalFooter>
            <button className="btn btn-secondary" onClick={this.props.toggleDialog}>{gettext('Cancel')}</button>
            <button className="btn btn-primary" disabled={this.state.submitBtnDisabled} onClick={this.formSubmit}>{gettext('Submit')}</button>
          </ModalFooter>
        )}
      </Modal>
    );
  }
}

class Content extends React.Component {

  render() {
    const { isLoading, errorMsg, existingLabels, formErrorMsg } = this.props.data;

    if (isLoading) {
      return <Loading />;
    }

    if (errorMsg) {
      return <p className="error mt-4 text-center">{errorMsg}</p>;
    }

    return (
      <React.Fragment>
        <CreatableSelect
          isMulti={true}
          onChange={this.props.handleChange}
          placeholder=''
          options={existingLabels.map((item, index) => { return {label: item, value: item}; })}
        />
        {formErrorMsg && <p className="error m-0 mt-2">{formErrorMsg}</p>}
      </React.Fragment>
    );
  }
}

LabelRepoStateDialog.propTypes = propTypes;

export default LabelRepoStateDialog;
