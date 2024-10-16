import React, { Component, Fragment } from 'react';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext, mediaUrl, logoPath, orgID, orgEnableAdminCustomLogo, orgEnableAdminCustomName, enableMultiADFS } from '../../../utils/constants';
import Loading from '../../../components/loading';
import toaster from '../../../components/toast';
import MainPanelTopbar from '../main-panel-topbar';
import Section from './section';
import InputItem from './input-item';
import FileItem from './file-item';

import '../../../css/system-admin-web-settings.css';
import CheckboxItem from '../../sys-admin/web-settings/checkbox-item';

const { sysEnableUserCleanTrash, sysEnableEncryptedLibrary } = window.org.pageOptions;


class OrgWebSettings extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      config_dict: null,
      logoPath: logoPath,
      file_ext_white_list: '',
      force_adfs_login: false,
      disable_org_encrypted_library: false,
      disable_org_user_clean_trash: false
    };
  }

  componentDidMount() {
    seafileAPI.orgAdminGetOrgInfo().then((res) => {
      this.setState({
        loading: false,
        config_dict: res.data,
        file_ext_white_list: res.data.file_ext_white_list,
        force_adfs_login: res.data.force_adfs_login,
        disable_org_encrypted_library: res.data.disable_org_encrypted_library,
        disable_org_user_clean_trash: res.data.disable_org_user_clean_trash
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  updateName = (key, newOrgName) => {
    seafileAPI.orgAdminUpdateName(orgID, newOrgName).then((res) => {
      this.setState({
        config_dict: res.data
      });
      toaster.success(gettext('Name updated'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  updateLogo = (file) => {
    seafileAPI.orgAdminUpdateLogo(orgID, file).then((res) => {
      this.setState({
        logoPath: res.data.logo_path
      });
      toaster.success(gettext('Logo updated'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  orgSaveSetting = (key, value) => {
    seafileAPI.orgAdminSetSysSettingInfo(orgID, key, value).then((res) => {
      toaster.success(gettext('System settings updated'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const { loading, errorMsg, config_dict, file_ext_white_list, force_adfs_login, disable_org_encrypted_library, disable_org_user_clean_trash } = this.state;
    let logoPath = this.state.logoPath;
    logoPath = logoPath.indexOf('image-view') != -1 ? logoPath : mediaUrl + logoPath;
    return (
      <Fragment>
        <MainPanelTopbar {...this.props} />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Settings')}</h3>
            </div>
            <div className="cur-view-content container mw-100">
              {loading && <Loading />}
              {errorMsg && <p className="error text-center mt-4">{errorMsg}</p>}
              {(!loading && !errorMsg) && config_dict &&
              <Fragment>
                <p className="small text-secondary my-4"></p>

                <Section headingText={gettext('Info')}>
                  <Fragment>
                    <InputItem
                      saveSetting={this.updateName}
                      displayName={gettext('Team name')}
                      keyText='orgName'
                      value={config_dict['org_name']}
                      helpTip={''}
                      disabled={!orgEnableAdminCustomName}
                    />
                    { orgEnableAdminCustomLogo && <FileItem
                      postFile={this.updateLogo}
                      displayName='Logo'
                      keyText='Logo'
                      filePath={logoPath}
                      fileWidth={256}
                      fileHeight={64}
                      helpTip='logo.png, 256px * 64px'
                    />
                    }
                  </Fragment>
                </Section>
                <Section headingText={gettext('File Upload')}>
                  <Fragment>
                    <InputItem
                      saveSetting={this.orgSaveSetting}
                      displayName={gettext('File extension white list')}
                      keyText='file_ext_white_list'
                      value={file_ext_white_list}
                      helpTip={gettext('File extension white list for file upload via web UI and API. For example, "md;txt;docx". Empty means no limit.')}
                    />
                  </Fragment>
                </Section>
                {enableMultiADFS &&
                  <Section headingText={gettext('User')}>
                    <CheckboxItem
                      saveSetting={this.orgSaveSetting}
                      displayName={gettext('Disable SAML user email / password login')}
                      keyText='force_adfs_login'
                      value={force_adfs_login}
                      helpTip={gettext('Force user to use SSO login if SAML account is bound')}
                    />
                  </Section>
                }
                {(sysEnableUserCleanTrash || sysEnableEncryptedLibrary) &&
                  <Section headingText={gettext('Library')}>
                    <Fragment>
                      {sysEnableEncryptedLibrary &&
                        <CheckboxItem
                          saveSetting={this.orgSaveSetting}
                          displayName='Encrypted library'
                          keyText='disable_org_encrypted_library'
                          value={disable_org_encrypted_library}
                          helpTip={gettext('Not allow user to create encrypted libraries')}
                        />
                      }
                      {sysEnableUserCleanTrash &&
                        <CheckboxItem
                          saveSetting={this.orgSaveSetting}
                          displayName='Disable user clean trash'
                          keyText='disable_org_user_clean_trash'
                          value={disable_org_user_clean_trash}
                          helpTip={gettext('Not allow user to clean library trash')}
                        />
                      }
                    </Fragment>
                  </Section>
                }
              </Fragment>
              }
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default OrgWebSettings;
