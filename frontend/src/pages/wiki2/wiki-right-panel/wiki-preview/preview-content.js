import React from 'react';
import { SdocWikiEditor } from '@seafile/seafile-sdoc-editor';
import RightHeader from '../../wiki-right-header';
import { mediaUrl } from '../../../../utils/constants';

const PreviewContent = ({
  docContent,
  previewDocUuid,
  setEditor,
  scrollRef,
  isSdocPreview,
  currentPageConfig,
}) => (
  <>
    {!isSdocPreview && (
      <RightHeader
        currentPageConfig={currentPageConfig && { ...currentPageConfig, locked: true }}
      />
    )}
    <SdocWikiEditor
      document={docContent}
      docUuid={previewDocUuid}
      isWikiReadOnly={true}
      scrollRef={scrollRef}
      collaborators={[]}
      showComment={false}
      isShowRightPanel={false}
      setEditor={setEditor}
      mathJaxSource={mediaUrl + 'js/mathjax/tex-svg.js'}
    />
  </>
);

export default PreviewContent;
