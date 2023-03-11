import React, { Component, Fragment } from 'react';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Loading from '../../components/loading';
import OrgAdminUserNav from '../../components/org-admin-user-nav';
import SetOrgUserName from '../../components/dialog/set-org-user-name';
import SetOrgUserContactEmail from '../../components/dialog/set-org-user-contact-email';
import SetOrgUserQuota from '../../components/dialog/set-org-user-quota';
import MainPanelTopbar from './main-panel-topbar';

import '../../css/org-admin-user.css';

const { orgID, orgName } = window.org.pageOptions;

class OrgUserProfile extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: ''
    };
  }

  componentDidMount() {
    const email = decodeURIComponent(this.props.email);
    seafileAPI.orgAdminGetOrgUserInfo(orgID, email).then((res) => {
      this.setState(Object.assign({
        loading: false
      }, res.data));
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  updateName = (name) => {
    this.setState({
      name: name
    });
  }

  updateContactEmail = (contactEmail) => {
    this.setState({
      contact_email: contactEmail
    });
  }

  updateQuota = (quota) => {
    this.setState({
      quota_total: quota
    });
  }

  render() {
    return (
      <Fragment>
        <MainPanelTopbar/>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <OrgAdminUserNav email={this.props.email} currentItem='profile' />
            <div className="cur-view-content">
              <Content
                data={this.state}
                updateName={this.updateName}
                updateContactEmail={this.updateContactEmail}
                updateQuota={this.updateQuota}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isSetNameDialogOpen: false,
      isSetContactEmailDialogOpen: false,
      isSetQuotaDialogOpen: false
    };
  }

  toggleSetNameDialog = () => {
    this.setState({
      isSetNameDialogOpen: !this.state.isSetNameDialogOpen
    });
  }

  toggleSetContactEmailDialog = () => {
    this.setState({
      isSetContactEmailDialogOpen: !this.state.isSetContactEmailDialogOpen
    });
  }

  toggleSetQuotaDialog = () => {
    this.setState({
      isSetQuotaDialogOpen: !this.state.isSetQuotaDialogOpen
    });
  }

  render() {
    const {
      loading, errorMsg,
      avatar_url, email, contact_email,
      name, quota_total, quota_usage
    } = this.props.data;
    const { isSetNameDialogOpen, isSetContactEmailDialogOpen, isSetQuotaDialogOpen } = this.state;

    if (loading) {
      return <Loading />;
    }
    if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    }

    return (
      <Fragment>
        <dl>
          <dt>{gettext('Avatar')}</dt>
          <dd>
            <img src={avatar_url} width="48" height="48" className="rounded" alt="" />
          </dd>

          <dt>ID</dt>
          <dd>{email}</dd>

          <dt>{gettext('Name')}</dt>
          <dd>
            {name || '--'}
            <span title={gettext('Edit')} className="attr-action-icon fa fa-pencil-alt" onClick={this.toggleSetNameDialog}></span>
          </dd>

          <dt>{gettext('Contact Email')}</dt>
          <dd>
            {contact_email || '--'}
            <span title={gettext('Edit')} className="attr-action-icon fa fa-pencil-alt" onClick={this.toggleSetContactEmailDialog}></span>
          </dd>

          <dt>{gettext('Organization')}</dt>
          <dd>{orgName}</dd>

          <dt>{gettext('Space Used / Quota')}</dt>
          <dd>
            {`${Utils.bytesToSize(quota_usage)}${quota_total > 0 ? ' / ' + Utils.bytesToSize(quota_total) : ''}`}
            <span title={gettext('Edit')} className="attr-action-icon fa fa-pencil-alt" onClick={this.toggleSetQuotaDialog}></span>
          </dd>
        </dl>
        {isSetNameDialogOpen &&
        <SetOrgUserName
          orgID={orgID}
          email={email}
          name={name}
          updateName={this.props.updateName}
          toggleDialog={this.toggleSetNameDialog}
        />
        }
        {isSetContactEmailDialogOpen &&
        <SetOrgUserContactEmail
          orgID={orgID}
          email={email}
          contactEmail={contact_email}
          updateContactEmail={this.props.updateContactEmail}
          toggleDialog={this.toggleSetContactEmailDialog}
        />
        }
        {isSetQuotaDialogOpen &&
        <SetOrgUserQuota
          orgID={orgID}
          email={email}
          quotaTotal={quota_total}
          updateQuota={this.props.updateQuota}
          toggleDialog={this.toggleSetQuotaDialog}
        />
        }
      </Fragment>
    );
  }
}

export default OrgUserProfile;
