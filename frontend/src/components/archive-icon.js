import React from 'react';
import Icon from './icon';
import { gettext } from '../utils/constants';
import Tooltip from './tooltip';

export default function ArchiveIcon({ currentRepoInfo, className = 'ml-1' }) {

  if (currentRepoInfo.archive_status !== 'archived') return null;
  const id = `seafile-archive-${currentRepoInfo.repo_id}`;
  return (
    <>
      <Icon id={id} className={className} symbol="archive"></Icon>
      <Tooltip target={id} placement='bottom'>{gettext('This library has been archived, cannot be updated.')}</Tooltip>
    </>
  );
}
