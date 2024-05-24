import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Label, Input, Button } from 'reactstrap';
import { gettext, wikiId } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import toaster from '../../../components/toast';
import Loading from '../../../components/loading';
import wikiAPI from '../../../utils/wiki-api';

import '../css/add-new-page-dialog.css';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  onAddNewPage: PropTypes.func,
};


class AddNewPageDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      pageName: '',
      isLoading: false,
      errMessage: '',
    };
  }

  handleChange = (event) => {
    let value = event.target.value;
    if (value !== this.state.pageName) {
      this.setState({ pageName: value });
    }
  };

  handleKeyDown = (e) => {
    if (e.keyCode === 13) {
      e.preventDefault();
      this.onSubmit();
    }
  };

  toggle = () => {
    this.props.toggle();
  };

  checkName = (newName) => {
    if (newName === '') {
      toaster.danger(gettext('Name cannot be empty'));
      return false;
    }
    if (newName.includes('/')) {
      toaster.danger(gettext('Name cannot contain slash'));
      return false;
    }
    if (newName.includes('\\')) {
      toaster.danger(gettext('Name cannot contain backslash'));
      return false;
    }
    return true;
  };

  onSubmit = () => {
    const pageName = this.state.pageName.trim();
    if (this.checkName(pageName)) {
      this.setState({ isLoading: true });
      this.createPage(pageName);
    }
  };

  createPage = (pageName) => {
    wikiAPI.createWiki2Page(wikiId, pageName).then(res => {
      const { obj_name, parent_dir, doc_uuid } = res.data;
      this.props.onAddNewPage({
        name: pageName,
        icon: '',
        path: parent_dir === '/' ? `/${obj_name}` : `${parent_dir}/${obj_name}`,
        docUuid: doc_uuid,
        successCallback: this.onSuccess,
        errorCallback: this.onError,
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      this.onError();
    });
  };

  onSuccess = () => {
    this.toggle();
  };

  onError = () => {
    this.setState({ isLoading: false });
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle} autoFocus={false} className='add-new-page-dialog'>
        <ModalHeader toggle={this.toggle}>{gettext('Add page')}</ModalHeader>
        <ModalBody className='pr-4'>
          <Label>{gettext('Page name')}</Label>
          <Input
            className="mb-4"
            value={this.state.pageName}
            onChange={this.handleChange}
            autoFocus={true}
            onKeyDown={this.handleKeyDown}
          />
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          {this.state.isLoading ?
            <Button color="primary" disabled><Loading /></Button> :
            <Button color="primary" onClick={this.onSubmit}>{gettext('Submit')}</Button>
          }
        </ModalFooter>
      </Modal>
    );
  }
}

AddNewPageDialog.propTypes = propTypes;

export default AddNewPageDialog;
