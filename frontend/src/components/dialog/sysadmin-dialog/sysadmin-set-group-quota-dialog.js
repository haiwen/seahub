import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter, Input, InputGroupAddon, InputGroup } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  group: PropTypes.object.isRequired,
  onSetQuota: PropTypes.func.isRequired,
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
    const numberReg = /^[1-9]\d*$/im;
    let quota = this.state.quota;
    if ((quota.length && numberReg.test(quota)) || quota == -2) {
      this.setState({ errMessage: '' });
      let newQuota = this.state.quota == -2 ? this.state.quota : this.state.quota * 1000000;
      systemAdminAPI.sysAdminUpdateDepartmentQuota(this.props.group.id, newQuota).then((res) => {
        this.props.toggle();
        this.props.onSetQuota(res.data);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else {
      const err = gettext('Quota is invalid.');
      this.setState({ errMessage: err });
    }
  };

  handleChange = (e) => {
    const quota = e.target.value.trim();
    this.setState({ quota: quota });
  };

  handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      this.setGroupQuota();
      e.preventDefault();
    }
  };

  render() {
    const group = this.props.group;
    const oldQuota = Utils.bytesToSize(group.quota);
    const message = gettext('The current quota for {group_name} is {quota}').replace('{group_name}', group.name).replace('{quota}', oldQuota);
    return (
      <Modal isOpen={true} toggle={this.props.toggle} autoFocus={false}>
        <SeahubModalHeader toggle={this.props.toggle}>{gettext('Set Quota')}</SeahubModalHeader>
        <ModalBody>
          <p>{message}</p>
          <p>{gettext('Please enter a new quota')}</p>
          <InputGroup>
            <Input
              onKeyDown={this.handleKeyDown}
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
          {this.state.errMessage && <p className="error">{this.state.errMessage}</p>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.setGroupQuota}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SetGroupQuotaDialog.propTypes = propTypes;

export default SetGroupQuotaDialog;
