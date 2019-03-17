import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';

const propTypes = {
  deleteDraft: PropTypes.func.isRequired,
  useDraft: PropTypes.func.isRequired,
  localDraftDialog: PropTypes.bool.isRequired,
  closeDraftDialog: PropTypes.func.isRequired,
};

class LocalDraftDialog extends React.PureComponent {
  render() {
    return (
      <Modal isOpen={true} toggle={this.props.closeDraftDialog}>
        <ModalHeader toggle={this.props.closeDraftDialog}>{gettext('Local draft')}</ModalHeader>
        <ModalBody>
          <p>{gettext('You have an unsaved draft. Do you like to use it?')}</p>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.props.useDraft}>{gettext('Use draft')}</Button>
          <Button color="secondary" onClick={this.props.deleteDraft}>{gettext('Delete draft')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

LocalDraftDialog.propTypes = propTypes;

export default LocalDraftDialog;
