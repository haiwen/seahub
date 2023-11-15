import React from 'react';
import PropTypes from 'prop-types';
import { gettext, internalFilePath, dirPath } from '../../utils/constants';
import { Modal, ModalHeader, ModalBody, Button, Input, ModalFooter, InputGroup } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';

const propTypes = {
  repo: PropTypes.object.isRequired,
  onSeaTableIntegrationToggle: PropTypes.func.isRequired,
};

class RepoSeaTableIntegrationDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      baseName: '',
      seaTableUrl: '',
      baseApiToken: '',
      isPasswordVisible: false,
    };
    this.repo = this.props.repo;
  }

  onInputChange = (e, key) => {
    let value = e.target.value;
    this.setState({
      [key]: value,
    });
  };

  getFile = () => {
    const { baseName, seaTableUrl, baseApiToken } = this.state;
    const fileName = internalFilePath.split('/')[2];
    const fileContent = JSON.stringify({
      [this.repo.repo_id]: {
        'base_name': baseName,
        'seatable_server_url': seaTableUrl,
        'base_api_token': baseApiToken
      }
    });
    const newFile = new File([fileContent], fileName);
    return newFile;
  };

  onSubmit = async () => {
    const { baseName, seaTableUrl, baseApiToken } = this.state;
    if (!baseName.trim()) {
      toaster.danger(gettext('Base name is required'));
      return;
    }
    else if (!seaTableUrl.trim()) {
      toaster.danger(gettext('URL is required'));
      return;
    }
    else if (!baseApiToken.trim()) {
      toaster.danger(gettext('API token required'));
      return;
    }

    const newFile = this.getFile();
    const [downloadLinkRes, err] = await seafileAPI.getFileDownloadLink(this.repo.repo_id, internalFilePath).then(res => [res, null]).catch((err) => [null, err]);
    // Replace
    if (downloadLinkRes && downloadLinkRes.data) {
      const fileInfoRes = await seafileAPI.getFileContent(downloadLinkRes.data);
      if (fileInfoRes?.data && fileInfoRes.data[this.repo.repo_id]) {
        const updateLink = await seafileAPI.getUpdateLink(this.repo.repo_id, internalFilePath.slice(0, 9));
        const fileName = internalFilePath.split('/')[2];
        await seafileAPI.updateFile(updateLink.data, internalFilePath, fileName, newFile).catch(err => {toaster.danger(gettext(err.message));});
        this.props.onSeaTableIntegrationToggle();
      }
    }
    // Add
    if (err) {
      const uploadLink = await seafileAPI.getFileServerUploadLink(this.repo.repo_id, dirPath);
      const formData = new FormData();
      formData.append('file', newFile);
      formData.append('relative_path', internalFilePath.split('/')[1]);
      formData.append('parent_dir', dirPath);
      await seafileAPI.uploadImage(uploadLink.data + '?ret-json=1', formData).catch(err => {toaster.danger(gettext(err.message));});
      this.props.onSeaTableIntegrationToggle();
    }
  };

  render() {
    const { isPasswordVisible, baseName, seaTableUrl, baseApiToken } = this.state;
    const { onSeaTableIntegrationToggle } = this.props;
    let repo = this.repo;
    const itemName = '<span class="op-target">' + Utils.HTMLescape(repo.repo_name) + '</span>';
    const title = gettext('{placeholder} SeaTable integration').replace('{placeholder}', itemName);

    return (
      <Modal
        isOpen={true} style={{maxWidth: '600px'}}
        toggle={onSeaTableIntegrationToggle}
      >
        <ModalHeader toggle={onSeaTableIntegrationToggle}>
          <p dangerouslySetInnerHTML={{__html: title}} className="m-0"></p>
        </ModalHeader>
        <ModalBody>
          <div className="o-auto" style={{padding: '0 1.5rem'}}>
            <div className='form-group'>
              <label>{gettext('Base Name')}</label>
              <Input
                type="text"
                id="baseName"
                value={baseName}
                onChange={(e) => {this.onInputChange(e, 'baseName');}}
              />
            </div>
            <div className='form-group'>
              <label>{gettext('SeaTable server URL')}</label>
              <Input
                type="text"
                id="SeaTableServerURL"
                value={seaTableUrl}
                onChange={(e) => {this.onInputChange(e, 'seaTableUrl');}}
              />
            </div>
            <div className='form-group'>
              <label>{gettext('Base API token')}</label>
              <InputGroup>
                <Input type={isPasswordVisible ? 'text' : 'password'} autoComplete="new-password" value={baseApiToken || ''} onChange={(e) => {this.onInputChange(e, 'baseApiToken');}}/>
                <span className='input-group-text' onClick={() => {this.setState({isPasswordVisible: !isPasswordVisible});}} style={{borderRadius: '0 3px 3px 0', height: '38px'}}>
                  <i className={`iconfont dtable-font ${isPasswordVisible ? 'icon-eye': 'icon-eye-slash'} cursor-pointer`}></i>
                </span>
              </InputGroup>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color='primary' onClick={this.onSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

RepoSeaTableIntegrationDialog.propTypes = propTypes;

export default RepoSeaTableIntegrationDialog;
