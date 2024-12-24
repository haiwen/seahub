import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalBody, ModalFooter } from 'reactstrap';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  currentNode: PropTypes.object.isRequired,
  toggleCancel: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
};

class Delete extends React.Component {

  toggle = () => {
    this.props.toggleCancel();
  };

  render() {
    let currentNode = this.props.currentNode;
    let name = currentNode.object.name;
    let title = gettext('Delete File');
    if (currentNode.object.isDir()) {
      title = gettext('Delete Folder');
    }
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <SeahubModalHeader toggle={this.toggle}>{title}</SeahubModalHeader>
        <ModalBody>
          <p>{gettext('Are you sure you want to delete')}{' '}<b>{name}</b> ?</p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.props.handleSubmit}>{gettext('Delete')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

Delete.propTypes = propTypes;

export default Delete;
