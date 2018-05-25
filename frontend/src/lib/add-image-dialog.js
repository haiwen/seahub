import React from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import validUrl from 'valid-url';

class AddImageDialog extends React.Component {

  state = {
    url: '',
    error: null
  };

  handleUrlChange = (event) => {
    this.setState({url: event.target.value});
  }

  handleSubmit = (event) => {
    if (validUrl.isUri(this.state.url)) {
      this.props.toggleImageDialog();
      this.props.onInsertImage(this.state.url);
    } else {
      this.setState({error: this.props.t('invalid_url')});
    }
  }

  render() {
    return (
      <Modal isOpen={this.props.showAddImageDialog} toggle={this.props.toggleImageDialog} className={this.props.className}>
        <ModalHeader toggle={this.props.toggleImageDialog}>{this.props.t("insert_image")}</ModalHeader>
        <ModalBody>
          <p>{this.props.t("enter_the_url_of_the_image")}:</p>
          <input type="url" value={this.state.value} onChange={this.handleUrlChange} />
          {this.state.error &&
          <p className="text-danger">{this.state.error}</p>
          }
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.handleSubmit}>{this.props.t("submit")}</Button>{' '}
          <Button color="secondary" onClick={this.props.toggleImageDialog}>{this.props.t("cancel")}</Button>
        </ModalFooter>
      </Modal>
    )
  }

}

export default AddImageDialog;
