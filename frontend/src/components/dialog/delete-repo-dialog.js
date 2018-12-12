import React, { Component } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import { gettext } from '../../utils/constants';

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
    const repoName = data ? '<span class="sf-font">' + data.repoName + '</span>' : null;
    let message = gettext("Are you sure you want to delete %s?");
    message = message.replace('%s', repoName);
    const popup = (
      <Modal isOpen={true} toggle={this.toggle} centered={true}>
        <ModalHeader toggle={this.toggle}>{gettext("Delete Library")}</ModalHeader>
        <ModalBody>
          <p dangerouslySetInnerHTML={{__html: message}}></p>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.clickYes}>{gettext("Confirm")}</Button>
          <Button color="secondary" onClick={this.toggle}>{gettext("Cancel")}</Button>
        </ModalFooter>
      </Modal>
    );

    return popup;
  }
}

export default DeleteRepoDialog;
