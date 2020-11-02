import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';

const propTypes = {
  toggleCancel: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
};

class WikiDeleteDialog extends React.Component {

  toggle = () => {
    this.props.toggleCancel();
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Unpublish Library')}</ModalHeader>
        <ModalBody>
          <p>{gettext('Are you sure you want to unpublish this library?')}</p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.props.handleSubmit}>{gettext('Unpublish')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

WikiDeleteDialog.propTypes = propTypes;

export default WikiDeleteDialog;
