import React, { Fragment } from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import PropTypes from 'prop-types';
import toaster from '../toast';
import copy from '../copy-to-clipboard';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  onInternalLinkDialogToggle: PropTypes.func.isRequired,
};

class InternalLinkDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      smartLink: '',
      isLoading: true,
    };
  }

  componentDidMount() {
    this.getInternalLink();
  }

  getInternalLink = () => {
    let repoID = this.props.repoID;
    let path = this.props.path;
    seafileAPI.getInternalLink(repoID, path).then(res => {
      const { smart_link } = res.data;
      this.setState({
        isLoading: false,
        smartLink: smart_link,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      this.setState({isLoading: false});
    });
  }

  copyToClipBoard = () => {
    copy(this.state.smartLink);
    const message = gettext('Internal link has been copied to clipboard');
    toaster.success(message, {duration: 2});
    this.toggle();
  }

  toggle = () => {
    this.props.onInternalLinkDialogToggle();
  }

  render() {
    const tipMessage = gettext('An internal link is a link to a file or folder that can be accessed by users with read permission to the file or folder.');
    return (
      <Fragment>
        <Modal isOpen={true} toggle={this.toggle}>
          <ModalHeader toggle={this.toggle}>{gettext('Internal Link')}</ModalHeader>
          <ModalBody>
            <p className="tip mb-1">{tipMessage}</p>
            <p>
              <a target="_blank" href={this.state.smartLink} rel='noreferrer'>{this.state.smartLink}</a>
            </p>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
            <Button color="primary" onClick={this.copyToClipBoard}>{gettext('Copy')}</Button>
          </ModalFooter>
        </Modal>
      </Fragment>
    );
  }
}

InternalLinkDialog.propTypes = propTypes;

export default InternalLinkDialog;
