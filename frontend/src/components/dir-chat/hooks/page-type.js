import React, { useContext, useEffect, useState, useCallback } from 'react';
import { ASK_PAGE_SLUG_ID } from '../constants';

const isFunction = (value) => typeof value === 'function';

const AskPageContext = React.createContext(null);

export const AskPageProvider = ({ getInitialPageSlugId, resetURL, children }) => {
  const [isLoading, setLoading] = useState(true);
  const [pageSlugId, setPageSlugId] = useState(ASK_PAGE_SLUG_ID.NEW);

  const togglePageSlugId = useCallback((newPageSlugId) => {
    setPageSlugId(newPageSlugId || ASK_PAGE_SLUG_ID.NEW);
  }, []);

  useEffect(() => {
    if (isFunction(getInitialPageSlugId)) {
      const initialPageSlugId = getInitialPageSlugId();
      setPageSlugId(initialPageSlugId || ASK_PAGE_SLUG_ID.NEW);
    }
    setLoading(false);
  }, [getInitialPageSlugId]);

  useEffect(() => {
    if (isFunction(resetURL)) {
      resetURL(pageSlugId);
    }
  }, [pageSlugId, resetURL]);

  return (
    <AskPageContext.Provider value={{
      pageSlugId,
      isLoading,
      togglePageSlugId,
    }}
    >
      {children}
    </AskPageContext.Provider>
  );
};

export const useAskPage = () => {
  const context = useContext(AskPageContext);
  if (!context) {
    throw new Error('AskPageContext is null');
  }
  return context;
};
