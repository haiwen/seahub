import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalFooter, Button, Form, FormGroup, Input, InputGroup, InputGroupText } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  updateMonthlyDownloadTrafficLimit: PropTypes.func.isRequired
};

class SysAdminSetOrgMonthlyDownloadTrafficLimitDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      traffic: '',
      isSubmitBtnActive: false
    };
  }

  toggle = () => {
    this.props.toggle();
  };

  handleTrafficChange = (e) => {
    const value = e.target.value;
    this.setState({
      traffic: value,
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
    this.props.updateMonthlyDownloadTrafficLimit(this.state.traffic.trim());
    this.toggle();
  };

  handleUnset = () => {
    this.props.updateMonthlyDownloadTrafficLimit(0);
    this.toggle();
  };

  render() {
    const { traffic, isSubmitBtnActive } = this.state;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <SeahubModalHeader toggle={this.toggle}>{gettext('Set Traffic')}</SeahubModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <InputGroup>
                <Input
                  type="text"
                  className="form-control"
                  value={traffic}
                  onKeyDown={this.handleKeyDown}
                  onChange={this.handleTrafficChange}
                />
                <InputGroupText>MB</InputGroupText>
              </InputGroup>
              <p className="small text-secondary mt-2 mb-2">
                {gettext('An integer that is greater than 0.')}
              </p>
              <Button color="secondary" onClick={this.handleUnset}>{gettext('Unset')}</Button>
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

SysAdminSetOrgMonthlyDownloadTrafficLimitDialog.propTypes = propTypes;

export default SysAdminSetOrgMonthlyDownloadTrafficLimitDialog;
