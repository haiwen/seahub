import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input, Button } from 'reactstrap';
import { gettext, repoID } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../../components/toast';
import Loading from '../../../components/loading';
import Switch from '../../../components/common/switch';
import SelectIcon from './select-icon';
import FileChooser from '../../../components/file-chooser/file-chooser';

import './add-page-dialog.css';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  onAddNewPage: PropTypes.func,
};

const DIALOG_MAX_HEIGHT = window.innerHeight - 56; // Dialog margin is 3.5rem (56px)

class AddPageDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      pageName: '',
      iconClassName: '',
      isLoading: false,
      isUseExistFile: false,
      repo: null,
      selectedPath: '',
      errMessage: '',
      newFileName: '',
    };
  }

  handleChange = (event) => {
    let value = event.target.value;
    if (value === this.state.pageName) {
      return;
    }
    this.setState({ pageName: value });
  };

  onFileNameChange = (event) => {
    this.setState({ newFileName: event.target.value });
  };

  toggle = () => {
    this.props.toggle();
  };

  onIconChange = (className) => {
    this.setState({ iconClassName: className });
  };

  onSubmit = () => {
    let {
      iconClassName,
      selectedPath,
      isUseExistFile,
    } = this.state;
    const pageName = this.state.pageName.trim();
    if (pageName === '') {
      toaster.danger(gettext('Page name cannot be empty'));
      return;
    }
    if (isUseExistFile) {
      if (selectedPath.endsWith('.sdoc') === false && selectedPath.endsWith('.md') === false) {
        toaster.danger(gettext('Please select an existing sdoc or md file'));
        return;
      }
      this.props.onAddNewPage({
        name: pageName,
        icon: iconClassName,
        path: selectedPath,
        successCallback: this.onSuccess,
        errorCallback: this.onError,
      });
      this.setState({ isLoading: true });
    }
    else {
      const newFileName = this.state.newFileName.trim();
      if (newFileName === '') {
        toaster.danger(gettext('New file name cannot be empty'));
        return;
      }
      if (newFileName.endsWith('.sdoc') === false && newFileName.endsWith('.md') === false) {
        toaster.danger(gettext('Please input a sdoc or md file name'));
        return;
      }
      this.setState({ isLoading: true });
      seafileAPI.createFile(repoID, `${selectedPath}/${newFileName}`).then(res => {
        const { obj_name, parent_dir } = res.data;
        this.props.onAddNewPage({
          name: pageName,
          icon: iconClassName,
          path: `${parent_dir}/${obj_name}`,
          successCallback: this.onSuccess,
          errorCallback: this.onError,
        });
      }).catch((error) => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
        this.onError();
      });
    }
  };

  onSuccess = () => {
    this.toggle();
  };

  onError = () => {
    this.setState({ isLoading: false });
  };

  onSwitchChange = (e) => {
    this.setState({ isUseExistFile: e.target.checked });
  };

  onDirentItemClick = (repo, selectedPath) => {
    this.setState({
      repo: repo,
      selectedPath: selectedPath,
      errMessage: ''
    });
  };

  onRepoItemClick = (repo) => {
    this.setState({
      repo: repo,
      selectedPath: '/',
      errMessage: ''
    });
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle} autoFocus={false} className="add-page-dialog" style={{ maxHeight: DIALOG_MAX_HEIGHT }}>
        <ModalHeader toggle={this.toggle}>{gettext('Add page')}</ModalHeader>
        <ModalBody className={'pr-4'}>
          <Form>
            <FormGroup>
              <Label>{gettext('Page name')}</Label>
              <Input value={this.state.pageName} onChange={this.handleChange} autoFocus={true} />
            </FormGroup>
            <FormGroup>
              <SelectIcon
                onIconChange={this.onIconChange}
                iconClassName={this.state.iconClassName}
              />
            </FormGroup>
            <FormGroup>
              <Switch
                checked={this.state.isUseExistFile}
                placeholder={gettext('Select an existing file')}
                className="add-page-dialog-switch"
                onChange={this.onSwitchChange}
                textPosition="right"
              />
            </FormGroup>
            {!this.state.isUseExistFile &&
              <FormGroup>
                <Label>{gettext('New file name(markdown or sdoc)')}</Label>
                <Input value={this.state.newFileName} onChange={this.onFileNameChange} autoFocus={true} />
              </FormGroup>
            }
            <FormGroup>
              <Label>
                {this.state.isUseExistFile ? gettext('Select an existing file') : gettext('Select a directory to save new file ')}
              </Label>
              <FileChooser
                isShowFile={this.state.isUseExistFile}
                repoID={repoID}
                currentPath={this.state.selectedPath}
                onDirentItemClick={this.onDirentItemClick}
                onRepoItemClick={this.onRepoItemClick}
                mode={'only_current_library'}
              />
            </FormGroup>
          </Form>
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

AddPageDialog.propTypes = propTypes;

export default AddPageDialog;
