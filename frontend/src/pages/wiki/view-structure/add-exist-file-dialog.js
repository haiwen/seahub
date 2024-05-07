import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input, Button } from 'reactstrap';
import { gettext, repoID } from '../../../utils/constants';
import toaster from '../../../components/toast';
import Loading from '../../../components/loading';
import FileChooser from '../../../components/file-chooser/file-chooser';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  onAddNewPage: PropTypes.func,
};

const DIALOG_MAX_HEIGHT = window.innerHeight - 56; // Dialog margin is 3.5rem (56px)

class AddExistFileDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      pageName: '',
      isLoading: false,
      repo: null,
      selectedPath: '',
      errMessage: '',
    };
  }

  handleChange = (event) => {
    let value = event.target.value;
    if (value !== this.state.pageName) {
      this.setState({ pageName: value });
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
    if (!this.checkName(pageName)) return;
    let { selectedPath } = this.state;
    if (selectedPath.endsWith('.sdoc') === false && selectedPath.endsWith('.md') === false) {
      toaster.danger(gettext('Please select an existing sdoc or markdown file'));
      return;
    }
    this.props.onAddNewPage({
      name: pageName,
      icon: '',
      path: selectedPath,
      successCallback: this.onSuccess,
      errorCallback: this.onError,
    });
    this.setState({ isLoading: true });
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

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle} autoFocus={false} className="add-exist-file-dialog" style={{ maxHeight: DIALOG_MAX_HEIGHT }}>
        <ModalHeader toggle={this.toggle}>{gettext('Add existing file')}</ModalHeader>
        <ModalBody className='pr-4'>
          <Form>
            <FormGroup>
              <Label>{gettext('Page name')}</Label>
              <Input value={this.state.pageName} onChange={this.handleChange} autoFocus={true} />
            </FormGroup>
            <FormGroup>
              <Label>{gettext('The file corresponding to this page')}</Label>
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

AddExistFileDialog.propTypes = propTypes;

export default AddExistFileDialog;
