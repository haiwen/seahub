import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalFooter, Button } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const TurnOffConfirmDialog = ({ title, children, toggle, submit }) => {
  return (
    <Modal isOpen={true} toggle={toggle}>
      <SeahubModalHeader toggle={toggle}>{title}</SeahubModalHeader>
      <ModalBody>
        {children}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle}>{gettext('Cancel')}</Button>
        <Button color="primary" onClick={submit}>{gettext('Turn off')}</Button>
      </ModalFooter>
    </Modal>
  );
};

TurnOffConfirmDialog.propTypes = {
  title: PropTypes.string,
  children: PropTypes.any,
  toggle: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired
};

export default TurnOffConfirmDialog;
