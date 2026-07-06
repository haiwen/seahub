import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { I18nextProvider } from 'react-i18next';
import Loading from '../../components/loading';
import wikiAPI from '../../utils/wiki-api';
import SDocServerApi from '../../utils/sdoc-server-api';
import { mediaUrl, seadocServerUrl, wikiId } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { SdocWikiEditor } from '@seafile/seafile-sdoc-editor';
import i18n from '../../_i18n/i18n-sdoc-editor';

const centeredContainerStyle = {
  flex: 1,
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

function DocViewer({ pageId }) {
  const [state, setState] = useState({
    isLoading: true,
    errorMessage: '',
    docUuid: '',
    docContent: null,
    latestContributor: '',
    lastModified: '',
  });

  const scrollRef = useRef(document.getElementById('wiki-scroll-container'));

  useEffect(() => {
    let isCancelled = false;

    async function loadDocContent() {
      if (!pageId) {
        setState({
          isLoading: false,
          errorMessage: '',
          docUuid: '',
          docContent: null,
          latestContributor: '',
          lastModified: '',
        });
        return;
      }

      setState({
        isLoading: true,
        errorMessage: '',
        docUuid: '',
        docContent: null,
        latestContributor: '',
        lastModified: '',
      });

      try {
        const pageRes = await wikiAPI.getWiki2PublishPage(wikiId, pageId);
        const { latest_contributor, last_modified, seadoc_access_token, assets_url } = pageRes.data;
        const docUuid = assets_url.slice(assets_url.lastIndexOf('/') + 1);
        const sdocServerApi = new SDocServerApi({
          docUuid,
          sdocServer: seadocServerUrl,
          accessToken: seadoc_access_token,
        });
        const { mediaUrl, serviceURL, siteRoot, lang } = window.app.config;

        window.seafile = {
          lang,
          serviceUrl: serviceURL,
          siteRoot,
          mediaUrl,
          assetsUrl: '/api/v2.1/seadoc/download-image/' + docUuid,
          wikiId,
          docUuid,
        };

        const docRes = await sdocServerApi.getDocContent();
        if (isCancelled) return;

        setState({
          isLoading: false,
          errorMessage: '',
          docUuid,
          docContent: docRes.data,
          latestContributor: latest_contributor || '',
          lastModified: last_modified || '',
        });
      } catch (error) {
        if (isCancelled) return;

        setState({
          isLoading: false,
          errorMessage: Utils.getErrorMsg(error),
          docUuid: '',
          docContent: null,
          latestContributor: '',
          lastModified: '',
        });
      }
    }

    loadDocContent();

    return () => {
      isCancelled = true;
    };
  }, [pageId]);

  if (state.isLoading) {
    return <div className="wiki-viewer-loading" style={centeredContainerStyle}><Loading /></div>;
  }

  if (state.errorMessage) {
    return <div className="wiki-viewer-error" style={centeredContainerStyle}>{state.errorMessage}</div>;
  }

  if (!state.docContent) {
    return null;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <SdocWikiEditor
        document={state.docContent}
        docUuid={state.docUuid}
        isWikiReadOnly={true}
        scrollRef={scrollRef}
        collaborators={[]}
        showComment={false}
        showOutline={false}
        isShowRightPanel={false}
        setEditor={() => {}}
        mathJaxSource={mediaUrl + 'js/mathjax/tex-svg.js'}
      />
    </I18nextProvider>
  );
}

DocViewer.propTypes = {
  pageId: PropTypes.string,
};

export default DocViewer;
