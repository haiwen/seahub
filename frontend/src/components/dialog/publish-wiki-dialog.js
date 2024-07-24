import React from 'react';
import PropTypes from 'prop-types';
import copy from 'copy-to-clipboard';
import { gettext, serviceURL } from '../../utils/constants';
import { Button, Modal, ModalHeader, Input, ModalBody, ModalFooter, Alert, InputGroup, InputGroupAddon } from 'reactstrap';
import toaster from '../toast';
import wikiAPI from '../../utils/wiki-api';

const propTypes = {
  wiki: PropTypes.object,
  onPublish: PropTypes.func.isRequired,
  toggleCancel: PropTypes.func.isRequired,
};

class PublishWikiDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      url: serviceURL + '/publish/custom/' + this.props.customUrl,
      errMessage: '',
      isSubmitBtnActive: false,
    };
    this.newInput = React.createRef();
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
        url: serviceURL + '/publish/custom/',
      });
    } else {
      this.props.onPublish(this.state.url.trim());
    }
  };

  deleteCustomUrl = () => {
    let wiki_id = this.props.wiki.id;
    wikiAPI.deletePublishWikiLink(wiki_id).then((res) => {
      this.setState({ url: serviceURL + '/publish/custom/' });
      toaster.success(gettext('Successfully.'));
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
      errMessage = gettext('url is required.');
      return { isValid, errMessage };
    }
    if (!(url.includes(serviceURL + '/publish/custom/'))) {
      isValid = false;
      errMessage = gettext('url  need include specific prefix.');
      return { isValid, errMessage };
    }
    return { isValid, errMessage };
  };

  copyLink = () => {
    copy(this.state.url);
    toaster.success(gettext('URL is copied to the clipboard'));
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Publish Wiki')}</ModalHeader>
        <ModalBody>
          <p>{gettext('Customize URL')}</p>
          <InputGroup>
            <Input
              onKeyDown={this.handleKeyDown}
              innerRef={this.newInput}
              placeholder="customize url"
              value={this.state.url}
              onChange={this.handleChange}
            />
            <InputGroupAddon addonType="append">
              <Button color="primary" onClick={this.copyLink} className="border-0">{gettext('Copy')}</Button>
            </InputGroupAddon>
          </InputGroup>
          {this.state.errMessage && <Alert color="danger" className="mt-2">{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.deleteCustomUrl} disabled={this.props.customUrl === ''}>{gettext('Delete')}</Button>
          <Button color="primary" onClick={this.handleSubmit} disabled={!this.state.isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
      // <Fragment>
      //   <div className="d-flex">
      //     <InputGroup>
      //       <Input type="text" readOnly={true} value={this.state.url} />
      //       <InputGroupAddon addonType="append">
      //         <Button color="primary" className="border-0">{gettext('Copy')}</Button>
      //       </InputGroupAddon>
      //     </InputGroup>
      //   </div>
      // </Fragment>
    );
  }
}

PublishWikiDialog.propTypes = propTypes;

export default PublishWikiDialog;
