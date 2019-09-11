import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import UserSelect from '../../user-select';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired
};

class SysAdminGroupAddMemberDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null,
      errorMsg: [],
    };
  }

  handleSelectChange = (option) => {
    this.setState({selectedOption: option});
  }

  submit = () => {
    let receiver = this.state.selectedOption;
    this.props.submit(receiver);
  } 

  render() {
    let message = gettext('Add Member');
    return (
      <Modal isOpen={true}>
        <ModalHeader toggle={this.props.toggle}>
          <div dangerouslySetInnerHTML={{__html:message}} />
        </ModalHeader>
        <ModalBody>
          <UserSelect
            ref="userSelect"
            isMulti={true}
            className="reviewer-select"
            placeholder={gettext('Search users')}
            onSelectChange={this.handleSelectChange}
          /> 
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.submit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SysAdminGroupAddMemberDialog.propTypes = propTypes;

export default SysAdminGroupAddMemberDialog;
