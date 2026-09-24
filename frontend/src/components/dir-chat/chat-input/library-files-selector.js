import React, { useCallback, useRef, useEffect } from 'react';
import { seafileAPI } from '@/api/seafile-api';
import { gettext } from '@/utils/constants';
import Icon from '../../icon';
import SyncSelector from '../components/selector/sync-selector';
import { CHAT_IMAGE_ATTACHMENT_MAX_COUNT } from '../constants';
import AttachmentObject from '../models/attachment_object';

const CHAT_ATTACHMENT_EXTENSIONS = 'md,sdoc,docx,pdf,pptx,png,jpg,jpeg,gif,webp,bmp,avif';

const LibraryFilesSelector = ({
  repoID,
  value: attachments = [],
  onChange: propsOnChange,
  disabled,
  imageCount = 0,
  onFileInputClick,
}) => {
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
          icon: 'newpage',
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

  const renderMenu = useCallback(({ closeMenu, openSearch }) => {
    return (
      <div className="sea-ai-chat-attach-menu">
        <button
          type="button"
          className="sea-ai-chat-attach-menu-item"
          onClick={openSearch}
        >
          <Icon symbol="plus" className="sea-ai-chat-attach-menu-icon" />
          <span>{gettext('Add docs')}</span>
        </button>
        {!disabled && (
          <button
            type="button"
            className="sea-ai-chat-attach-menu-item"
            disabled={imageCount >= CHAT_IMAGE_ATTACHMENT_MAX_COUNT}
            onClick={() => {
              closeMenu();
              onFileInputClick && onFileInputClick();
            }}
          >
            <Icon symbol="gallery" className="sea-ai-chat-attach-menu-icon" />
            <span>{gettext('Upload image')}</span>
          </button>
        )}
      </div>
    );
  }, [disabled, imageCount, onFileInputClick]);

  return (
    <SyncSelector
      icon="plus"
      className="attach-files-btn"
      title={gettext('Add')}
      value={attachments.map((att) => att.key)}
      onChange={onChange}
      onSearch={onSearch}
      disabled={disabled}
      menu={renderMenu}
    />
  );
};

export default LibraryFilesSelector;
