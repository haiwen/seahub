import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Input, InputGroupAddon, InputGroup } from 'reactstrap';
import { gettext, orgID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';

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
    };
  }

  setGroupQuota = () => {
    const myReg = /^[1-9]\d*$/im;
    let quota = this.state.quota;
    if ((quota.length && myReg.test(quota)) || quota == -2) {
      this.setState({ errMessage: '' });
      let newQuota = this.state.quota == -2 ? this.state.quota : this.state.quota * 1000000;
      seafileAPI.orgAdminSetGroupQuota(orgID, this.props.groupID, newQuota).then((res) => {
        this.props.toggle();
        this.props.onDepartChanged();
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else {
      const err = gettext('Quota is invalid.');
      this.setState({ errMessage: err });
    }
  }

  handleChange = (e) => {
    const quota = e.target.value.trim();
    this.setState({ quota: quota });
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.setGroupQuota();
      e.preventDefault();
    }
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.props.toggle} autoFocus={false}>
        <ModalHeader toggle={this.props.toggle}>{gettext('Set Quota')}</ModalHeader>
        <ModalBody>
          <InputGroup>
            <Input
              onKeyPress={this.handleKeyPress}
              value={this.state.quota}
              onChange={this.handleChange}
              autoFocus={true}
            />
            <InputGroupAddon addonType="append">{'MB'}</InputGroupAddon>
          </InputGroup>
          <p className="tip">
            <br/><span>{gettext('An integer that is greater than 0 or equal to -2.')}</span><br/>
            <span>{gettext('Tip: -2 means no limit.')}</span>
          </p>
          { this.state.errMessage && <p className="error">{this.state.errMessage}</p> }
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.setGroupQuota}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SetGroupQuotaDialog.propTypes = propTypes;

export default SetGroupQuotaDialog;
