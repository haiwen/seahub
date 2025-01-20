import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, Input, ModalBody, ModalFooter, Form, FormGroup, Label, Alert } from 'reactstrap';
import { gettext } from '../../utils/constants';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  onAddLink: PropTypes.func.isRequired,
  toggleDialog: PropTypes.func.isRequired,
};

class AddVideoLink extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      videoLink: '',
      errMessage: '',
      isSubmitBtnActive: false,
    };
    this.newInput = React.createRef();
  }

  isValidVideoLink = (link) => {
    // const videoRegex = /\.(mp4|mov|avi|mkv|webm|ogv)$/i;
    // return videoRegex.test(link);
    return link;
  };

  handleChange = (e) => {
    const videoLink = e.target.value.trim();
    const isValid = this.isValidVideoLink(videoLink);

    if (!e.target.value.trim()) {
      this.setState({ isSubmitBtnActive: false });
    }

    this.setState({
      videoLink: videoLink,
      isSubmitBtnActive: isValid,
      errMessage: isValid ? '' : gettext('Please enter a valid video URL ending in .mp4, .mov, etc.'),
    });

  };

  handleSubmit = () => {
    if (!this.state.isSubmitBtnActive) return;
    this.props.onAddLink(this.state.videoLink);
    this.props.toggleDialog();
  };

  handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
      e.preventDefault();
    }
  };

  onAfterModelOpened = () => {
    if (!this.newInput.current) return;
    this.newInput.current.focus();
    this.newInput.current.setSelectionRange(0, 0);
  };

  render() {
    const { toggleDialog } = this.props;
    return (
      <Modal isOpen={true} toggle={toggleDialog} onOpened={this.onAfterModelOpened}>
        <SeahubModalHeader toggle={toggleDialog}>{gettext('Insert_link')}</SeahubModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for='videoLink'>{gettext('Link_address')}</Label>
              <Input
                id='videoLink'
                onKeyDown={this.handleKeyDown}
                innerRef={this.newInput}
                value={this.state.videoLink}
                onChange={this.handleChange}
              />
            </FormGroup>
          </Form>
          {this.state.errMessage && <Alert color='danger' className='mt-2'>{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color='secondary' onClick={toggleDialog}>{gettext('Cancel')}</Button>
          <Button color='primary' onClick={this.handleSubmit} disabled={!this.state.isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

AddVideoLink.propTypes = propTypes;

export default AddVideoLink;
