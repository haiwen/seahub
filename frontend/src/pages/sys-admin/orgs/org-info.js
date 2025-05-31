import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Row, Col } from 'reactstrap';
import { Utils } from '../../../utils/utils';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { gettext, serviceURL } from '../../../utils/constants';
import toaster from '../../../components/toast';
import Loading from '../../../components/loading';
import EditIcon from '../../../components/edit-icon';
import SysAdminSetOrgQuotaDialog from '../../../components/dialog/sysadmin-dialog/set-quota';
import SysAdminSetOrgNameDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-set-org-name-dialog';
import SysAdminSetOrgMaxUserNumberDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-set-org-max-user-number-dialog';
import MainPanelTopbar from '../main-panel-topbar';
import OrgNav from './org-nav';

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isSetQuotaDialogOpen: false,
      isSetNameDialogOpen: false,
      isSetMaxUserNumberDialogOpen: false
    };
  }

  toggleSetQuotaDialog = () => {
    this.setState({ isSetQuotaDialogOpen: !this.state.isSetQuotaDialogOpen });
  };

  toggleSetNameDialog = () => {
    this.setState({ isSetNameDialogOpen: !this.state.isSetNameDialogOpen });
  };

  toggleSetMaxUserNumberDialog = () => {
    this.setState({ isSetMaxUserNumberDialogOpen: !this.state.isSetMaxUserNumberDialogOpen });
  };

  render() {
    const { loading, errorMsg } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const { org_name, users_count, max_user_number, groups_count, quota, quota_usage, enable_saml_login, metadata_url, domain } = this.props.orgInfo;
      const { isSetQuotaDialogOpen, isSetNameDialogOpen, isSetMaxUserNumberDialogOpen } = this.state;
      return (
        <>
          <dl className="m-0">
            <dt className="info-item-heading">{gettext('Name')}</dt>
            <dd className="info-item-content">
              {org_name}
              <EditIcon onClick={this.toggleSetNameDialog} />
            </dd>

            <dt className="info-item-heading">{gettext('Number of members')}</dt>
            <dd className="info-item-content">{users_count}</dd>

            {max_user_number &&
              <>
                <dt className="info-item-heading">{gettext('Max number of members')}</dt>
                <dd className="info-item-content">
                  {max_user_number}
                  <EditIcon onClick={this.toggleSetMaxUserNumberDialog} />
                </dd>
              </>
            }

            <dt className="info-item-heading">{gettext('Number of groups')}</dt>
            <dd className="info-item-content">{groups_count}</dd>

            <dt className="info-item-heading">{gettext('Space Used')}</dt>
            <dd className="info-item-content">
              {`${Utils.bytesToSize(quota_usage)} / ${quota > 0 ? Utils.bytesToSize(quota) : '--'}`}
              <EditIcon onClick={this.toggleSetQuotaDialog} />
            </dd>
            {enable_saml_login &&
              <>
                <dt className="info-item-heading">{gettext('SAML Config')}</dt>
                <dd className="info-item-content">
                  <Row className="my-4">
                    <Col md="4">Identifier (Entity ID)</Col>
                    <Col md="6">{`${serviceURL}/org/custom/${this.props.orgID}/saml2/metadata/`}</Col>
                  </Row>
                </dd>
                <dd className="info-item-content">
                  <Row className="my-4">
                    <Col md="4">Reply URL (Assertion Consumer Service URL)</Col>
                    <Col md="6">{`${serviceURL}/org/custom/${this.props.orgID}/saml2/acs/`}</Col>
                  </Row>
                </dd>
                <dd className="info-item-content">
                  <Row className="my-4">
                    <Col md="4">SAML App Federation Metadata URL</Col>
                    <Col md="6">{metadata_url}</Col>
                  </Row>
                </dd>
                <dd className="info-item-content">
                  <Row className="my-4">
                    <Col md="4">{gettext('Email Domain')}</Col>
                    <Col md="6">{domain}</Col>
                  </Row>
                </dd>
              </>
            }
          </dl>
          {isSetQuotaDialogOpen &&
          <SysAdminSetOrgQuotaDialog
            updateQuota={this.props.updateQuota}
            toggle={this.toggleSetQuotaDialog}
          />
          }
          {isSetNameDialogOpen &&
          <SysAdminSetOrgNameDialog
            name={org_name}
            updateName={this.props.updateName}
            toggle={this.toggleSetNameDialog}
          />
          }
          {isSetMaxUserNumberDialogOpen &&
          <SysAdminSetOrgMaxUserNumberDialog
            value={max_user_number}
            updateValue={this.props.updateMaxUserNumber}
            toggle={this.toggleSetMaxUserNumberDialog}
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
  getDeviceErrorsListByPage: PropTypes.func,
  resetPerPage: PropTypes.func,
  curPerPage: PropTypes.number,
  orgID: PropTypes.string,
  orgInfo: PropTypes.object,
  updateQuota: PropTypes.func.isRequired,
  updateName: PropTypes.func.isRequired,
  updateMaxUserNumber: PropTypes.func.isRequired,
};

class OrgInfo extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      orgInfo: {}
    };
  }

  componentDidMount() {
    systemAdminAPI.sysAdminGetOrg(this.props.orgID).then((res) => {
      this.setState({
        loading: false,
        orgInfo: res.data
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  updateQuota = (quota) => {
    const data = { quota: quota };
    systemAdminAPI.sysAdminUpdateOrg(this.props.orgID, data).then(res => {
      const newOrgInfo = Object.assign(this.state.orgInfo, {
        quota: res.data.quota
      });
      this.setState({ orgInfo: newOrgInfo });
      toaster.success(gettext('Successfully set quota.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  updateName = (orgName) => {
    const data = { orgName: orgName };
    systemAdminAPI.sysAdminUpdateOrg(this.props.orgID, data).then(res => {
      const newOrgInfo = Object.assign(this.state.orgInfo, {
        org_name: res.data.org_name
      });
      this.setState({ orgInfo: newOrgInfo });
      toaster.success(gettext('Successfully set name.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  updateMaxUserNumber = (newValue) => {
    const data = { maxUserNumber: newValue };
    systemAdminAPI.sysAdminUpdateOrg(this.props.orgID, data).then(res => {
      const newOrgInfo = Object.assign(this.state.orgInfo, {
        max_user_number: res.data.max_user_number
      });
      this.setState({ orgInfo: newOrgInfo });
      toaster.success(gettext('Successfully set max number of members.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const { orgInfo } = this.state;
    return (
      <>
        <MainPanelTopbar {...this.props} />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <OrgNav currentItem="info" orgID={this.props.orgID} orgName={orgInfo.org_name} />
            <div className="cur-view-content">
              <Content
                orgID={this.props.orgID}
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                orgInfo={this.state.orgInfo}
                updateQuota={this.updateQuota}
                updateName={this.updateName}
                updateMaxUserNumber={this.updateMaxUserNumber}
              />
            </div>
          </div>
        </div>
      </>
    );
  }
}

OrgInfo.propTypes = {
  orgID: PropTypes.string,
  orgInfo: PropTypes.object,
};

export default OrgInfo;
