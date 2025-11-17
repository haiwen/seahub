import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalFooter, Button } from 'reactstrap';
import SeahubModalHeader from '../../components/common/seahub-modal-header';
import { gettext } from '../../utils/constants';
import { useWorkflows } from '../hooks/workflows';
import { EVENT_BUS_TYPE } from '../constants/event-bus-type';

const SaveWorkflowTipsDialog = ({ saveCallback, leaveCallback, toggle }) => {
  const { workflowEventBus } = useWorkflows();

  const onSave = useCallback(() => {
    workflowEventBus.dispatch(EVENT_BUS_TYPE.SAVE_WORKFLOW, () => {
      saveCallback();
    });
    toggle();
  }, [workflowEventBus, saveCallback, toggle]);

  const onLeave = useCallback(() => {
    leaveCallback();
  }, [leaveCallback]);

  return (
    <Modal isOpen={true} toggle={toggle}>
      <SeahubModalHeader toggle={toggle}>{gettext('Save changes before leaving?')}</SeahubModalHeader>
      <ModalBody>
        <div className="pb-6">{gettext('If you don\'t save, you will lose your changes.')}</div>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={onLeave}>{gettext('Leave without saving')}</Button>
        <Button color="primary" onClick={onSave}>{gettext('Save')}</Button>
      </ModalFooter>
    </Modal>
  );
};

SaveWorkflowTipsDialog.propTypes = {
  saveCallback: PropTypes.func,
  leaveCallback: PropTypes.func,
  toggle: PropTypes.func,
};

export default SaveWorkflowTipsDialog;
