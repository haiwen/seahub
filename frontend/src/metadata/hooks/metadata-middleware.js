import React, { useContext } from 'react';
import { MetadataAIOperationsProvider } from './metadata-ai-operation';
import { TagsProvider } from '../../tag/hooks';
import { CollaboratorsProvider } from './collaborators';
import { useMetadataStatus } from '../../hooks';

const MetadataMiddlewareContext = React.createContext(null);

export const MetadataMiddlewareProvider = ({ repoID, currentPath, repoInfo, selectTagsView, tagsChangedCallback, children }) => {
  const { enableMetadata, enableTags, tagsLang } = useMetadataStatus();

  return (
    <MetadataMiddlewareContext.Provider value={{}}>
      <CollaboratorsProvider repoID={repoID}>
        <TagsProvider
          repoID={repoID}
          currentPath={currentPath}
          repoInfo={repoInfo}
          selectTagsView={selectTagsView}
          tagsChangedCallback={tagsChangedCallback}
        >
          <MetadataAIOperationsProvider
            repoID={repoID}
            enableMetadata={enableMetadata}
            enableTags={enableTags}
            tagsLang={tagsLang}
            repoInfo={repoInfo}
          >
            {children}
          </MetadataAIOperationsProvider>
        </TagsProvider>
      </CollaboratorsProvider>
    </MetadataMiddlewareContext.Provider>
  );
};

export const useMetadataMiddleware = () => {
  const context = useContext(MetadataMiddlewareContext);
  if (!context) {
    throw new Error('\'MetadataMiddlewareContext\' is null');
  }
  return context;
};
