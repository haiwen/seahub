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
        return <a href={siteRoot + 'org/useradmin/info/' + userTrafficItem.email + '/'}>{userTrafficItem.name}</a>;
      }
      return <span>{'--'}</span>;
    case 'org':
      return <span>{userTrafficItem.org_name}</span>;
    default:
      return null;
  }
};

const OrgTrafficTableBody = props => (
  <SharedTrafficTableBody {...props} renderTrafficName={renderTrafficName} />
);

OrgTrafficTableBody.propTypes = propTypes;

export default OrgTrafficTableBody;
