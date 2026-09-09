import React from 'react';
import { Modal, ModalBody, ModalFooter, Button } from 'reactstrap';
import PropTypes from 'prop-types';
import SeahubModalHeader from '@/components/seahub-modal-header';
import { gettext } from '../../../utils/constants';

const propTypes = {
  node: PropTypes.object,
  toggle: PropTypes.func,
  onDelete: PropTypes.func
};

class DeleteDepartmentV2ConfirmDialog extends React.Component {
  render() {
    const { node, toggle } = this.props;
    return (
      <Modal isOpen={true} toggle={toggle}>
        <SeahubModalHeader toggle={toggle}>
          {gettext('Delete department')}
        </SeahubModalHeader>
        <ModalBody>
          <div className="pb-6">
            {gettext('Are you sure to delete')}{' '}<b>{node.name}</b> ?
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onMouseDown={toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onMouseDown={this.props.onDelete}>{gettext('Delete')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

DeleteDepartmentV2ConfirmDialog.propTypes = propTypes;

export default DeleteDepartmentV2ConfirmDialog;
