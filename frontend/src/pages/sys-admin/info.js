import React, { Component, Fragment } from 'react';
import { Label } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, isPro } from '../../utils/constants';
import toaster from '../../components/toast';
import { Utils } from '../../utils/utils';
import Account from '../../components/common/account';

class Info extends Component {

  constructor(props) {
    super(props);
    this.state = {
      sysInfo: {},
    };
  }

  componentDidMount = () =>{
    seafileAPI.getSysInfo().then((res) => {
      this.setState({
        sysInfo: res.data,
      });
    });
  }

  uploadLicenseFile = (e) => {
    let tmp = document.querySelector('#inputFile');
    let file = tmp.files[0];
    seafileAPI.uploadLicense(file).then((res) => {
      toaster.success();
    }).catch((error) => {
      let errMsg = Utils.getErrorMsg(error);
      toaster.danger(errMsg);
    });
  }

  renderLicenseDescString = (license_mode, license_to, license_expiration) => {
    if (license_mode == 'life-time') {
      return gettext('licensed to') + license_to + gettext('upgrade service expired in') + license_expiration;
    } else {
      return gettext('licensed to') + license_to + gettext('expires on') + license_expiration;
    }
  }

  renderUserDescString = (active_users_count, users_count, license_maxusers, with_license) => {
    if (with_license) {
      return active_users_count + ' / ' + users_count + ' / ' + license_maxusers;
    } else {
      return active_users_count + ' / ' + users_count + ' / --';
    }
  }

  render() {
    let { with_license, license_mode, license_to, license_expiration, org_count,
      repos_count, total_files_count, total_storage, total_devices_count, 
      current_connected_devices_count, license_maxusers, multi_tenancy_enabled,
      active_users_count, users_count, groups_count  } = this.state.sysInfo;
    return (
      <Fragment>
        <div className="main-panel-north border-left-show">
          <div className="cur-view-toolbar">
            <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu"></span>
          </div>
          <div className="common-toolbar">
            <Account isAdminPanel={true} />
          </div>
        </div>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Info')}</h3>
            </div>
            <div className="cur-view-content">
              <dl>
                <dt>{gettext('System Info')}</dt>
                {isPro ?
                  <dd>
                    {gettext('Professional Edition')}
                    {with_license &&
                      ' ' + this.renderLicenseDescString(license_mode, license_to, license_expiration)
                    }<br/>
                    <Label htmlFor="inputFile" className="primary" style={{borderStyle:'solid', borderWidth:'0.5px', borderRadius:'2px', padding:'3px 8px', cursor: 'pointer'}}>{gettext('Upload licence')}</Label>
                    <input id="inputFile" style={{visibility:'hidden', display:'none'}} type="file" onChange={this.uploadLicenseFile}/>
                  </dd> :
                  <dd>
                    {gettext('Community Edition')}
                    <a href="http://manual.seafile.com/deploy_pro/migrate_from_seafile_community_server.html" target="_blank">{gettext('Upgrade to Pro Edition')}</a>
                  </dd>
                }
                <dt>{gettext('Libraries')} / {gettext('Files')}</dt>
                <dd>{repos_count} / {total_files_count}</dd>

                <dt>{gettext('Storage Used')}</dt>
                <dd>{Utils.bytesToSize(total_storage)}</dd>

                <dt>{gettext('Total Devices')} / {gettext('Current Connected Devices')}</dt>
                <dd>{total_devices_count} / {current_connected_devices_count}</dd>

                {isPro ?
                  <Fragment>
                    <dt>{gettext('Activated Users')} / {gettext('Total Users')} / {gettext('Limits')}</dt>
                    <dd>{this.renderUserDescString(active_users_count, users_count, license_maxusers, with_license)}</dd>
                  </Fragment>: 
                  <Fragment>
                    <dt>{gettext('Activated Users')} / {gettext('Total Users')}</dt>
                    <dd>{active_users_count} / {users_count}</dd>
                  </Fragment>
                }

                <dt>{gettext('Groups')}</dt>
                <dd>{groups_count}</dd>

                {multi_tenancy_enabled &&
                  <Fragment>
                    <dt>{gettext('Organizations')}</dt>
                    <dd>{org_count}</dd>
                  </Fragment>
                }
              </dl>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default Info;
