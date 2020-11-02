import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import UserItem from './org-user-item';

import '../../css/org-admin-paginator.css';

const propTypes = {
  currentTab: PropTypes.string.isRequired,
  toggleDelete: PropTypes.func.isRequired,
  toggleRevokeAdmin: PropTypes.func.isRequired,
  orgAdminUsers: PropTypes.array.isRequired,
  initOrgAdmin: PropTypes.func.isRequired
};

class OrgAdminList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false
    };
  }

  componentDidMount() {
    this.props.initOrgAdmin();
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

  render() {
    let orgAdminUsers = this.props.orgAdminUsers;

    return (
      <div className="cur-view-content">
        <table>
          <thead>
            <tr>
              <th width="30%">{gettext('Name')}</th>
              <th width="15%">{gettext('Status')}</th>
              <th width="20%">{gettext('Space Used')} / {gettext('Quota')}</th>
              <th width="25%">{gettext('Created At')} / {gettext('Last Login')}</th>
              <th width="10%">{/*Operations*/}</th>
            </tr>
          </thead>
          <tbody>
            {orgAdminUsers.map(item => {
              return (
                <UserItem
                  key={item.index}
                  user={item}
                  currentTab="admins"
                  isItemFreezed={this.state.isItemFreezed}
                  toggleDelete={this.props.toggleDelete}
                  toggleRevokeAdmin={this.props.toggleRevokeAdmin}
                  onFreezedItem={this.onFreezedItem}
                  onUnfreezedItem={this.onUnfreezedItem}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

OrgAdminList.propTypes = propTypes;

export default OrgAdminList;
