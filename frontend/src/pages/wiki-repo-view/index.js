import React, { useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
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
    <DndProvider backend={HTML5Backend}>
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
            <MetadataViewProvider repoID={repoID} repoInfo={currentRepo} wikiID={wikiID} viewID={viewID}>
              <div className='wiki-repo-view'>
                <div className='wiki-repo-view-toolbar'>
                  <ViewToolBar viewId={viewID} />
                </div>
                <div className='wiki-repo-view-content'>
                  <View />
                </div>
              </div>
            </MetadataViewProvider>
          </MetadataProvider>
        </MetadataMiddlewareProvider>
      </MetadataStatusProvider>
    </DndProvider>

  );
}
