import React, { Component, Fragment } from 'react';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import Loading from '../../../components/loading';
import SysAdminSetInstitutionQuotaDialog from '../../../components/dialog/sysadmin-dialog/set-quota';
import MainPanelTopbar from '../main-panel-topbar';
import InstitutionNav from './institution-nav';

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isSetQuotaDialogOpen: false,
    };
  }

  toggleSetQuotaDialog = () => {
    this.setState({isSetQuotaDialogOpen: !this.state.isSetQuotaDialogOpen});
  }

  showEditIcon = (action) => {
    return (
      <span
        title={gettext('Edit')}
        className="fa fa-pencil-alt attr-action-icon"
        onClick={action}>
      </span>
    );
  }

  render() {
    const { loading, errorMsg, institutionInfo } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const { name, user_count, quota_total, quota_used } = institutionInfo;
      const { isSetQuotaDialogOpen } = this.state;
      return (
        <Fragment>
          <dl className="m-0">
            <dt className="info-item-heading">{gettext('Name')}</dt>
            <dd className="info-item-content">
              {name}
            </dd>

            <dt className="info-item-heading">{gettext('Number of members')}</dt>
            <dd className="info-item-content">{user_count}</dd>

            <dt className="info-item-heading">{gettext('Space Used')}</dt>
            <dd className="info-item-content">
              {`${Utils.bytesToSize(quota_used)} / ${quota_total > 0 ? Utils.bytesToSize(quota_total) : '--'}`}
              {this.showEditIcon(this.toggleSetQuotaDialog)}
            </dd>
          </dl>
          {isSetQuotaDialogOpen &&
          <SysAdminSetInstitutionQuotaDialog
            updateQuota={this.props.updateQuota}
            toggle={this.toggleSetQuotaDialog}
          />
          }
        </Fragment>
      );
    }
  }
}

class InstitutionInfo extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      institutionInfo: {}
    };
  }

  componentDidMount () {
    seafileAPI.sysAdminGetInstitution(this.props.institutionID).then((res) => {
      this.setState({
        loading: false,
        institutionInfo: res.data
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  updateQuota = (quota) => {
    seafileAPI.sysAdminUpdateInstitution(this.props.institutionID, quota).then(res => {
      const newInstitutionInfo = Object.assign(this.state.institutionInfo, {
        quota_total: res.data.quota_total,
      });
      this.setState({institutionInfo: newInstitutionInfo});
      toaster.success(gettext('Successfully set quota.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }


  render() {
    const { institutionInfo } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar {...this.props} />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <InstitutionNav currentItem="info" institutionID={this.props.institutionID} institutionName={institutionInfo.name} />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                institutionInfo={this.state.institutionInfo}
                updateQuota={this.updateQuota}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default InstitutionInfo;
