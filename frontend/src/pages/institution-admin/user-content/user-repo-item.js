import React, { useCallback, useState } from 'react';
import { Link } from '@gatsbyjs/reach-router';
import PropTypes from 'prop-types';
import { enableSysAdminViewRepo, gettext, isPro, siteRoot } from '@/utils/constants';
import dayjs from '@/utils/dayjs';
import { Utils } from '@/utils/utils';

const UserRepoItem = ({ repo }) => {

  const [highlight, setHighlight] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setHighlight(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHighlight(false);
  }, []);

  const renderRepoName = (repo) => {
    if (repo.name) {
      if (isPro && enableSysAdminViewRepo && !repo.encrypted) {
        return <Link to={`${siteRoot}sys/libraries/${repo.id}/`}>{repo.name}</Link>;
      } else {
        return repo.name;
      }
    } else {
      return gettext('Broken ({repo_id_placeholder})').replace('{repo_id_placeholder}', repo.id);
    }
  };

  const iconUrl = Utils.getLibIconUrl(repo);
  const iconTitle = Utils.getLibIconTitle(repo);

  return (
    <tr key={repo.id} className={highlight ? 'tr-highlight' : ''} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
      <td>{renderRepoName(repo)}</td>
      <td>{Utils.bytesToSize(repo.size)}</td>
      <td>{dayjs(repo.last_modified).fromNow()}</td>
      <td data-id={repo.id} data-name={repo.name}></td>
    </tr>
  );
};

UserRepoItem.propTypes = {
  repo: PropTypes.object,
};

export default UserRepoItem;
