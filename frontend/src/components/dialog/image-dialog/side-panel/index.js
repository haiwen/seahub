import React, { useEffect, useState } from 'react';
import { MetadataDetailsProvider } from '../../../../metadata';
import Title from '../../../dirent-detail/detail/header/title';
import { Utils } from '../../../../utils/utils';
import PreviewDetails from '../../../dirent-detail/dirent-details/preview-details';

import './index.css';
import FileDetails from '../../../dirent-detail/dirent-details/file-details';
import { Detail, Body } from '../../../dirent-detail/detail';
import { Icon } from '@seafile/sf-metadata-ui-component';

const SidePanel = ({ repoID, repoInfo, path, dirent, direntDetail, onFileTagChanged }) => {
  const [expanded, setExpanded] = useState(false);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  useEffect(() => {
    const element = document.querySelector('.sf-metadata-long-text-editor-dialog');
    if (element) {
      element.style.zIndex = 1052;
    }
  });

  return (
    <MetadataDetailsProvider
      repoID={repoID}
      repoInfo={repoInfo}
      path={path}
      dirent={dirent}
      direntDetail={direntDetail}
      direntType={dirent?.type !== 'file' ? 'dir' : 'file'}
    >
      <div className={`lightbox-side-panel ${expanded ? 'expanded' : 'collapsed'}`}>
        <button className="expand-button" onClick={handleExpandClick}>
          {expanded ? (
            <Icon iconName="right_arrow" />
          ) : (
            <Icon iconName="left_arrow" />
          )}
        </button>
        {expanded && (
          <>
            <div className="detail-header">
              <Title icon={Utils.getFileIconUrl(dirent.name)} iconSize={32} title={dirent.name} />
            </div>
            <Body>
              <div className="detail-content">
                <FileDetails
                  repoID={repoID}
                  repoInfo={repoInfo}
                  dirent={dirent}
                  path={path}
                  direntDetail={direntDetail}
                />
              </div>
            </Body>
          </>
        )}
      </div>
    </MetadataDetailsProvider>
  );
};

export default SidePanel;
