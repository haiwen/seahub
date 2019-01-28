import React from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import PropTypes from 'prop-types';
import toaster from '../toast';
import copy from '@seafile/seafile-editor/dist//utils/copy-to-clipboard';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import '../../css/internal-link.css';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
};

class InternalLinkDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: false,
      smartLink: '',
    };

    this.toggle = this.toggle.bind(this);
    this.getInternalLink = this.getInternalLink.bind(this);
    this.copyToClipBoard = this.copyToClipBoard.bind(this);
  }

  toggle() {
    this.setState({
      isOpen: !this.state.isOpen,
    });
  }

  getInternalLink() {
    let repoID = this.props.repoID;
    let path = this.props.path;
    seafileAPI.getInternalLink(repoID, path).then(res => {
      this.setState({
        isOpen: true,
        smartLink: res.data.smart_link
      });
    });
  }

  copyToClipBoard() {
    copy(this.state.smartLink);
    this.setState({
      isOpen: false
    });
    let message = gettext('Copy internal link');
    toaster.success(message), {
      duration: 2
    };
  }

  render() {
    return (
      <span className={'file-internal-link'} title={gettext('Internal Link')}>
        <i className="fa fa-link" onClick={this.getInternalLink}></i>
        <Modal isOpen={this.state.isOpen} toggle={this.toggle}>
          <ModalHeader toggle={this.toggle}>{gettext('Internal Link')}</ModalHeader>
          <ModalBody>
            <p className="tip mb-1">
              {gettext('An internal link is a link to a file or folder that can be accessed by users with read permission to the file or folder.')}
            </p>
            <p>
              <a target="_blank" href={this.state.smartLink}>{this.state.smartLink}</a>
            </p>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={this.copyToClipBoard}>{gettext('Copy')}</Button>{' '}
            <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          </ModalFooter>
        </Modal>
      </span>
    );
  }
}

InternalLinkDialog.propTypes = propTypes;

export default InternalLinkDialog;
