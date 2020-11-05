import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Input } from 'reactstrap';
import { gettext } from '../../../utils/constants';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  addInstitution: PropTypes.func.isRequired
};

class SysAdminAddInstitutionDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      value: '',
      isSubmitBtnActive: false
    };
  }

  handleChange = (e) => {
    const value = e.target.value;
    this.setState({
      value: value,
      isSubmitBtnActive: value.trim() != ''
    });
  }

  handleSubmit = () => {
    this.toggle();
    this.props.addInstitution(this.state.value.trim());
  }

  toggle = () => {
    this.props.toggle();
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Add institution')}</ModalHeader>
        <ModalBody>
          <Form>
            <p>{gettext('Name')}</p>
            <FormGroup>
              <Input
                value={this.state.value}
                onChange={this.handleChange}
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.handleSubmit} disabled={!this.state.isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SysAdminAddInstitutionDialog.propTypes = propTypes;

export default SysAdminAddInstitutionDialog;
