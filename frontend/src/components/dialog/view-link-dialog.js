import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import toaster from '../toast';
import copy from '../copy-to-clipboard';
import { gettext } from '../../utils/constants';

const propTypes = {
  currentLinkHref: PropTypes.string.isRequired,
  toggle: PropTypes.func.isRequired,
};

class ViewLinkDialog extends React.Component {

  constructor(props) {
    super(props);
  }

  copyToClipBoard = () => {
    copy(this.props.currentLinkHref);
    let message = gettext('Link has been copied to clipboard');
    toaster.success(message), {
      duration: 2
    };
    this.props.toggle();
  }

  render() {
    const href = this.props.currentLinkHref;
    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <ModalHeader toggle={this.props.toggle}>{gettext('Link')}</ModalHeader>
        <ModalBody>
          <p><a target="_blank" href={href}>{href}</a></p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggle}>{gettext('Cancel')}</Button>{' '}
          <Button color="primary" onClick={this.copyToClipBoard}>{gettext('Copy')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

ViewLinkDialog.propTypes = propTypes;

export default ViewLinkDialog;
