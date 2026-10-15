import React from 'react';
import { Button, Modal, ModalBody, ModalFooter, Form, FormGroup, Input, FormText, Alert } from 'reactstrap';
import PropTypes from 'prop-types';
import SeahubModalHeader from '@/components/seahub-modal-header';
import { gettext } from '@/utils/constants';
import { Utils } from '@/utils/utils';

const MESSAGE_MAX_LENGTH = 512;

const propTypes = {
  toggle: PropTypes.func.isRequired,
  addNotification: PropTypes.func.isRequired
};

class SysAdminAddSysNotificationDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      value: '',
      isSubmitBtnActive: false,
      isSubmitting: false,
      errorMsg: ''
    };
  }

  handleChange = (e) => {
    const value = e.target.value;
    this.setState({
      value: value,
      isSubmitBtnActive: value.trim() != '',
      errorMsg: ''
    });
  };

  handleSubmit = () => {
    this.setState({ isSubmitting: true, errorMsg: '' });
    this.props.addNotification(this.state.value.trim()).then(() => {
      this.toggle();
    }).catch((error) => {
      this.setState({
        isSubmitting: false,
        errorMsg: Utils.getErrorMsg(error)
      });
    });
  };

  toggle = () => {
    this.props.toggle();
  };

  render() {
    const { value, isSubmitBtnActive, isSubmitting, errorMsg } = this.state;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <SeahubModalHeader toggle={this.toggle}>{gettext('Add new notification')}</SeahubModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Input
                type="textarea"
                value={value}
                onChange={this.handleChange}
                maxLength={MESSAGE_MAX_LENGTH}
                disabled={isSubmitting}
              />
              <FormText color="muted" className="text-right">{value.length}/{MESSAGE_MAX_LENGTH}</FormText>
            </FormGroup>
            {errorMsg && <Alert color="danger">{errorMsg}</Alert>}
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit} disabled={!isSubmitBtnActive || isSubmitting}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SysAdminAddSysNotificationDialog.propTypes = propTypes;

export default SysAdminAddSysNotificationDialog;
