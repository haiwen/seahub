import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../../utils/utils';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import Loading from '../../../components/loading';
import EditIcon from '../../../components/edit-icon';
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
    this.setState({ isSetQuotaDialogOpen: !this.state.isSetQuotaDialogOpen });
  };

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
        <>
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
              <EditIcon onClick={this.toggleSetQuotaDialog} />
            </dd>
          </dl>
          {isSetQuotaDialogOpen &&
          <SysAdminSetInstitutionQuotaDialog
            updateQuota={this.props.updateQuota}
            toggle={this.toggleSetQuotaDialog}
          />
          }
        </>
      );
    }
  }
}

Content.propTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  getLogsByPage: PropTypes.func,
  resetPerPage: PropTypes.func,
  currentPage: PropTypes.number,
  perPage: PropTypes.number,
  pageInfo: PropTypes.object,
  hasNextPage: PropTypes.bool,
  institutionInfo: PropTypes.object.isRequired,
  updateQuota: PropTypes.func.isRequired,
};


class InstitutionInfo extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      institutionInfo: {}
    };
  }

  componentDidMount() {
    systemAdminAPI.sysAdminGetInstitution(this.props.institutionID).then((res) => {
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
    systemAdminAPI.sysAdminUpdateInstitution(this.props.institutionID, quota).then(res => {
      const newInstitutionInfo = Object.assign(this.state.institutionInfo, {
        quota_total: res.data.quota_total,
      });
      this.setState({ institutionInfo: newInstitutionInfo });
      toaster.success(gettext('Successfully set quota.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };


  render() {
    const { institutionInfo } = this.state;
    return (
      <>
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
      </>
    );
  }
}

InstitutionInfo.propTypes = {
  institutionID: PropTypes.string,
};

export default InstitutionInfo;
