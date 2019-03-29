import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Input, InputGroupAddon, InputGroup } from 'reactstrap';
import { gettext, orgID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  groupID: PropTypes.number.isRequired,
  onDepartChanged: PropTypes.func.isRequired,
};

class SetGroupQuotaDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      quota: '',
      errMessage: '',
      invalid: false,
    };
  }

  setGroupQuota = () => {
    let quota = this.state.quota == -2 ? this.state.quota : this.state.quota * 1000000;
    seafileAPI.orgAdminSetGroupQuota(orgID, this.props.groupID, quota).then((res) => {
      this.props.toggle();
      this.props.onDepartChanged();
    });
  }

  handleChange = (e) => {
    const quota = e.target.value.trim();
    this.setState({
      quota: quota
    });
    const myReg = /^[1-9]\d*$/im;
    if ((quota.length && myReg.test(quota)) || quota == -2) {
      this.setState({ invalid: true });
    } else {
      this.setState({ invalid: false });
    }
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter' && this.state.invalid) {
      this.setGroupQuota();
      e.preventDefault();
    }
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <ModalHeader toggle={this.props.toggle}>{gettext('Set Quota')}</ModalHeader>
        <ModalBody>
          <InputGroup>
            <Input
              onKeyPress={this.handleKeyPress} 
              value={this.state.quota} 
              onChange={this.handleChange}
            />
            <InputGroupAddon addonType="append">{'MB'}</InputGroupAddon>
          </InputGroup>
          <p>{gettext('An integer that is greater than 0 or equal to -2.')}</p>
          <p>{gettext('Tip: -2 means no limit.')}</p>
          { this.state.errMessage && <p className="error">{this.state.errMessage}</p> }
        </ModalBody>
        <ModalFooter>
          {this.state.invalid ? 
            <Button color="primary" onClick={this.setGroupQuota}>{gettext('Submit')}</Button>
            : <Button color="primary" disabled>{gettext('Submit')}</Button>
          }
        </ModalFooter>
      </Modal>
    );
  }
}

SetGroupQuotaDialog.propTypes = propTypes;

export default SetGroupQuotaDialog;
