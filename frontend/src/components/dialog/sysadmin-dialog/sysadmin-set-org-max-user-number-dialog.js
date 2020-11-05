import React from 'react';
import PropTypes from 'prop-types';
import { Alert, Modal, ModalHeader, ModalBody, ModalFooter, Button, Form, FormGroup, Input, InputGroup, InputGroupAddon, InputGroupText } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  updateValue: PropTypes.func.isRequired
};

class SysAdminSetOrgMaxUserNumberDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      value: this.props.value,
      isSubmitBtnActive: false
    };
  }

  toggle = () => {
    this.props.toggle();
  }

  handleInputChange = (e) => {
    const value = e.target.value;
    this.setState({
      value: value,
      isSubmitBtnActive: value.trim() != ''
    });
  }

  handleKeyPress = (e) => {
    if (e.key == 'Enter') {
      this.handleSubmit();
      e.preventDefault();
    }
  }

  handleSubmit = () => {
    this.props.updateValue(this.state.value.trim());
    this.toggle();
  }

  render() {
    const { value, isSubmitBtnActive } = this.state;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Set max number of members')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Input
                type="text"
                className="form-control"
                value={value}
                onKeyPress={this.handleKeyPress}
                onChange={this.handleInputChange}
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit} disabled={!isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SysAdminSetOrgMaxUserNumberDialog.propTypes = propTypes;

export default SysAdminSetOrgMaxUserNumberDialog;
