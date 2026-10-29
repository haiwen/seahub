import React from 'react';
import { Modal, ModalBody, ModalFooter, Button, Form, FormGroup, Input } from 'reactstrap';
import PropTypes from 'prop-types';
import SeahubModalHeader from '@/components/seahub-modal-header';
import { gettext } from '@/utils/constants';
import { Utils } from '@/utils/utils';

class SysAdminSetOrgAICreditDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      value: String(props.value),
      isSubmitting: false,
      errorMsg: ''
    };
  }

  toggle = () => {
    if (!this.state.isSubmitting) {
      this.props.toggle();
    }
  };

  handleInputChange = (event) => {
    this.setState({ value: event.target.value, errorMsg: '' });
  };

  handleSubmit = (event) => {
    event.preventDefault();
    if (this.state.isSubmitting) {
      return;
    }

    const value = this.state.value.trim();
    const balance = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(balance)) {
      this.setState({ errorMsg: gettext('Please enter a non-negative integer') });
      return;
    }

    this.setState({ isSubmitting: true, errorMsg: '' });
    return this.props.updateValue(balance).then(() => {
      this.props.toggle();
    }).catch(error => {
      this.setState({ isSubmitting: false, errorMsg: Utils.getErrorMsg(error) });
    });
  };

  render() {
    const { value, isSubmitting, errorMsg } = this.state;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <SeahubModalHeader toggle={this.toggle}>{gettext('Set organization AI credits')}</SeahubModalHeader>
        <Form onSubmit={this.handleSubmit}>
          <ModalBody>
            <FormGroup>
              <Input
                type="text"
                inputMode="numeric"
                aria-label={gettext('Additional AI credits')}
                value={value}
                onChange={this.handleInputChange}
                disabled={isSubmitting}
                autoFocus
              />
            </FormGroup>
            {errorMsg && <p className="error">{errorMsg}</p>}
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" type="button" onClick={this.toggle} disabled={isSubmitting}>{gettext('Cancel')}</Button>
            <Button color="primary" type="submit" disabled={isSubmitting || !value.trim()}>{gettext('Submit')}</Button>
          </ModalFooter>
        </Form>
      </Modal>
    );
  }
}

SysAdminSetOrgAICreditDialog.propTypes = {
  value: PropTypes.number.isRequired,
  updateValue: PropTypes.func.isRequired,
  toggle: PropTypes.func.isRequired
};

export default SysAdminSetOrgAICreditDialog;
