import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';

const propTypes = {
  toggleCancel: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
};

class WikiDelete extends React.Component {

  toggle = () => {
    this.props.toggleCancel();
  }
  
  render() {
    return (
      <Modal isOpen={true}>
        <ModalHeader toggle={this.toggle}>{gettext('Delete Wiki')}</ModalHeader>
        <ModalBody>
          <p>{gettext('Are you sure you want to delete this wiki?')}</p>
        </ModalBody>
        <ModalFooter>
          <Button outline color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button outline color="danger" onClick={this.props.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

WikiDelete.propTypes = propTypes;

export default WikiDelete;
