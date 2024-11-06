import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import { gettext } from '../../../../utils/constants';

const TurnOffConfirmDialog = ({ toggle, submit }) => {
  return (
    <Modal isOpen={true} toggle={toggle}>
      <ModalHeader toggle={toggle}>{gettext('Turn off face recognition')}</ModalHeader>
      <ModalBody>
        <p>{gettext('Do you really want to turn off face recognition? Existing results will all be deleted.')}</p>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle}>{gettext('Cancel')}</Button>
        <Button color="primary" onClick={submit}>{gettext('Turn off')}</Button>
      </ModalFooter>
    </Modal>
  );
};

TurnOffConfirmDialog.propTypes = {
  toggle: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired
};

export default TurnOffConfirmDialog;
