import React, { Component, Fragment } from 'react';
import { InputGroupText } from 'reactstrap';
import { Utils } from '../../../utils/utils';
import { orgAdminAPI } from '../../../utils/org-admin-api';
import { gettext, mediaUrl, logoPath, orgID, orgEnableAdminCustomLogo, orgEnableAdminCustomName, orgEnableAdminDeleteOrg, enableMultiADFS } from '../../../utils/constants';
import Loading from '../../../components/loading';
import toaster from '../../../components/toast';
import MainPanelTopbar from '../main-panel-topbar';
import Section from '../../common-admin/web-settings/section';
import CheckboxItem from '../../common-admin/web-settings/checkbox-item';
import FileItem from '../../common-admin/web-settings/file-item';
import InputItem from './input-item';
import DeleteOrganizationDialog from '../../../components/dialog/org-admin-delete-org-dialog';

import '../../../css/system-admin-web-settings.css';

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
      disable_org_user_clean_trash: false,
      user_default_quota: 0,
      isDeleteOrganizationDialogShow: false,
    };
  }

  componentDidMount() {
    orgAdminAPI.orgAdminGetOrgInfo().then((res) => {
      const { user_default_quota } = res.data;
      let user_default_quota_displayed;
      if (user_default_quota == -1 || // not set
        user_default_quota == 0 || // default
        user_default_quota < 0) { // a value less than 0, set by users
        user_default_quota_displayed = 0;
      } else {
        const i = parseInt(Math.floor(Math.log(user_default_quota) / Math.log(1000)), 10);
        user_default_quota_displayed = (user_default_quota / (1000 ** i));
      }
      this.setState({
        loading: false,
        config_dict: res.data,
        file_ext_white_list: res.data.file_ext_white_list,
        force_adfs_login: res.data.force_adfs_login,
        disable_org_encrypted_library: res.data.disable_org_encrypted_library,
        disable_org_user_clean_trash: res.data.disable_org_user_clean_trash,
        user_default_quota: user_default_quota_displayed
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  updateName = (key, newOrgName) => {
    orgAdminAPI.orgAdminUpdateName(orgID, newOrgName).then((res) => {
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
    orgAdminAPI.orgAdminUpdateLogo(orgID, file).then((res) => {
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
    orgAdminAPI.orgAdminSetSysSettingInfo(orgID, key, value).then((res) => {
      toaster.success(gettext('Setting updated'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  orgUpdateUserDefaultQuota = (key, quota) => {
    orgAdminAPI.orgAdminSetOrgUserDefaultQuota(orgID, parseInt(quota)).then((res) => {
      toaster.success(gettext('User default quota updated'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  toggleDeleteOrganization = () => {
    this.setState({ isDeleteOrganizationDialogShow: !this.state.isDeleteOrganizationDialogShow });
  };

  deleteOrganization = () => {
    orgAdminAPI.orgAdminDeleteOrg(orgID).then((res) => {
      window.location.href = '/';
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const { loading, errorMsg, config_dict, file_ext_white_list, force_adfs_login, disable_org_encrypted_library, disable_org_user_clean_trash, user_default_quota } = this.state;
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
                    {orgEnableAdminCustomLogo &&
                      <FileItem
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
                          displayName={gettext('Encrypted library')}
                          keyText='disable_org_encrypted_library'
                          value={disable_org_encrypted_library}
                          helpTip={gettext('Not allow user to create encrypted libraries')}
                        />
                      }
                      {sysEnableUserCleanTrash &&
                        <CheckboxItem
                          saveSetting={this.orgSaveSetting}
                          displayName={gettext('Disable user clean trash')}
                          keyText='disable_org_user_clean_trash'
                          value={disable_org_user_clean_trash}
                          helpTip={gettext('Not allow user to clean library trash')}
                        />
                      }
                    </Fragment>
                  </Section>
                }
                <Section headingText={gettext('User')}>
                  <Fragment>
                    <InputItem
                      className={'form-control'}
                      saveSetting={this.orgUpdateUserDefaultQuota}
                      displayName={gettext('User default quota')}
                      value={user_default_quota}
                      helpTip={gettext('Tip: 0 means default limit, the unit is MB')}
                      inputAddon={
                        <InputGroupText>MB</InputGroupText>
                      }
                    />
                  </Fragment>
                </Section>
                {orgEnableAdminDeleteOrg &&
                  <Section headingText={gettext('Delete')}>
                    <Fragment>
                      <button onClick={this.toggleDeleteOrganization.bind(this, null)} className="btn btn-outline-primary" >
                        {gettext('Delete Organization')}
                      </button>
                    </Fragment>
                  </Section>
                }
              </Fragment>
              }
            </div>
          </div>
        </div>
        {this.state.isDeleteOrganizationDialogShow &&
          <DeleteOrganizationDialog
            organizationName={config_dict['org_name']}
            toggle={this.toggleDeleteOrganization}
            handleSubmit={this.deleteOrganization}
          />
        }
      </Fragment>
    );
  }
}

export default OrgWebSettings;
