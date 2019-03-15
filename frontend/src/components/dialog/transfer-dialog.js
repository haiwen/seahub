import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../utils/constants';
import UserSelect from '../user-select';

const propTypes = {
  itemName: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired,
};

class TransferDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null,
      errorMsg: [],
      sharedItems: []
    };
    this.options = [];
  }

  handleSelectChange = (option) => {
    this.setState({selectedOption: option});
    this.options = [];
  }

  submit = () => {
    let user = this.state.selectedOption;
    this.props.submit(user);
  } 

  render() {
    const itemName = this.props.itemName;
    const innerSpan = '<span class="op-target" title=' + itemName + '>' + itemName +'</span>';
    let msg = gettext('Transfer Library {library_name} To');
    let message = msg.replace('{library_name}', innerSpan);
    return (
      <Modal isOpen={true} centered={true}>
        <ModalHeader toggle={this.props.toggleDialog}>
          <div dangerouslySetInnerHTML={{__html:message}} />
        </ModalHeader>
        <ModalBody>
          <UserSelect
            ref="userSelect"
            isMulti={false}
            className="reviewer-select"
            placeholder={gettext('Please enter 1 or more character')}
            onSelectChange={this.handleSelectChange}
          />
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.submit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

TransferDialog.propTypes = propTypes;

export default TransferDialog;
