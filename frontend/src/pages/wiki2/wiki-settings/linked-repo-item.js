import React, { useCallback } from 'react';
import { Utils } from '../../../utils/utils';

export default function LinkedRepoItem({ repoItem, onDeleteLinkedRepo }) {
  const iconUrl = Utils.getLibIconUrl(repoItem);
  const onDeleteClick = useCallback(() => {
    onDeleteLinkedRepo(repoItem);
  }, [onDeleteLinkedRepo, repoItem]);
  return (
    <tr>
      <td className='repo-icon'>
        <img src={iconUrl} width={'24px'} alt="" className='mr-2'></img>
      </td>
      <td className='repo-name'>
        <span className='selected-option-item-name'>{repoItem.name}</span>
      </td>
      <td className='repo-op'>
        <span className='sf3-font sf3-font-delete1' onClick={onDeleteClick}></span>
      </td>
    </tr>
  );
}
