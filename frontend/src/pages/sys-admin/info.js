import React, { Component, Fragment } from 'react';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, isPro, isDefaultAdmin } from '../../utils/constants';
import toaster from '../../components/toast';
import { Utils } from '../../utils/utils';
import Account from '../../components/common/account';
import Loading from '../../components/loading';

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
    seafileAPI.getSysInfo().then((res) => {
      this.setState({
        loading: false,
        sysInfo: res.data,
        with_license: res.data.with_license
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
    seafileAPI.uploadLicense(file).then((res) => {
      let info = this.state.sysInfo;
      Object.assign(info, res.data);
      info.with_license = true;
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
              {loading && <Loading />}
              {errorMsg && <p className="error text-center">{errorMsg}</p>}
              {(!loading && !errorMsg) &&
              <dl>
                <dt>{gettext('System Info')}</dt>
                {isPro ?
                  <dd>
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
                  <dd>
                    {gettext('Community Edition')}
                    <a className="ml-1" href="http://manual.seafile.com/deploy_pro/migrate_from_seafile_community_server.html" target="_blank">{gettext('Upgrade to Pro Edition')}</a>
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
                    <dd>{active_users_count}{' / '}{users_count}{' / '}{with_license ? license_maxusers : '--'}</dd>
                  </Fragment> :
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
              }
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default Info;
