import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
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

  testSeafileRepoAPIToken = () => {
    const { t } = this.props;
    let { seafile_url, repo_api_token } = this.state;
    seafile_url = seafile_url.trim();
    repo_api_token = repo_api_token.trim();
    if (seafile_url.slice(seafile_url.length-1) === '/') {
      seafile_url = seafile_url.slice(0, seafile_url.length - 1);
    }
    this.setState({ seafile_url, repo_api_token });
    window.dtableWebAPI.getSeafileRepoInfo(seafile_url, repo_api_token).then(resp => {
      let {repo_name, repo_id} = resp.data;
      if (repo_id && repo_name) {
        this.setState({
          repoInfo: resp.data,
          stage: 'toSubmit',
        });
      }
    }).catch((e)=> {
      this.setState({
        errMessage: t('URL_or_library_API_token_is_invalid'),
      });
    });
  };

  onSubmit = () => {
    const { baseName, seaTableUrl, baseApiToken } = this.state;
    console.log('baseName', baseName);
    console.log('seaTableUrl', seaTableUrl);
    console.log('baseApiToken', baseApiToken);
    if (!baseName.trim()) {
      toaster.danger(gettext('Base_name_is_required'));
      return;
    }
    else if (!seaTableUrl.trim()) {
      toaster.danger(gettext('URL_is_required'));
      return;
    }
    else if (!baseApiToken.trim()) {
      toaster.danger(gettext('API_token_required'));
      return;
    }

    console.log(window);
    console.log('seafileAPI', seafileAPI);

  };

  render() {
    const { isPasswordVisible } = this.state;
    let repo = this.repo;
    const itemName = '<span class="op-target">' + Utils.HTMLescape(repo.repo_name) + '</span>';
    const title = gettext('{placeholder} SeaTable integration').replace('{placeholder}', itemName);

    return (
      <Modal
        isOpen={true} style={{maxWidth: '600px'}}
        toggle={this.props.onSeaTableIntegrationToggle}
      >
        <ModalHeader toggle={this.props.onSeaTableIntegrationToggle}>
          <p dangerouslySetInnerHTML={{__html: title}} className="m-0"></p>
        </ModalHeader>
        <ModalBody>
          <div className="o-auto" style={{padding: '0 1.5rem'}}>
            <div className='form-group'>
              <label>{gettext('Base Name')}</label>
              <Input
                type="text"
                id="baseName"
                value={this.state.baseName}
                onChange={(e) => {this.onInputChange(e, 'baseName');}}
              />
            </div>
            <div className='form-group'>
              <label>{gettext('SeaTable server URL')}</label>
              <Input
                type="text"
                id="SeaTableServerURL"
                value={this.state.seaTableUrl}
                onChange={(e) => {this.onInputChange(e, 'seaTableUrl');}}
              />
            </div>
            <div className='form-group'>
              <label>{gettext('Base API token')}</label>
              <InputGroup>
                <Input type={isPasswordVisible ? 'text' : 'password'} autocomplete="new-password" value={this.state.baseApiToken || ''} onChange={(e) => {this.onInputChange(e, 'baseApiToken');}}/>
                <span className='input-group-text' onClick={() => {this.setState({isPasswordVisible: !this.state.isPasswordVisible});}} style={{borderRadius: '0 3px 3px 0', height: '38px'}}>
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
