import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Modal, ModalBody, ModalHeader } from 'reactstrap';
import CenteredLoading from '../../../../components/centered-loading';
import toaster from '../../../../components/toast';
import { gettext } from '../../../../utils/constants';
import { Utils } from '../../../../utils/utils';
import { getFileNameFromRecord, getParentDirFromRecord, getTagsFromRecord, getRecordIdFromRecord } from '../../../utils/cell';
import { getTagByName } from '../../../../tag/utils/row';
import { getTagId } from '../../../../tag/utils/cell';
import { PRIVATE_COLUMN_KEY as TAGS_PRIVATE_COLUMN_KEY } from '../../../../tag/constants';
import { SELECT_OPTION_COLORS } from '../../../constants';
import { useTags } from '../../../../tag/hooks';

import './index.css';

const FileTagsDialog = ({ record, onToggle, onSubmit }) => {

  const [isLoading, setLoading] = useState(true);
  const [newTags, setNewTags] = useState([]);
  const [exitTags, setExitTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

  const fileName = useMemo(() => getFileNameFromRecord(record), [record]);

  const lastSettingsValue = parseInt(localStorage.getItem('sf_cur_view_detail_width'));
  const { tagsData, addTags } = useTags();

  useEffect(() => {
    let path = '';
    if (window.sfMetadataContext.canModifyRow(record)) {
      const parentDir = getParentDirFromRecord(record);
      path = Utils.joinPath(parentDir, fileName);
    }
    if (path === '') {
      setLoading(false);
      return;
    }
    window.sfMetadataContext.generateFileTags(path).then(res => {
      const tags = res.data.tags || [];
      let newTags = [];
      let exitTags = [];
      tags.forEach(tag => {
        const tagObj = getTagByName(tagsData, tag);
        if (tagObj) {
          exitTags.push(tagObj);
        } else {
          newTags.push(tag);
        }
      });
      setNewTags(newTags);
      setExitTags(exitTags);
      setLoading(false);
    }).catch(error => {
      const errorMessage = gettext('Failed to generate file tags');
      toaster.danger(errorMessage);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagsData]);

  const onClickTag = useCallback((tagName) => {
    let newSelectedTags = selectedTags.slice(0);
    const tagNameIndex = selectedTags.findIndex(i => i === tagName);
    if (tagNameIndex === -1) {
      newSelectedTags.push(tagName);
    } else {
      newSelectedTags = newSelectedTags.filter(i => i !== tagName);
    }
    setSelectedTags(newSelectedTags);
  }, [selectedTags]);

  const handelSubmit = useCallback(() => {
    if (isLoading || selectedTags.length === 0) {
      onToggle();
      return;
    }

    let selectedNewTags = [];
    let selectedExitTags = [];
    selectedTags.forEach(tagName => {
      const tag = getTagByName(tagsData, tagName);
      if (tag) {
        selectedExitTags.push(tag);
      } else {
        selectedNewTags.push(tagName);
      }
    });

    selectedNewTags = selectedNewTags.map(tagName => {
      const defaultOptions = SELECT_OPTION_COLORS.slice(0, 24);
      const defaultOption = defaultOptions[Math.floor(Math.random() * defaultOptions.length)];
      return {
        [TAGS_PRIVATE_COLUMN_KEY.TAG_NAME]: tagName,
        [TAGS_PRIVATE_COLUMN_KEY.TAG_COLOR]: defaultOption.COLOR,
      };
    });
    const recordId = getRecordIdFromRecord(record);
    let value = getTagsFromRecord(record);
    value = value ? value.map(item => item.row_id) : [];

    if (selectedNewTags.length > 0) {
      addTags(selectedNewTags, {
        success_callback: (operation) => {
          const newTagIds = operation.tags?.map(tag => getTagId(tag));
          let newValue = [...value, ...newTagIds];
          selectedExitTags.forEach(id => {
            if (!newValue.includes(id)) {
              newValue.push(id);
            }
          });
          onSubmit([{ record_id: recordId, tags: newValue, old_tags: value }]);
          onToggle();
        },
        fail_callback: (error) => {
          toaster.danger(Utils.getErrorMsg(error));
        },
      });
    } else {
      let newValue = [...value];
      selectedExitTags.forEach(id => {
        if (!newValue.includes(id)) {
          newValue.push(id);
        }
      });
      if (newValue.length !== value.length) {
        onSubmit([{ record_id: recordId, tags: newValue, old_tags: value }]);
      }
      onToggle();
    }
  }, [selectedTags, onSubmit, onToggle, record, addTags, tagsData, isLoading]);

  return (
    <Modal
      isOpen={true}
      toggle={() => { handelSubmit(); }}
      className="sf-file-tags"
      backdropClassName="sf-file-tags-backdrop"
      style={{ marginRight: lastSettingsValue }}
    >
      <div onClick={(e) => e.stopPropagation()} className="modal-content">
        <ModalHeader>{fileName + gettext('\'s tags')}</ModalHeader>
        <ModalBody>
          {isLoading ?
            <CenteredLoading />
          :
            <div>
              <div className="mb-6">
                <div className='mb-1'>{gettext('Matching tags')}</div>
                {exitTags.length > 0 && (
                  <>
                    {exitTags.map((tag, index) => {
                      const { _tag_color: tagColor, _tag_name: tagName } = tag;
                      const isSelected = selectedTags.includes(tagName);
                      return (
                        <div
                          key={index}
                          className={classNames('sf-file-exit-tag', { 'selected': isSelected })}
                          onClick={() => onClickTag(tagName)}
                        >
                          <div className="sf-file-exit-tag-color" style={{ backgroundColor: tagColor }}></div>
                          <div className="sf-file-exit-tag-name">{tagName}</div>
                        </div>
                      );
                    })}
                  </>
                )}
                {exitTags.length === 0 && (
                  <span className='tip'>{gettext('No matching tags')}</span>
                )}
              </div>
              <div className="mb-6">
                <div className='mb-1'>{gettext('Recommended new tags')}</div>
                {newTags.length > 0 && (
                  <>
                    {newTags.map((tagName, index) => {
                      const isSelected = selectedTags.includes(tagName);
                      return (
                        <div
                          key={index}
                          className={classNames('sf-file-new-tag', { 'selected': isSelected })}
                          onClick={() => onClickTag(tagName)}
                        >
                          {tagName}
                        </div>
                      );
                    })}
                  </>
                )}
                {newTags.length === 0 && (
                  <span className='tip'>{gettext('No recommended new tags')}</span>
                )}
              </div>
            </div>
          }
        </ModalBody>
      </div>
    </Modal>
  );
};

FileTagsDialog.propTypes = {
  record: PropTypes.object,
  onToggle: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default FileTagsDialog;
