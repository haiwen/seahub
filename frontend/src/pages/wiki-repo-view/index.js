import React, { useEffect, useState } from 'react';
import { MetadataViewProvider } from './hooks/metadata-view';
import { MetadataMiddlewareProvider, MetadataProvider } from '../../metadata';
import { MetadataStatusProvider } from '../../hooks';
import { seafileAPI } from '../../utils/seafile-api';
import View from './view';
import ViewToolBar from './toolbar';

import './index.css';

const { repoID, wikiID, viewID } = window.app.pageOptions;

export default function WikiRepoView() {

  const [isLoading, setIsLoading] = useState(true);
  const [currentRepo, setCurrentRepo] = useState(null);

  useEffect(() => {
    seafileAPI.getRepoInfo(repoID).then(res => {
      setCurrentRepo(res.data);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) return null;

  return (
    <MetadataStatusProvider
      repoID={repoID}
      currentPath={'/'}
      repoInfo={currentRepo}
      hideMetadataView={false}
      statusCallback={() => {}}
    >
      <MetadataMiddlewareProvider
        repoID={repoID}
        repoInfo={currentRepo}
        currentPath={'/'}
        selectTagsView={() => {}}
        tagsChangedCallback={() => {}}
      >
        <MetadataProvider
          repoID={repoID}
          currentPath={'/'}
          repoInfo={currentRepo}
          selectMetadataView={() => {}}
        >
          <div className='wiki-repo-view'>
            <div className='wiki-repo-view-toolbar'>
              <ViewToolBar viewId={viewID} />
            </div>
            <div className='wiki-repo-view-content'>
              <MetadataViewProvider repoID={repoID} wikiID={wikiID} viewID={viewID}>
                <View />
              </MetadataViewProvider>
            </div>
          </div>
        </MetadataProvider>
      </MetadataMiddlewareProvider>
    </MetadataStatusProvider>
  );
}
