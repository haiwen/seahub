import React from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import validUrl from 'valid-url';

class AddLinkDialog extends React.Component {
  state = {
    url: '',
    error: null
  };

  handleUrlChange = (event) => {
    this.setState({url: event.target.value})
  };

  handleSubmit = () => {
    if (validUrl.isUri(this.state.url)) {
      this.props.onSetLink(this.state.url);
      this.props.toggleLinkDialog();
    } else {
      this.setState({error: this.props.t('invalid_url')});
    }
  }

  render() {
    return (
      <Modal isOpen={this.props.showAddLinkDialog} toggle={this.props.toggleLinkDialog} className={this.props.className}>
        <ModalHeader toggle={this.props.toggleLinkDialog}>{this.props.t("insert_link")}</ModalHeader>
        <ModalBody>
          <p>{this.props.t("enter_the_url_of_the_link")}:</p>
          <input type="url" value={this.state.value} onChange={this.handleUrlChange} />
          {this.state.error &&
          <p className="text-danger">{this.state.error}</p>
          }
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.handleSubmit}>{this.props.t("submit")}</Button>{' '}
          <Button color="secondary" onClick={this.props.toggleLinkDialog}>{this.props.t("cancel")}</Button>
        </ModalFooter>
      </Modal>
    )
  }
}

export default AddLinkDialog;
