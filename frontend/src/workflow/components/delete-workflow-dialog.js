import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalFooter, Button } from 'reactstrap';
import SeahubModalHeader from '../../components/common/seahub-modal-header';
import { gettext } from '../../utils/constants';

const DeleteWorkflowDialog = ({ workflow, toggle, deleteWorkflow }) => {

  const onDeleteWorkflow = () => {
    deleteWorkflow();
    toggle();
  };

  const onToggle = () => {
    toggle();
  };

  return (
    <Modal isOpen={true} toggle={onToggle}>
      <SeahubModalHeader toggle={onToggle}>{gettext('Delete workflow')}</SeahubModalHeader>
      <ModalBody>
        <div className="pb-6">{gettext('Are you sure to delete the {workflow_name}?').replace('{workflow_name}', workflow.name)}</div>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={onToggle}>{gettext('Cancel')}</Button>
        <Button color="primary" onClick={onDeleteWorkflow}>{gettext('Delete')}</Button>
      </ModalFooter>
    </Modal>
  );
};

DeleteWorkflowDialog.propTypes = {
  workflow: PropTypes.object,
  deleteWorkflow: PropTypes.func,
  toggle: PropTypes.func,
};

export default DeleteWorkflowDialog;
