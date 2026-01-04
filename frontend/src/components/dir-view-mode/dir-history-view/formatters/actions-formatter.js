import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { siteRoot, gettext } from '../../../../utils/constants';

/**
 * Formatter for actions column
 * Displays "Current Version" for first commit or "View Snapshot" link for others
 * Only visible for users with write permission
 */
const ActionsFormatter = ({ record, repoID, userPerm }) => {
  const [isHovered, setIsHovered] = useState(false);

  if (!record || userPerm !== 'rw') return null;

  const { isFirstCommit, commit_id } = record;

  const className = isHovered ? '' : 'invisible';

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isFirstCommit ? (
        <span className={className}>{gettext('Current Version')}</span>
      ) : (
        <a
          href={`${siteRoot}repo/${repoID}/snapshot/?commit_id=${commit_id}`}
          className={className}
        >
          {gettext('View Snapshot')}
        </a>
      )}
    </div>
  );
};

ActionsFormatter.propTypes = {
  record: PropTypes.object,
  repoID: PropTypes.string.isRequired,
  userPerm: PropTypes.string,
};

export default ActionsFormatter;

