import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import UserSelect from '../../user-select';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  addMembers: PropTypes.func.isRequired
};

class SysAdminGroupAddMemberDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedOptions: null,
      isSubmitBtnDisabled: true
    };
    this.userSelect = React.createRef();
  }

  handleSelectChange = (options) => {
    this.setState({
      selectedOptions: options,
      isSubmitBtnDisabled: !options.length
    });
  };

  addMembers = () => {
    let emails = this.state.selectedOptions.map(item => item.email);
    this.props.addMembers(emails);
    this.props.toggle();
  };

  render() {
    const { isSubmitBtnDisabled } = this.state;
    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <SeahubModalHeader toggle={this.props.toggle}>{gettext('Add Member')}</SeahubModalHeader>
        <ModalBody>
          <UserSelect
            ref={this.userSelect}
            isMulti={true}
            placeholder={gettext('Search users')}
            onSelectChange={this.handleSelectChange}
          />
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.addMembers} disabled={isSubmitBtnDisabled}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SysAdminGroupAddMemberDialog.propTypes = propTypes;

export default SysAdminGroupAddMemberDialog;
