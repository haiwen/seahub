import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalFooter, InputGroup, InputGroupText } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { orgAdminAPI } from '../../utils/org-admin-api';
import { Utils } from '../../utils/utils';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  orgID: PropTypes.string,
  userDefaultQuota: PropTypes.number.isRequired,
  updateQuota: PropTypes.func.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class SetOrgUserDefaultQuota extends React.Component {

  constructor(props) {
    super(props);
    const initialQuota = this.props.userDefaultQuota < 0 ? '' : this.props.userDefaultQuota / (1000 * 1000);
    this.state = {
      inputValue: initialQuota,
      submitBtnDisabled: false
    };
  }

  handleInputChange = (e) => {
    this.setState({
      inputValue: e.target.value
    });
  };

  formSubmit = () => {
    const { orgID } = this.props;
    const quota = this.state.inputValue.trim();

    if (!quota) {
      this.setState({
        formErrorMsg: gettext('It is required.')
      });
      return false;
    }

    this.setState({
      submitBtnDisabled: true
    });

    orgAdminAPI.orgAdminSetOrgUserDefaultQuota(orgID, quota).then((res) => {
      this.props.updateQuota(res.data.user_default_quota);
      this.props.toggleDialog();
    }).catch((error) => {
      let errorMsg = Utils.getErrorMsg(error);
      this.setState({
        formErrorMsg: errorMsg,
        submitBtnDisabled: false
      });
    });
  };

  render() {
    const { inputValue, formErrorMsg, submitBtnDisabled } = this.state;
    return (
      <Modal isOpen={true} centered={true} toggle={this.props.toggleDialog}>
        <SeahubModalHeader toggle={this.props.toggleDialog}>{gettext('Set user default quota')}</SeahubModalHeader>
        <ModalBody>
          <React.Fragment>
            <InputGroup>
              <input type="text" className="form-control" value={inputValue} onChange={this.handleInputChange} />
              <InputGroupText>MB</InputGroupText>
            </InputGroup>
            <p className="small text-secondary mt-2 mb-2">{gettext('Tip: 0 means default limit')}</p>
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

SetOrgUserDefaultQuota.propTypes = propTypes;

export default SetOrgUserDefaultQuota;
