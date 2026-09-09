import React from 'react';
import { Modal, ModalBody, ModalFooter, Button } from 'reactstrap';
import PropTypes from 'prop-types';
import SeahubModalHeader from '@/components/seahub-modal-header';
import toaster from '../../components/toast';
import { gettext } from '../../utils/constants';
import copy from '../copy-to-clipboard';

const propTypes = {
  link: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class ShareAdminLink extends React.Component {

  constructor(props) {
    super(props);
  }

  copyToClipboard = () => {
    copy(this.props.link);
    this.props.toggleDialog();
    toaster.success(gettext('The link is copied to the clipboard.'), { duration: 2 });
  };

  render() {
    const { link, toggleDialog } = this.props;
    return (
      <Modal isOpen={true} toggle={toggleDialog}>
        <SeahubModalHeader toggle={toggleDialog}>{gettext('Link')}</SeahubModalHeader>
        <ModalBody>
          <a href={link}>{link}</a>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.copyToClipboard}>{gettext('Copy')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

ShareAdminLink.propTypes = propTypes;

export default ShareAdminLink;
