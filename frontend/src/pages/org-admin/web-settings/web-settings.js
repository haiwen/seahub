import React, { Component, Fragment } from 'react';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext, isPro, mediaUrl, logoPath, orgID, orgEnableAdminCustomLogo, orgEnableAdminCustomName } from '../../../utils/constants';
import Loading from '../../../components/loading';
import toaster from '../../../components/toast';
import MainPanelTopbar from '../main-panel-topbar';
import Section from './section';
import InputItem from './input-item';
import FileItem from './file-item';
import CheckboxItem from './checkbox-item';

import '../../../css/system-admin-web-settings.css';

class WebSettings extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      config_dict: null,
      logoPath: mediaUrl + logoPath,
    };
  }

  componentDidMount () {
    seafileAPI.orgAdminGetOrgInfo().then((res) => {
      this.setState({
        loading: false,
        config_dict: res.data
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  updateName= (key, newOrgName) => {
     seafileAPI.orgAdminUpdateName(orgID, newOrgName).then((res) => {
       this.setState({
         config_dict: res.data
       });
       toaster.success(gettext('Success'));
     }).catch((error) => {
       let errMessage = Utils.getErrorMsg(error);
       toaster.danger(errMessage);
     });
  }

  updateLogo = (file) => {
    seafileAPI.orgAdminUpdateLogo(orgID, file).then((res) => {
      this.setState({
        logoPath: mediaUrl + res.data.logo_path
      });
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    const { loading, errorMsg, config_dict, logoPath } = this.state;
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
              </Fragment>
              }
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default WebSettings;
