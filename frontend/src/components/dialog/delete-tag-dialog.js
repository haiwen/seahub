import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext, repoID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';

const propTypes = {
  currentTag: PropTypes.object.isRequired,
  toggleCancel: PropTypes.func.isRequired,
};

class DeleteTag extends React.Component {
  
  deleteTag = () => {
    let tag_id = this.props.currentTag.id;
    seafileAPI.deleteRepotag(repoID, tag_id);
    this.props.toggleCancel();
  }

  toggle = () => {
    this.props.toggleCancel();
  }
  
  render() {
    let name = this.props.currentTag.name;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Delete a tag')}</ModalHeader>
        <ModalBody>
          <p>{gettext('Are you sure to delete tag: ')}<b>{name}</b>?</p>
        </ModalBody>
        <ModalFooter>
          <Button outline color="danger" onClick={this.deleteTag}>{gettext('YES')}</Button>
          <Button outline color="secondary" onClick={this.toggle}>{gettext('NO')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

DeleteTag.propTypes = propTypes;

export default DeleteTag;
