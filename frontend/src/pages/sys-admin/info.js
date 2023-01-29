import React, { Component, Fragment } from 'react';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, isPro, isDefaultAdmin } from '../../utils/constants';
import toaster from '../../components/toast';
import { Utils } from '../../utils/utils';
import Loading from '../../components/loading';
import MainPanelTopbar from './main-panel-topbar';

import '../../css/system-info.css';

class Info extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      sysInfo: {}
    };
    this.fileInput = React.createRef();
  }

  componentDidMount () {
    seafileAPI.sysAdminGetSysInfo().then((res) => {
      this.setState({
        loading: false,
        sysInfo: res.data
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  uploadLicenseFile = (e) => {

    // no file selected
    if (!this.fileInput.current.files.length) {
      return;
    }
    const file = this.fileInput.current.files[0];
    seafileAPI.sysAdminUploadLicense(file).then((res) => {
      let info = this.state.sysInfo;
      Object.assign(info, res.data, {with_license: true});
      this.setState({
        sysInfo: info
      });
    }).catch((error) => {
      let errMsg = Utils.getErrorMsg(error);
      toaster.danger(errMsg);
    });
  }

  openFileInput = () => {
    this.fileInput.current.click();
  }

  renderLicenseDescString = (license_mode, license_to, license_expiration) => {
    if (license_mode == 'life-time') {
      if (window.app.config.lang == 'zh-cn') {
        return '永久授权给 ' + license_to + '，技术支持服务至 ' + license_expiration + ' 到期';
      } else {
        return gettext('licensed to {placeholder_license_to}, upgrade service expired in {placeholder_license_expiration}')
          .replace('{placeholder_license_to}', license_to).replace('{placeholder_license_expiration}', license_expiration);
      }
    } else {
      return gettext('licensed to {placeholder_license_to}, expires on {placeholder_license_expiration}')
        .replace('{placeholder_license_to}', license_to).replace('{placeholder_license_expiration}', license_expiration);
    }
  }

  render() {
    let { license_mode, license_to, license_expiration, org_count,
      repos_count, total_files_count, total_storage, total_devices_count,
      current_connected_devices_count, license_maxusers, multi_tenancy_enabled,
      active_users_count, users_count, groups_count, with_license } = this.state.sysInfo;
    let { loading, errorMsg } = this.state;

    return (
      <Fragment>
        <MainPanelTopbar {...this.props} />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container system-admin-info">
            <h2 className="heading">{gettext('Info')}</h2>
            <div className="content">
              {loading && <Loading />}
              {errorMsg && <p className="error text-center mt-4">{errorMsg}</p>}
              {(!loading && !errorMsg) &&
              <dl className="flex-1 m-0">
                <dt className="info-item-heading">{gettext('System Info')}</dt>
                {isPro ?
                  <dd className="info-item-content">
                    {gettext('Professional Edition')}
                    {with_license &&
                      ' ' + this.renderLicenseDescString(license_mode, license_to, license_expiration)
                    }<br/>
                    {isDefaultAdmin &&
                      <Fragment>
                        <Button type="button" className="mt-2" onClick={this.openFileInput}>{gettext('Upload license')}</Button>
                        <input className="d-none" type="file" onChange={this.uploadLicenseFile} ref={this.fileInput} />
                      </Fragment>
                    }
                  </dd> :
                  <dd className="info-item-content">
                    {gettext('Community Edition')}
                    <a className="ml-1" href="https://download.seafile.com/published/seafile-manual/deploy_pro/migrate_from_seafile_community_server.md" target="_blank">{gettext('Upgrade to Pro Edition')}</a>
                  </dd>
                }
                <dt className="info-item-heading">{gettext('Libraries')} / {gettext('Files')}</dt>
                <dd className="info-item-content">{repos_count} / {total_files_count}</dd>

                <dt className="info-item-heading">{gettext('Storage Used')}</dt>
                <dd className="info-item-content">{Utils.bytesToSize(total_storage)}</dd>

                <dt className="info-item-heading">{gettext('Total Devices')} / {gettext('Current Connected Devices')}</dt>
                <dd className="info-item-content">{total_devices_count} / {current_connected_devices_count}</dd>

                {isPro ?
                  <Fragment>
                    <dt className="info-item-heading">{gettext('Activated Users')} / {gettext('Total Users')} / {gettext('Limits')}</dt>
                    <dd className="info-item-content">{active_users_count}{' / '}{users_count}{' / '}{with_license ? license_maxusers : '--'}</dd>
                  </Fragment> :
                  <Fragment>
                    <dt className="info-item-heading">{gettext('Activated Users')} / {gettext('Total Users')}</dt>
                    <dd className="info-item-content">{active_users_count} / {users_count}</dd>
                  </Fragment>
                }

                <dt className="info-item-heading">{gettext('Groups')}</dt>
                <dd className="info-item-content">{groups_count}</dd>

                {multi_tenancy_enabled &&
                  <Fragment>
                    <dt className="info-item-heading">{gettext('Organizations')}</dt>
                    <dd className="info-item-content">{org_count}</dd>
                  </Fragment>
                }
              </dl>
              }
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default Info;
