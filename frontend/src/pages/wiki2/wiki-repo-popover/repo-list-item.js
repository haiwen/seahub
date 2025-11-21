import React, { useCallback } from 'react';
import { Utils } from '../../../utils/utils';

export default function RepoListItem({ item, onItemClick }) {

  const iconUrl = Utils.getLibIconUrl(item);

  const onClick = useCallback(() => {
    onItemClick(item);
  }, [item, onItemClick]);

  return (
    <div className='repo-list-item' onClick={onClick}>
      <div className='d-flex'>
        <img src={iconUrl} width={'24px'} alt="" className='mr-2'></img>
        <div className='option-label'>{item.label}</div>
      </div>
    </div>
  );
}
