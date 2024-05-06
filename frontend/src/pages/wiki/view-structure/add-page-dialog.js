import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input, Button } from 'reactstrap';
import { gettext, repoID } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../../components/toast';
import Loading from '../../../components/loading';
import { SeahubSelect } from '../../../components/common/select';
// import SelectIcon from './select-icon';
import FileChooser from '../../../components/file-chooser/file-chooser';

import '../css/add-page-dialog.css';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  onAddNewPage: PropTypes.func,
};

const DIALOG_MAX_HEIGHT = window.innerHeight - 56; // Dialog margin is 3.5rem (56px)

class AddPageDialog extends React.Component {

  constructor(props) {
    super(props);
    this.options = this.getOptions();
    this.state = {
      pageName: '',
      iconClassName: '',
      isLoading: false,
      repo: null,
      selectedPath: '',
      errMessage: '',
      newFileName: '',
      selectedOption: this.options[0],
    };
  }

  getOptions = () => {
    return (
      [
        {
          value: 'existing',
          label: gettext('Select an existing file'),
        },
        {
          value: '.md',
          label: gettext('Create a markdown file'),
        },
        {
          value: '.sdoc',
          label: gettext('Create a sdoc file'),
        },
      ]
    );
  };

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
      selectedOption,
    } = this.state;
    const pageName = this.state.pageName.trim();
    if (pageName === '') {
      toaster.danger(gettext('Page name cannot be empty'));
      return;
    }
    if (selectedOption.value === 'existing') {
      if (selectedPath.endsWith('.sdoc') === false && selectedPath.endsWith('.md') === false) {
        toaster.danger(gettext('Please select an existing sdoc or markdown file'));
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
      if (newFileName.includes('/')) {
        toaster.danger(gettext('Name cannot contain slash'));
        return;
      }
      if (newFileName.includes('\\')) {
        toaster.danger(gettext('Name cannot contain backslash'));
        return;
      }
      this.setState({ isLoading: true });
      seafileAPI.createFile(repoID, `${selectedPath}/${newFileName}${selectedOption.value}`).then(res => {
        const { obj_name, parent_dir } = res.data;
        this.props.onAddNewPage({
          name: pageName,
          icon: iconClassName,
          path: parent_dir === '/' ? `/${obj_name}` : `${parent_dir}/${obj_name}`,
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

  handleSelectChange = (selectedOption) => {
    this.setState({
      selectedOption,
      selectedPath: '',
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
            {/* <FormGroup>
              <SelectIcon
                onIconChange={this.onIconChange}
                iconClassName={this.state.iconClassName}
              />
            </FormGroup> */}
            <FormGroup>
              <Label>{gettext('The file corresponding to this page')}</Label>
              <SeahubSelect
                value={this.state.selectedOption}
                options={this.options}
                onChange={this.handleSelectChange}
              />
            </FormGroup>
            {this.state.selectedOption.value !== 'existing' &&
              <>
                <FormGroup>
                  <Label>{gettext('New file name')}</Label>
                  <Input value={this.state.newFileName} onChange={this.onFileNameChange} autoFocus={true} />
                </FormGroup>
                <FormGroup>
                  <Label>{gettext('Select a directory to save new file')}</Label>
                  <FileChooser
                    isShowFile={false}
                    repoID={repoID}
                    currentPath={this.state.selectedPath}
                    onDirentItemClick={this.onDirentItemClick}
                    onRepoItemClick={this.onRepoItemClick}
                    mode={'only_current_library'}
                    hideLibraryName={true}
                  />
                </FormGroup>
              </>
            }
            {this.state.selectedOption.value === 'existing' &&
              <FormGroup>
                <Label>{gettext('Select an existing file')}</Label>
                <FileChooser
                  isShowFile={true}
                  repoID={repoID}
                  currentPath={this.state.selectedPath}
                  onDirentItemClick={this.onDirentItemClick}
                  onRepoItemClick={this.onRepoItemClick}
                  mode={'only_current_library'}
                  hideLibraryName={true}
                />
              </FormGroup>
            }
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
