import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';

const propTypes = {
  currentNode: PropTypes.object.isRequired,
  toggleCancel: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
};

class Delete extends React.Component {

  toggle = () => {
    this.props.toggleCancel();
  }
  
  render() {
    let name = this.props.currentNode.object.name;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Delete Tag')}</ModalHeader>
        <ModalBody>
          <p>{gettext('Are you sure to delete')}{' '}<b>{name}</b> ?</p>
        </ModalBody>
        <ModalFooter>
          <Button outline color="danger" onClick={this.props.handleSubmit}>{gettext('YES')}</Button>
          <Button outline color="secondary" onClick={this.toggle}>{gettext('NO')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

Delete.propTypes = propTypes;

export default Delete;
