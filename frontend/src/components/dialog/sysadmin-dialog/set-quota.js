import React from 'react';
import PropTypes from 'prop-types';
import { Alert, Modal, ModalHeader, ModalBody, ModalFooter, Button, Form, FormGroup, Input, InputGroup, InputGroupAddon, InputGroupText } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  updateQuota: PropTypes.func.isRequired
};

class SetQuotaDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      quota: '',
      isSubmitBtnActive: false
    };
  }

  toggle = () => {
    this.props.toggle();
  }

  handleQuotaChange = (e) => {
    const value = e.target.value;
    this.setState({
      quota: value,
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
    this.props.updateQuota(this.state.quota.trim());
    this.toggle();
  }

  render() {
    const { quota, isSubmitBtnActive } = this.state;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Set Quota')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <InputGroup>
                <Input
                  type="text"
                  className="form-control"
                  value={quota}
                  onKeyPress={this.handleKeyPress}
                  onChange={this.handleQuotaChange}
                />
                <InputGroupAddon addonType="append">
                  <InputGroupText>MB</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              <p className="small text-secondary mt-2 mb-2">
                {gettext('An integer that is greater than or equal to 0.')}
                <br />
                {gettext('Tip: 0 means default limit')}
              </p>
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

SetQuotaDialog.propTypes = propTypes;

export default SetQuotaDialog;
