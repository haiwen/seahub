import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import UserSelect from '../../user-select';

const propTypes = {
  groupName: PropTypes.string.isRequired,
  toggle: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired,
};

class SysAdminGroupTransferDialog extends React.Component {

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
    const groupName = this.props.groupName;
    const innerSpan = '<span class="op-target" title=' + groupName + '>' + groupName +'</span>';
    let msg = gettext('Transfer Group {library_name} to');
    let message = msg.replace('{library_name}', innerSpan);
    return (
      <Modal isOpen={true}>
        <ModalHeader toggle={this.props.toggle}>
          <div dangerouslySetInnerHTML={{__html: message}} />
        </ModalHeader>
        <ModalBody>
          <UserSelect
            ref="userSelect"
            isMulti={false}
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

SysAdminGroupTransferDialog.propTypes = propTypes;

export default SysAdminGroupTransferDialog;
