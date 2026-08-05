import React, { useCallback, useContext, useEffect, useState } from 'react';
import deepCopy from 'deep-copy';
import { chatAPI } from '../../../../utils/chat-api';
import { useAskPage } from './page-type';
import { useSessions } from './sessions';

const DocumentsContext = React.createContext(null);

export const getDocumentKey = (document) => {
  if (!document) {
    return '';
  }
  if (document.kind === 'markdown_artifact' && document.fileUuid) {
    return `markdown_artifact:${document.fileUuid}`;
  }
  return document.document_key || document.url || `${document.repo_id || ''}:${document.path || document.name || ''}`;
};

export const DocumentsProvider = ({ children }) => {
  const [isShowDocuments, setIsShowDocuments] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);

  const { pageSlugId } = useAskPage();
  const { closeShowSessions } = useSessions();

  const openDocument = useCallback((document) => {
    if (!document) {
      return;
    }
    if (!isShowDocuments && typeof window !== 'undefined') {
      const mathJaxScript = window.document?.getElementById('mathjax');
      if (mathJaxScript?.parentNode) {
        mathJaxScript.parentNode.removeChild(mathJaxScript);
      }
    }
    const applyOpenDocument = (nextDocument) => {
      setIsShowDocuments(true);
      setDocuments((currentDocuments) => {
        const existedDocument = currentDocuments.find((item) => getDocumentKey(item) === nextDocument.document_key);
        if (existedDocument) {
          const nextDocuments = currentDocuments.map((item) => {
            if (getDocumentKey(item) !== nextDocument.document_key) {
              return item;
            }
            return { ...item, ...nextDocument };
          });
          return deepCopy(nextDocuments);
        }
        return deepCopy([nextDocument, ...currentDocuments]);
      });
      setCurrentDocument(deepCopy(nextDocument));
      closeShowSessions();
    };

    const nextDocument = {
      ...document,
      document_key: getDocumentKey(document),
    };

    if (document.kind === 'markdown_artifact' && document.fileUuid) {
      setIsShowDocuments(true);
      setCurrentDocument(deepCopy(nextDocument));
      closeShowSessions();
      setIsDocumentLoading(true);
      chatAPI.getMarkdownArtifact(document.fileUuid).then((res) => {
        const { content = '', path = '' } = res.data || {};
        applyOpenDocument({ ...nextDocument, content, path });
      }).catch(() => {
        applyOpenDocument(nextDocument);
      }).finally(() => {
        setIsDocumentLoading(false);
      });
      return;
    }

    setIsDocumentLoading(false);
    applyOpenDocument(nextDocument);
  }, [closeShowSessions, isShowDocuments]);

  const closeDocument = useCallback((document) => {
    if (!document) {
      return;
    }
    setDocuments((currentDocuments) => {
      const documentIndex = currentDocuments.findIndex((item) => getDocumentKey(item) === getDocumentKey(document));
      if (documentIndex < 0) {
        return currentDocuments;
      }
      const nextDocuments = currentDocuments.slice(0);
      nextDocuments.splice(documentIndex, 1);
      const nextIndex = Math.min(documentIndex, nextDocuments.length - 1);
      setCurrentDocument(deepCopy(nextDocuments[nextIndex]) || null);
      if (nextDocuments.length === 0) {
        setIsShowDocuments(false);
      }
      return nextDocuments;
    });
  }, []);

  const closeDocuments = useCallback(() => {
    setIsShowDocuments(false);
  }, []);

  const clear = useCallback(() => {
    setIsShowDocuments(false);
    setDocuments([]);
    setCurrentDocument(null);
    setIsDocumentLoading(false);
  }, []);

  useEffect(() => {
    setDocuments([]);
    setCurrentDocument(null);
    setIsShowDocuments(false);
    setIsDocumentLoading(false);
  }, [pageSlugId]);

  return (
    <DocumentsContext.Provider value={{
      isShowDocuments,
      documents,
      currentDocument,
      isDocumentLoading,
      openDocument,
      closeDocument,
      closeDocuments,
      clear,
      setCurrentDocument,
    }}
    >
      {children}
    </DocumentsContext.Provider>
  );
};

export const useDocuments = () => {
  const context = useContext(DocumentsContext);
  if (!context) {
    throw new Error('DocumentsContext is null');
  }
  return context;
};
