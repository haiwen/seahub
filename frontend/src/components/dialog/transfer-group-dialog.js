import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter } from 'reactstrap';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import UserSelect from '../user-select';
import { Utils } from '../../utils/utils';
import toaster from '../toast';

import '../../css/transfer-group-dialog.css';

const propTypes = {
  groupID: PropTypes.string,
  toggleTransferGroupDialog: PropTypes.func.isRequired,
  onGroupChanged: PropTypes.func.isRequired
};

class TransferGroupDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null,
      errMessage: '',
    };
    this.options = [];
    this.userSelect = React.createRef();
  }

  handleSelectChange = (option) => {
    this.setState({
      selectedOption: option,
      errMessage: '',
    });
    this.options = [];
  };

  transferGroup = () => {
    let selectedOption = this.state.selectedOption;
    let email;
    if (selectedOption && selectedOption[0]) {
      email = selectedOption[0].email;
    }
    if (email) {
      seafileAPI.transferGroup(this.props.groupID, email).then((res) => {
        this.props.toggleTransferGroupDialog();
        toaster.success(gettext('Group has been transfered'));
      }).catch((error) => {
        let errMessage = Utils.getErrorMsg(error);
        this.setState({ errMessage: errMessage });
      });
    }
  };

  toggle = () => {
    this.props.toggleTransferGroupDialog();
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <SeahubModalHeader toggle={this.toggle}>{gettext('Transfer Group')}</SeahubModalHeader>
        <ModalBody>
          <p>{gettext('Transfer group to')}</p>
          <UserSelect
            ref={this.userSelect}
            isMulti={false}
            placeholder={gettext('Please enter 1 or more character')}
            onSelectChange={this.handleSelectChange}
          />
          <div className="error">{this.state.errMessage}</div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Close')}</Button>
          <Button color="primary" onClick={this.transferGroup}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

TransferGroupDialog.propTypes = propTypes;

export default TransferGroupDialog;
