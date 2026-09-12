import React from 'react';
import PropTypes from 'prop-types';
import SharedTrafficTableBody from '../../../components/admin/statistics/traffic-table-body';
import { siteRoot } from '../../../utils/constants';

const propTypes = {
  type: PropTypes.string.isRequired,
  userTrafficItem: PropTypes.object.isRequired,
};

const renderTrafficName = ({ userTrafficItem, type }) => {
  switch (type) {
    case 'user':
      if (userTrafficItem.name) {
        return <a href={siteRoot + 'sys/users/' + userTrafficItem.email + '/'}>{userTrafficItem.name}</a>;
      }
      return <span>{'--'}</span>;
    case 'org':
      if (userTrafficItem.org_name) {
        return <a href={siteRoot + 'sys/organizations/' + userTrafficItem.org_id + '/info/'}>{userTrafficItem.org_name}</a>;
      }
      return <span>{'--'}</span>;
    default:
      return null;
  }
};

const SysTrafficTableBody = props => (
  <SharedTrafficTableBody {...props} renderTrafficName={renderTrafficName} />
);

SysTrafficTableBody.propTypes = propTypes;

export default SysTrafficTableBody;
