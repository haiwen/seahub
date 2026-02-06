import React from 'react';
import Icon from './icon';
import { UncontrolledTooltip } from 'reactstrap';
import { gettext } from '../utils/constants';

export default function ArchiveIcon({ currentRepoInfo, className = 'ml-1' }) {

  if (currentRepoInfo.archive_status !== 'archived') return null;
  const id = `seafile-archive-${currentRepoInfo.repo_id}`;
  return (
    <>
      <Icon id={id} className={className} symbol="archive"></Icon>
      <UncontrolledTooltip
        target={id}
        placement="bottom"
      >
        {gettext('This library has been archived, cannot be updated.')}
      </UncontrolledTooltip>
    </>
  );
}
