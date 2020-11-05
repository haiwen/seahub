import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';

const propTypes = {
  orgID: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  contactEmail: PropTypes.string.isRequired,
  updateContactEmail: PropTypes.func.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class SetOrgUserContactEmail extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      inputValue: this.props.contactEmail,
      submitBtnDisabled: false
    };
  }

  handleInputChange = (e) => {
    this.setState({
      inputValue: e.target.value
    });
  }

  formSubmit = () => {
    const { orgID, email } = this.props;
    const contactEmail = this.state.inputValue.trim();

    this.setState({
      submitBtnDisabled: true
    });

    seafileAPI.orgAdminSetOrgUserContactEmail(orgID, email, contactEmail).then((res) => {
      const newContactEmail = contactEmail ? res.data.contact_email : '';
      this.props.updateContactEmail(newContactEmail);
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
    const { inputValue, formErrorMsg, submitBtnDisabled } = this.state;
    return (
      <Modal isOpen={true} centered={true} toggle={this.props.toggleDialog}>
        <ModalHeader toggle={this.props.toggleDialog}>{gettext('Set user contact email')}</ModalHeader>
        <ModalBody>
          <React.Fragment>
            <input type="text" className="form-control" value={inputValue} onChange={this.handleInputChange} />
            {formErrorMsg && <p className="error m-0 mt-2">{formErrorMsg}</p>}
          </React.Fragment>
        </ModalBody>
        <ModalFooter>
          <button className="btn btn-secondary" onClick={this.props.toggleDialog}>{gettext('Cancel')}</button>
          <button className="btn btn-primary" disabled={submitBtnDisabled} onClick={this.formSubmit}>{gettext('Submit')}</button>
        </ModalFooter>
      </Modal>
    );
  }
}

SetOrgUserContactEmail.propTypes = propTypes;

export default SetOrgUserContactEmail;
