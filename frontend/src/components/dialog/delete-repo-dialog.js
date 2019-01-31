import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';

const propTypes = {
  toggle: PropTypes.func.isRequired,
};

class DeleteRepoDialog extends Component {

  toggle = () => {
    this.props.toggle();
  }

  clickYes = () => {
    this.toggle();
    
    const data = this.props.data;
    if (data) {
      data.yesCallback.bind(data._this)();
    }
  }

  render() {

    const data = this.props.data;
    const repoName = data ? '<span class="sf-font">' + Utils.HTMLescape(data.repoName) + '</span>' : null;
    let message = gettext('Are you sure you want to delete %s ?');
    message = message.replace('%s', repoName);
    const popup = (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Delete Library')}</ModalHeader>
        <ModalBody>
          <p dangerouslySetInnerHTML={{__html: message}}></p>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.clickYes}>{gettext('Delete')}</Button>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
        </ModalFooter>
      </Modal>
    );

    return popup;
  }
}

DeleteRepoDialog.propTypes = propTypes;

export default DeleteRepoDialog;
