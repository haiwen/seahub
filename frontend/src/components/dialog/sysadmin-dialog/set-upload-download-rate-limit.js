import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalFooter, Button, Form, FormGroup, Input, InputGroup, InputGroupText } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  uploadOrDownload: PropTypes.string.isRequired,
  toggle: PropTypes.func.isRequired,
  updateUploadDownloadRateLimit: PropTypes.func.isRequired
};

class SysAdminSetUploadDownloadRateLimitDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      rateLimit: '',
      isSubmitBtnActive: false
    };
  }

  toggle = () => {
    this.props.toggle();
  };

  handleRateLimitChange = (e) => {
    const value = e.target.value;
    this.setState({
      rateLimit: value,
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
    this.props.updateUploadDownloadRateLimit(this.props.uploadOrDownload, this.state.rateLimit.trim());
    this.toggle();
  };

  handleUnset = () => {
    this.props.updateUploadDownloadRateLimit(this.props.uploadOrDownload, 0);
    this.toggle();
  };

  render() {
    const { rateLimit, isSubmitBtnActive } = this.state;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <SeahubModalHeader toggle={this.toggle}>{this.props.uploadOrDownload == 'upload' ? gettext('Set Upload Rate Limit') : gettext('Set Download Rate Limit')}</SeahubModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <InputGroup>
                <Input
                  type="text"
                  className="form-control"
                  value={rateLimit}
                  onKeyDown={this.handleKeyDown}
                  onChange={this.handleRateLimitChange}
                />
                <InputGroupText>kB/s</InputGroupText>
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

SysAdminSetUploadDownloadRateLimitDialog.propTypes = propTypes;

export default SysAdminSetUploadDownloadRateLimitDialog;
