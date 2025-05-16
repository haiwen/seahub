import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter } from 'reactstrap';
import toaster from '../../../components/toast';
import { gettext } from '../../../utils/constants';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { orgAdminAPI } from '../../../utils/org-admin-api';
import { Utils } from '../../../utils/utils';
import UserSelect from '../../user-select';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

export default class AddDepartMemberV2Dialog extends React.Component {

  static propTypes = {
    toggle: PropTypes.func.isRequired,
    nodeId: PropTypes.number.isRequired,
    onMemberChanged: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      selectedUsers: [],
      errMsgs: '',
    };
  }

  handleSelectChange = (options) => {
    this.setState({ selectedUsers: options });
  };

  handleSubmit = () => {
    const emails = this.state.selectedUsers.map(option => option.email);
    if (emails.length === 0) return;
    this.setState({ errMessage: '' });
    const { nodeId, orgID } = this.props;
    const req = orgID ?
      orgAdminAPI.orgAdminAddGroupMember(orgID, nodeId, emails) :
      systemAdminAPI.sysAdminAddGroupMember(nodeId, emails);
    req.then((res) => {
      this.setState({ selectedUsers: [] });
      if (res.data.failed.length > 0) {
        this.setState({ errMsgs: res.data.failed.map(item => item.error_msg) });
      }
      if (res.data.success.length > 0) {
        this.props.onMemberChanged();
        this.props.toggle();
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const { errMsgs } = this.state;
    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <SeahubModalHeader toggle={this.props.toggle}>{gettext('Add members')}</SeahubModalHeader>
        <ModalBody>
          <UserSelect
            placeholder={gettext('Search users')}
            onSelectChange={this.handleSelectChange}
            isMulti={true}
            selectedUsers={this.state.selectedUsers}
          />
          {errMsgs.length > 0 && (
            <ul className="list-unstyled">
              {errMsgs.map((item, index) => {
                return <li key={index} className="error mt-2">{item}</li>;
              })}
            </ul>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}
