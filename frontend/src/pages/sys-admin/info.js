import React, { Component, Fragment } from 'react';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, isPro, isDefaultAdmin } from '../../utils/constants';
import toaster from '../../components/toast';
import { Utils } from '../../utils/utils';
import Account from '../../components/common/account';
import Loading from '../../components/loading';
import '../../css/system-info.css';

class Info extends Component {

  constructor(props) {
    super(props);
    this.fileInput = React.createRef();
    this.state = {
      loading: true,
      errorMsg: '',
      sysInfo: {}
    };
  }

  componentDidMount () {
    seafileAPI.sysAdminGetSysInfo().then((res) => {
      this.setState({
        loading: false,
        sysInfo: res.data
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext('Permission denied')
          });
        } else {
          this.setState({
            loading: false,
            errorMsg: gettext('Error')
          });
        }
      } else {
        this.setState({
          loading: false,
          errorMsg: gettext('Please check the network.')
        });
      }
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
        <div className="main-panel-north">
          <div className="cur-view-toolbar">
            <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu"></span>
          </div>
          <div className="common-toolbar">
            <Account isAdminPanel={true} />
          </div>
        </div>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <h2 className="heading">{gettext('Info')}</h2>
            {loading && <Loading />}
            {errorMsg && <p className="error text-center mt-4">{errorMsg}</p>}
            {(!loading && !errorMsg) &&
            <div className="content position-relative">
              <div className="info-item">
                <h3 className="info-item-heading">{gettext('System Info')}</h3>
                {isPro ?
                  <Fragment>
                    {gettext('Professional Edition')}
                    {with_license && ' ' + this.renderLicenseDescString(license_mode, license_to, license_expiration)}
                    <br/>
                    {isDefaultAdmin &&
                      <Fragment>
                        <button className="btn btn-outline-primary" onClick={this.openFileInput}>{gettext('Upload license')}</button>
                        <input className="d-none" type="file" onChange={this.uploadLicenseFile} ref={this.fileInput} />
                      </Fragment>
                    }
                  </Fragment> :
                  <Fragment>
                    {gettext('Community Edition')}
                    <a href="http://manual.seafile.com/deploy_pro/migrate_from_seafile_community_server.html"
                      className="ml-1" target="_blank" rel="noopener noreferrer">{gettext('Upgrade to Pro Edition')}</a>
                  </Fragment>
                }
              </div>
              <div className="info-item">
                <h3 className="info-item-heading">{gettext('Libraries')} / {gettext('Files')}</h3>
                <span>{repos_count} / {total_files_count}</span>
              </div>
              <div className="info-item">
                <h3 className="info-item-heading">{gettext('Storage Used')}</h3>
                <span>{Utils.bytesToSize(total_storage)}</span>
              </div>
              <div className="info-item">
                <h3 className="info-item-heading">{gettext('Total Devices')} / {gettext('Current Connected Devices')}</h3>
                <span>{total_devices_count} / {current_connected_devices_count}</span>
              </div>
              {isPro ?
                <div className="info-item">
                  <h3 className="info-item-heading">{gettext('Activated Users')} / {gettext('Total Users')} / {gettext('Limits')}</h3>
                  <span>{active_users_count}{' / '}{users_count}{' / '}{with_license ? license_maxusers : '--'}</span>
                </div> :
                <div>
                  <h3 className="info-item-heading">{gettext('Activated Users')} / {gettext('Total Users')}</h3>
                  <span>{active_users_count} / {users_count}</span>
                </div>
              }
              <div className="info-item">
                <h3 className="info-item-heading">{gettext('Groups')}</h3>
                <span>{groups_count}</span>
              </div>
              {multi_tenancy_enabled &&
                <div className="info-item">
                  <h3 className="info-item-heading">{gettext('Organizations')}</h3>
                  <span>{org_count}</span>
                </div>
              }
            </div>
            }
          </div>
        </div>
      </Fragment>
    );
  }
}

export default Info;
