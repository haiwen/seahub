import React from 'react';
import PropTypes from 'prop-types';
import copy from 'copy-to-clipboard';
import { gettext, serviceURL } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Alert, InputGroup, InputGroupText } from 'reactstrap';
import toaster from '../toast';
import wikiAPI from '../../utils/wiki-api';

import '../../css/publish-wiki-dialog.css';

const propTypes = {
  wiki: PropTypes.object,
  onPublish: PropTypes.func.isRequired,
  toggleCancel: PropTypes.func.isRequired,
};

const DEFAULT_URL = serviceURL + '/wiki/publish/';

class PublishWikiDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      url: this.props.customUrl,
      errMessage: '',
      isSubmitBtnActive: false,
    };
    this.newInput = React.createRef();
    this.preTextRef = React.createRef();
  }

  componentDidMount() {
    setTimeout(() => {
      const preTextWidth = this.preTextRef.current.offsetWidth;
      this.newInput.current.style.paddingLeft = (preTextWidth + 12) + 'px';
      this.newInput.current.focus();
    }, 1);
  }

  handleChange = (e) => {
    this.setState({
      isSubmitBtnActive: !!e.target.value.trim(),
      url: e.target.value
    });
  };

  handleSubmit = () => {
    let { isValid, errMessage } = this.validateInput();
    if (!isValid) {
      this.setState({
        errMessage: errMessage,
        url: '',
      });
    } else {
      this.props.onPublish(DEFAULT_URL + this.state.url.trim());
      this.toggle();
    }
  };

  deleteCustomUrl = () => {
    let wiki_id = this.props.wiki.id;
    wikiAPI.deletePublishWikiLink(wiki_id).then((res) => {
      this.setState({ url: '' });
      toaster.success(gettext('Wiki customize URL deleted'));
    }).catch((error) => {
      if (error.response) {
        let errorMsg = error.response.data.error_msg;
        toaster.danger(errorMsg);
      }
    });
  };

  handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
    }
  };

  toggle = () => {
    this.props.toggleCancel();
  };

  validateInput = () => {
    let url = this.state.url.trim();
    let isValid = true;
    let errMessage = '';
    if (!url) {
      isValid = false;
      errMessage = gettext('URL is required');
      return { isValid, errMessage };
    }
    return { isValid, errMessage };
  };

  copyLink = () => {
    copy(DEFAULT_URL + this.state.url.trim());
    toaster.success(gettext('URL is copied to the clipboard'));
  };

  onClickPreText = () => {
    this.newInput.current.focus();
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Publish Wiki')}</ModalHeader>
        <ModalBody>
          <p>{gettext('Customize URL')}</p>
          <InputGroup className="publish-wiki-custom-url-inputs">
            <span className="input-pretext" ref={this.preTextRef} onClick={this.onClickPreText}>{DEFAULT_URL}</span>
            <input
              className="publish-wiki-custom-url-input form-control"
              type="text"
              value={this.state.url}
              onChange={this.handleChange}
              onKeyDown={this.handleKeyDown}
              ref={this.newInput}
            />
            <InputGroupText>
              <Button color="primary" onClick={this.copyLink} className="border-0">{gettext('Copy')}</Button>
            </InputGroupText>
          </InputGroup>
          <p className='sf-tip-default mt-2'>
            {gettext('The custom part of the URL must be between 5 and 30 characters long and may only contain letters (a-z), numbers, and hyphens.')}
          </p>
          {this.state.errMessage && <Alert color="danger" className="mt-2">{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.deleteCustomUrl} disabled={this.props.customUrl === ''}>{gettext('Delete')}</Button>
          <Button color="primary" onClick={this.handleSubmit} disabled={!this.state.isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

PublishWikiDialog.propTypes = propTypes;

export default PublishWikiDialog;
