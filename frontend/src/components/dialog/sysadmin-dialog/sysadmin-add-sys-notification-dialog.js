import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup } from 'reactstrap';
import { gettext } from '../../../utils/constants';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  addNotification: PropTypes.func.isRequired,
};

class SysAdminAddSysNotificationDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      value: '',
      isSubmitBtnActive: false,
    };
  }

  handleChange = (e) => {
    if (!e.target.value.trim()) {
      this.setState({isSubmitBtnActive: false});
    } else {
      this.setState({isSubmitBtnActive: true});
    }

    this.setState({value: e.target.value}) ;
  }

  handleSubmit = () => {
    if (!this.state.isSubmitBtnActive) {
      return;
    }
    this.props.addNotification(this.state.value);
    this.toggle();
  }

  toggle = () => {
    this.props.toggle();
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Add new notification')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <textarea 
                style={{width:'450px'}}
                value={this.state.value}
                onChange={this.handleChange}
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit} disabled={!this.state.isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SysAdminAddSysNotificationDialog.propTypes = propTypes;

export default SysAdminAddSysNotificationDialog;
