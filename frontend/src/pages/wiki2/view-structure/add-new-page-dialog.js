import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Label, Input, Button } from 'reactstrap';
import { gettext, repoID } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../../components/toast';
import Loading from '../../../components/loading';

import '../css/add-new-page-dialog.css';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  onAddNewPage: PropTypes.func,
};

const NEW_WIKI_FILE_PATH = '/wiki-pages/';

class AddNewPageDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      pageName: '',
      isLoading: true,
      errMessage: '',
    };
  }

  componentDidMount() {
    seafileAPI.getDirInfo(repoID, NEW_WIKI_FILE_PATH).then((res) => {
      if (res.data.path === NEW_WIKI_FILE_PATH) {
        this.setState({ isLoading: false });
      }
    }).catch((error) => {
      if (error.response.data.error_msg === 'Folder /wiki-pages/ not found.') {
        seafileAPI.createDir(repoID, NEW_WIKI_FILE_PATH).then((res) => {
          if (res.data === 'success') {
            this.setState({ isLoading: false });
          }
        }).catch((error) => {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
          this.setState({ isLoading: false });
        });
      } else {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
        this.setState({ isLoading: false });
      }
    });
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
      this.createFile(pageName, `${NEW_WIKI_FILE_PATH}${pageName}.sdoc`);
    }
  };

  createFile = (pageName, filePath) => {
    seafileAPI.createFile(repoID, filePath).then(res => {
      const { obj_name, parent_dir } = res.data;
      this.props.onAddNewPage({
        name: pageName,
        icon: '',
        path: parent_dir === '/' ? `/${obj_name}` : `${parent_dir}/${obj_name}`,
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
            <Button color="primary" disabled><Loading/></Button> :
            <Button color="primary" onClick={this.onSubmit}>{gettext('Submit')}</Button>
          }
        </ModalFooter>
      </Modal>
    );
  }
}

AddNewPageDialog.propTypes = propTypes;

export default AddNewPageDialog;
