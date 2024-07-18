import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Form, FormGroup, Input } from 'reactstrap';
import { gettext } from '../../../utils/constants';

const propTypes = {
  value: PropTypes.string.isRequired,
  dialogTitle: PropTypes.string.isRequired,
  updateValue: PropTypes.func.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class UpdateUser extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      value: this.props.value,
      isSubmitBtnActive: false
    };
  }

  handleInputChange = (e) => {
    const value = e.target.value;
    this.setState({
      value: value
    });
  };

  handleKeyDown = (e) => {
    if (e.key == 'Enter') {
      this.handleSubmit();
      e.preventDefault();
    }
  };

  handleSubmit = () => {
    this.props.updateValue(this.state.value.trim());
    this.props.toggleDialog();
  };

  render() {
    const { toggleDialog } = this.props;
    return (
      <Modal isOpen={true} toggle={toggleDialog}>
        <ModalHeader toggle={toggleDialog}>{this.props.dialogTitle}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Input
                type="text"
                value={this.state.value}
                onKeyDown={this.handleKeyDown}
                onChange={this.handleInputChange}
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

UpdateUser.propTypes = propTypes;

export default UpdateUser;
