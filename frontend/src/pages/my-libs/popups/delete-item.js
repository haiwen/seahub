import React, { Component } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import { gettext } from '../../../utils/constants';

class DeleteItemPopup extends Component {

  constructor(props) {
    super(props);

    this.toggle = this.toggle.bind(this);
    this.clickYes = this.clickYes.bind(this);
  }

  toggle() {
    this.props.toggle();
  }

  clickYes() {
    this.toggle();
    
    const data = this.props.data;
    if (data) {
      data.yesCallback.bind(data._this)();
    }
  }

  render() {

    const data = this.props.data;
    // TODO:
    //const repoName = <span class="op-target ellipsis ellipsis-op-target">{data ? data.repoName : null}</span>;
    const repoName = data ? data.repoName : null;
    const popup = (
      <Modal isOpen={this.props.isOpen} toggle={this.toggle} centered={true}>
        <ModalHeader toggle={this.toggle}>{gettext("Delete Library")}</ModalHeader>
        <ModalBody>
          <p>{gettext("Are you sure you want to delete %s ?").replace('%s', repoName)}</p>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.clickYes}>{gettext("Yes")}</Button>
          <Button color="secondary" onClick={this.toggle}>{gettext("No")}</Button>
        </ModalFooter>
      </Modal>
    );

    return popup;
  }
}

export default DeleteItemPopup;
