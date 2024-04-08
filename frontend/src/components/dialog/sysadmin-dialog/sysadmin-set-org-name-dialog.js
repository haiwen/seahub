import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Form, FormGroup, Input } from 'reactstrap';
import { gettext } from '../../../utils/constants';

const propTypes = {
  name: PropTypes.string.isRequired,
  toggle: PropTypes.func.isRequired,
  updateName: PropTypes.func.isRequired
};

class SysAdminSetOrgNameDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      name: this.props.name,
      isSubmitBtnActive: false
    };
  }

  toggle = () => {
    this.props.toggle();
  };

  handleInputChange = (e) => {
    const value = e.target.value;
    this.setState({
      name: value,
      isSubmitBtnActive: value.trim() != ''
    });
  };

  handleKeyDown = (e) => {
    if (e.key == 'Enter') {
      this.handleSubmit();
      e.preventDefault();
    }
  };

  handleSubmit = () => {
    this.props.updateName(this.state.name.trim());
    this.toggle();
  };

  render() {
    const { name, isSubmitBtnActive } = this.state;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Set Name')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Input
                type="text"
                value={name}
                onKeyDown={this.handleKeyDown}
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

SysAdminSetOrgNameDialog.propTypes = propTypes;

export default SysAdminSetOrgNameDialog;
