import React, { useContext, useState, useCallback } from 'react';

const AIChatToolsContext = React.createContext(null);

let pendingAttachments = [];

const mergeAttachments = (baseAttachments = [], nextAttachments = []) => {
  const mergedAttachments = baseAttachments.slice();
  const attachmentKeys = new Set(mergedAttachments.map((item) => item.key));

  nextAttachments.forEach((attachment) => {
    if (attachment && !attachmentKeys.has(attachment.key)) {
      mergedAttachments.push(attachment);
      attachmentKeys.add(attachment.key);
    }
  });

  return mergedAttachments;
};

export const setPendingAttachments = (attachments = [], reset = false) => {
  pendingAttachments = reset ? mergeAttachments([], attachments) : mergeAttachments(pendingAttachments, attachments);
};

export const consumePendingAttachments = () => {
  const nextAttachments = pendingAttachments;
  pendingAttachments = [];
  return nextAttachments;
};

export const AIChatToolsProvider = ({ children, initialAttachments = [] }) => {
  const [attachments, updateAttachments] = useState(() => {
    return Array.isArray(initialAttachments) ? initialAttachments.filter(Boolean) : [];
  });

  const removeAttachment = useCallback((attachment, index) => {
    updateAttachments((currentAttachments) => {
      const nextAttachments = currentAttachments.slice(0);
      const targetIndex = typeof index === 'number' ? index : nextAttachments.findIndex((item) => item.key === attachment?.key);
      if (targetIndex > -1) {
        nextAttachments.splice(targetIndex, 1);
      }
      return nextAttachments;
    });
  }, []);

  const clearAttachments = useCallback(() => {
    updateAttachments([]);
  }, []);

  return (
    <AIChatToolsContext.Provider value={{
      attachments,
      updateAttachments,
      removeAttachment,
      clearAttachments,
    }}
    >
      {children}
    </AIChatToolsContext.Provider>
  );
};

export const useAIChatTools = () => {
  const context = useContext(AIChatToolsContext);
  if (!context) {
    throw new Error('ChatToolsContext is null');
  }
  return context;
};
