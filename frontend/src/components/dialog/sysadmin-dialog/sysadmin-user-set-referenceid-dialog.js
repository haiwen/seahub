
import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Form, FormGroup, Label, Input } from 'reactstrap';
import { gettext } from '../../../utils/constants';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  onReferenceIDChanged: PropTypes.func.isRequired
};

class SysAdminUserSetReferenceIDDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      referenceID: '',
      isSubmitBtnActive: false,
      errorMsg: '',
    };
  }

  toggle = () => {
    this.props.toggle();
  }

  handleReferenceIDChange = (e) => {
    this.setState({referenceID: e.target.value.trim()});
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
      e.preventDefault();
    }
  }

  handleSubmit = () => {
    let { referenceID } = this.state;
    this.props.onReferenceIDChanged(referenceID);
  }

  render() {
    let { referenceID } = this.state;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Set user Reference ID')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="repoName">{gettext('Name')}</Label>
              <Input 
                id="repoName"
                onKeyPress={this.handleKeyPress} 
                value={referenceID}
                onChange={this.handleReferenceIDChange}
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SysAdminUserSetReferenceIDDialog.propTypes = propTypes;

export default SysAdminUserSetReferenceIDDialog;
