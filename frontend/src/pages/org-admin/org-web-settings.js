import React, { Component, Fragment } from 'react';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, isPro, orgID, } from '../../utils/constants';
import Loading from '../../components/loading';
import toaster from '../../components/toast';
import MainPanelTopbar from './main-panel-topbar';
import Section from './section';
import InputItem from './web-settings-input-item';


class OrgWebSettings extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      config_dict: null,
    };
  }

  componentDidMount () {
    seafileAPI.orgAdminGetSysSettingInfo(orgID).then((res) => {
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

  saveSetting = (key, value) => {
    seafileAPI.orgAdminSetSysSettingInfo(orgID, key, value).then((res) => {
      this.setState({
        config_dict: res.data
      });
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    const { loading, errorMsg, config_dict } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar />
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
                <Section headingText='File Upload'>
                  <Fragment>
                    <InputItem
                      saveSetting={this.saveSetting}
                      displayName='file_ext_white_list'
                      keyText='file_ext_white_list'
                      value={config_dict['file_ext_white_list']}
                      helpTip={gettext('File upload format whitelist. For example: "md;txt;docx", empty means no limit.')}
                    />
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

export default OrgWebSettings;
