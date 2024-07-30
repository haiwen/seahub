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
import CheckboxItem from "../../sys-admin/web-settings/checkbox-item";

class OrgWebSettings extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      config_dict: null,
      logoPath: logoPath,
      file_ext_white_list: '',
      only_sso_login: false,
    };
  }

  componentDidMount() {
    seafileAPI.orgAdminGetOrgInfo().then((res) => {
      console.log(res.data)
      this.setState({
        loading: false,
        config_dict: res.data,
        file_ext_white_list: res.data.file_ext_white_list,
        only_sso_login: res.data.only_sso_login
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
      toaster.success(gettext('Success'));
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
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  updateSSOLgoin = (key, value) => {
    seafileAPI.orgAdminSetSysSettingInfo(orgID, key, value).then((res) => {
      this.setState({
        only_sso_login: res.data.only_sso_login
      });
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  updateFileExtWhiteList = (key, value) => {
    seafileAPI.orgAdminSetSysSettingInfo(orgID, key, value).then((res) => {
      this.setState({
        file_ext_white_list: res.data.file_ext_white_list
      });
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const { loading, errorMsg, config_dict, file_ext_white_list, only_sso_login } = this.state;
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
                      saveSetting={this.updateFileExtWhiteList}
                      displayName={gettext('File extension white list')}
                      keyText='file_ext_white_list'
                      value={file_ext_white_list}
                      helpTip={gettext('File extension white list for file upload via web UI and API. For example, "md;txt;docx". Empty means no limit.')}
                    />
                  </Fragment>
                </Section>
                <Section headingText={gettext('User Login')}>
                  {enableMultiADFS &&
                      <CheckboxItem
                      saveSetting={this.updateSSOLgoin}
                      displayName='Disable adfs user pwd login'
                      keyText='only_sso_login'
                      value={only_sso_login}
                      helpTip={gettext('Force user SSO login.')}
                    />}

                </Section>
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
