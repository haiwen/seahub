import React, { useCallback, useRef, useEffect } from 'react';
import { gettext } from '../../../../utils/constants';
import { seafileAPI } from '../../../../utils/seafile-api';
import AttachmentObject from '../models/attachment_object';
import SyncSelector from '../components/selector/sync-selector';

const CHAT_ATTACHMENT_EXTENSIONS = 'md,sdoc,docx,pdf,pptx';

const LibraryFilesSelector = ({ repoID, value: attachments = [], onChange: propsOnChange, disabled }) => {
  const searchResultsRef = useRef(new Map());

  // Cache existing attachments so we can find them if they are toggled
  useEffect(() => {
    if (Array.isArray(attachments)) {
      attachments.forEach((att) => {
        if (!searchResultsRef.current.has(att.key)) {
          searchResultsRef.current.set(att.key, {
            path: att.path,
            type: 'file',
          });
        }
      });
    }
  }, [attachments]);

  const onSearch = useCallback((value, signal) => {
    if (!value.trim()) {
      return Promise.resolve([]);
    }
    return seafileAPI.searchFiles({
      q: value,
      search_repo: repoID,
      obj_type: 'file',
      search_ftypes: 'custom',
      input_fexts: CHAT_ATTACHMENT_EXTENSIONS,
      per_page: 100,
      page: 1,
    }).then((res) => {
      const files = Array.isArray(res.data?.results)
        ? res.data.results.filter((item) => item.is_dir === false && item.fullpath)
        : [];

      files.forEach((file) => {
        const path = file.fullpath;
        const key = `${repoID}:${path}`;
        searchResultsRef.current.set(key, file);
      });

      return files.map((file) => {
        const path = file.fullpath;
        const key = `${repoID}:${path}`;
        const name = file.name;
        return {
          value: key,
          label: name,
          icon: 'file',
        };
      });
    }).catch(() => {
      return [];
    });
  }, [repoID]);

  const onChange = useCallback((selectedKeys) => {
    const currentKeys = attachments.map((att) => att.key);

    const addedKeys = selectedKeys.filter((key) => !currentKeys.includes(key));
    const removedKeys = currentKeys.filter((key) => !selectedKeys.includes(key));

    let updatedAttachments = [...attachments];

    if (removedKeys.length > 0) {
      updatedAttachments = updatedAttachments.filter((att) => !removedKeys.includes(att.key));
    }

    if (addedKeys.length > 0) {
      for (const key of addedKeys) {
        const file = searchResultsRef.current.get(key);
        if (file) {
          const path = file.fullpath || file.path;
          const name = file.name || path.substr(path.lastIndexOf('/') + 1);
          const newAtt = new AttachmentObject({
            repo_id: repoID,
            path,
            name: name,
          });
          if (!updatedAttachments.some((att) => att.key === newAtt.key)) {
            updatedAttachments.push(newAtt);
          }
        }
      }
    }

    propsOnChange && propsOnChange(updatedAttachments);
  }, [attachments, repoID, propsOnChange]);

  return (
    <SyncSelector
      icon="plus"
      className="attach-files-btn"
      title={gettext('Search files in this library')}
      value={attachments.map((att) => att.key)}
      onChange={onChange}
      onSearch={onSearch}
      disabled={disabled}
    />
  );
};

export default LibraryFilesSelector;
