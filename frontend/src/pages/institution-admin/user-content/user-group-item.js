import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot } from '../../../utils/constants';
import moment from 'moment';
import { Link } from '@gatsbyjs/reach-router';

const UserGroupItem = ({ group }) => {

  const [highlight, setHighlight] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setHighlight(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHighlight(false);
  }, []);

  const getRoleText = useCallback((group) => {
    let roleText;
    if (group.is_admin) {
      roleText = gettext('Admin');
      return roleText;
    }

    if (group.is_owner) {
      roleText = gettext('Owner');
      return roleText;
    }

    roleText = gettext('Member');
    return roleText;
  }, []);

  return (
    <tr className={highlight ? 'tr-highlight' : ''} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <td><Link to={`${siteRoot}sys/groups/${group.id}/libraries/`}>{group.name}</Link></td>
      <td>{getRoleText(group)}</td>
      <td>{moment(group.created_at).format('YYYY-MM-DD HH:mm')}</td>
      <td></td>
    </tr>
  );
};

UserGroupItem.propTypes = {
  group: PropTypes.object,
};

export default UserGroupItem;
