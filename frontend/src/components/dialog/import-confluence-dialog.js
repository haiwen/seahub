import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter, Label, Alert } from 'reactstrap';
import SeahubModalHeader from '../common/seahub-modal-header';
import { gettext, isPro } from '../../utils/constants';
import wikiAPI from '../../utils/wiki-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import { SeahubSelect } from '../common/select';

const propTypes = {
  toggleCancel: PropTypes.func.isRequired,
  importConfluence: PropTypes.func.isRequired,
  currentDeptID: PropTypes.string,
};

class ImportConfluenceDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      name: '',
      isSubmitBtnActive: false,
      selectedOption: null,
      options: [],
      selectedFile: null,
      isUploading: false
    };
    this.fileInputRef = React.createRef();
  }

  componentDidMount() {
    if (!isPro) return;
    wikiAPI.listWikiDepartments().then(res => {
      const departments = res.data.sort((a, b) => {
        return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
      });
      let options = [];
      for (let i = 0 ; i < departments.length; i++) {
        let obj = {};
        obj.value = departments[i].name;
        obj.id = departments[i].id;
        obj.email = departments[i].email;
        obj.label = departments[i].name;
        options.push(obj);
      }
      this.setState({ options });
      if (this.props.currentDeptID) {
        const selectedOption = options.find(op => op.id == this.props.currentDeptID);
        this.setState({ selectedOption });
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
    }
  };

  handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.html.zip')) {
      toaster.danger(gettext('Select a Confluence HTML exported file (.html.zip)'));
      return;
    }

    this.setState({
      selectedFile: file,
      name: file.name.replace('.html.zip', '')
    });
  };

  handleSubmit = () => {
    if (!this.state.selectedFile) {
      toaster.danger(gettext('Select a Confluence exported file'));
      return;
    }

    this.setState({ isUploading: true });
    let departmentID = this.state.selectedOption ? this.state.selectedOption.id : '';

    this.props.importConfluence(this.state.selectedFile, departmentID)
      .then((res) => {
        toaster.success(gettext('Confluence file imported'));
        this.props.toggleCancel();
      })
      .catch((error) => {
        let errorMsg = Utils.getErrorMsg(error);
        toaster.danger(errorMsg || gettext('Failed to import Confluence file'));
      })
      .finally(() => {
        this.setState({ isUploading: false });
      });
  };

  triggerFileInput = () => {
    this.fileInputRef.current.click();
  };

  toggle = () => {
    this.props.toggleCancel();
  };

  handleSelectChange = (option) => {
    this.setState({ selectedOption: option });
  };

  render() {
    const { selectedFile, isUploading } = this.state;

    return (
      <Modal isOpen={true} autoFocus={false} toggle={this.toggle}>
        <SeahubModalHeader toggle={this.toggle}>{gettext('Import Confluence Wiki')}</SeahubModalHeader>
        <ModalBody>
          <Label>{gettext('Confluence export file')}</Label>
          <div className="d-flex align-items-center">
            <input
              type="file"
              ref={this.fileInputRef}
              style={{ display: 'none' }}
              accept=".zip"
              onChange={this.handleFileChange}
            />
            <Button color="primary" onClick={this.triggerFileInput} disabled={isUploading}>
              {gettext('Select File')}
            </Button>
            <span className="ml-2">
              {selectedFile ? selectedFile.name : gettext('No file selected')}
            </span>
          </div>
          <small className="form-text text-muted">
            {gettext('Select a Confluence HTML export file (.html.zip)')}
          </small>
          <br />
          {isPro &&
            <>
              <Label className='mt-4'>{gettext('Wiki owner')} ({gettext('Optional')})</Label>
              <SeahubSelect
                onChange={this.handleSelectChange}
                options={this.state.options}
                hideSelectedOptions={true}
                placeholder={gettext('Select a department')}
                maxMenuHeight={200}
                value={this.state.selectedOption}
                noOptionsMessage={() => {return gettext('No options available');}}
              />
            </>
          }
          {selectedFile &&
            <Alert color="info" className="mt-3">
              {gettext('The import process may take several minutes depending on the size of your Confluence export.')}
            </Alert>
          }
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle} disabled={isUploading}>{gettext('Cancel')}</Button>
          <Button
            color="primary"
            onClick={this.handleSubmit}
            disabled={!this.state.selectedFile || !this.state.name.trim() || isUploading}
          >
            {isUploading ? gettext('Importing...') : gettext('Import')}
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}

ImportConfluenceDialog.propTypes = propTypes;

export default ImportConfluenceDialog;
