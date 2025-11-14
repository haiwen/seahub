import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { cloudMode, gettext, isOrgContext } from '../utils/constants';
import { seafileAPI } from '../utils/seafile-api';
import OpIcon from './op-icon';

import '../css/select-users-icon.css';

const propTypes = {
  onClick: PropTypes.func
};

class SelectUsersIcon extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      enableSelectMembersFromDept: false
    };
  }

  componentDidMount() {
    this.getPermForSelectMembersFromDept();
  }

  getPermForSelectMembersFromDept = () => {
    if (window.app.config.lang !== 'zh-cn') {
      this.setState({
        enableSelectMembersFromDept: false
      });
      return;
    }

    if (cloudMode && !isOrgContext) {
      this.setState({
        enableSelectMembersFromDept: false
      });
      return;
    }

    seafileAPI.listAddressBookDepartments().then((res) => {
      this.setState({
        enableSelectMembersFromDept: res.data.departments.length > 0
      });
    }).catch(error => {
      this.setState({
        enableSelectMembersFromDept: false
      });
    });
  };

  render() {
    const { enableSelectMembersFromDept } = this.state;
    return (
      <>
        {enableSelectMembersFromDept &&
          <OpIcon
            symbol="invite-visitors"
            className="toggle-detail-btn"
            title={gettext('Select members from department')}
            op={this.props.onClick}
          />
        }
      </>
    );
  }
}

SelectUsersIcon.propTypes = propTypes;

export default SelectUsersIcon;
