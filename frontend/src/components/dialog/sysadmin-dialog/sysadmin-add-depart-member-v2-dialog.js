import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { Utils } from '../../../utils/utils';
import UserSelect from '../../user-select';

export default class AddDepartMemberV2Dialog extends React.Component {

  static propTypes = {
    toggle: PropTypes.func.isRequired,
    nodeId: PropTypes.number.isRequired,
    onMemberChanged: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      selectedOptions: [],
      errMessage: '',
    };
  }

  handleSelectChange = (options) => {
    this.setState({ selectedOptions: options });
  };

  handleSubmit = () => {
    const emails = this.state.selectedOptions.map(option => option.email);
    if (emails.length === 0) return;
    this.setState({ errMessage: '' });
    systemAdminAPI.sysAdminAddGroupMember(this.props.nodeId, emails).then((res) => {
      this.setState({ selectedOptions: [] });
      if (res.data.failed.length > 0) {
        this.setState({ errMessage: res.data.failed[0].error_msg });
      }
      if (res.data.success.length > 0) {
        this.props.onMemberChanged();
        this.props.toggle();
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      this.setState({ errMessage });
    });
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <ModalHeader toggle={this.props.toggle}>{gettext('Add member')}</ModalHeader>
        <ModalBody>
          <UserSelect
            placeholder={gettext('Search users')}
            onSelectChange={this.handleSelectChange}
            isMulti={true}
          />
          {this.state.errMessage && <p className="error mt-2">{this.state.errMessage}</p> }
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}
