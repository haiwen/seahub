import React from 'react';
import PropTypes from 'prop-types';
import { Alert, Modal, ModalHeader, ModalBody, ModalFooter, Button, Form, FormGroup, Input, InputGroup, InputGroupAddon, InputGroupText } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';

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
  }

  handleRateLimitChange = (e) => {
    const value = e.target.value;
    this.setState({
      rateLimit: value,
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
    this.props.updateUploadDownloadRateLimit(this.props.uploadOrDownload, this.state.rateLimit.trim());
    this.toggle();
  }

  render() {
    const { rateLimit, isSubmitBtnActive } = this.state;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{this.props.uploadOrDownload == "upload" ? gettext('Set Upload Rate Limit') : gettext('Set Download Rate Limit')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <InputGroup>
                <Input
                  type="text"
                  className="form-control"
                  value={rateLimit}
                  onKeyPress={this.handleKeyPress}
                  onChange={this.handleRateLimitChange}
                />
                <InputGroupAddon addonType="append">
                  <InputGroupText>kB/s</InputGroupText>
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

SysAdminSetUploadDownloadRateLimitDialog.propTypes = propTypes;

export default SysAdminSetUploadDownloadRateLimitDialog;
