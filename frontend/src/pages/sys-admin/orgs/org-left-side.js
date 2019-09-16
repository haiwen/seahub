import React from 'react';
import PropTypes from 'prop-types';
import Logo from '../../../components/logo';
import { gettext } from '../../../utils/constants';
import { Button } from 'reactstrap';
import { Utils } from '../../../utils/utils';
import '../../../css/system-info.css';
import SysAdminSetOrgQuotaDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-set-org-quota-dialog';

const propTypes = {
  orgInfo: PropTypes.object.isRequired,
  updateQuota: PropTypes.func.isRequired
};

class OrgLeftSide extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isSetQuotaDialogOpen: false
    };
  }

  toggleSetQuotaDialog = () => {
    this.setState({isSetQuotaDialogOpen: !this.state.isSetQuotaDialogOpen});
  }

  updateQuota = (quotaTotal) => {
    this.props.updateQuota(quotaTotal);
    this.toggleSetQuotaDialog();
  }

  render() {
    let { org_name, users_count, groups_count, quota_usage } = this.props.orgInfo;
    let { isSetQuotaDialogOpen } = this.state;
    return (
      <div className={`side-panel`}>
        <div className="side-panel-north">
          <Logo/>
        </div>
        <div className="side-panel-center">
          <div className="side-nav">
            <div className="side-nav-con">
              <div className="info-item">
                <h3 style={{color:'#f7941d'}} className="info-item-heading">{org_name}</h3>
                <span>{gettext('Number of members')}<br/>{users_count}</span>
                <br/>
                <span>{gettext('Number of groups')}<br/>{groups_count}</span>
              </div>
              <div className="info-item">
                <h3 style={{color:'#f7941d'}} className="info-item-heading">{gettext('Space Used')}</h3>
                <span>{Utils.bytesToSize(quota_usage)}</span>
              </div>
              <Button color='primary' onClick={this.toggleSetQuotaDialog}>{gettext('Set Quota')}</Button>
              {isSetQuotaDialogOpen &&
                <SysAdminSetOrgQuotaDialog
                  toggle={this.toggleSetQuotaDialog}
                  onQuotaChanged={this.updateQuota}
                />
              }
            </div>
          </div>
        </div>
      </div>
    );
  }
}

OrgLeftSide.propTypes = propTypes;

export default OrgLeftSide;
