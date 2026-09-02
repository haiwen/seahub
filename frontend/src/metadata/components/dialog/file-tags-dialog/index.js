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
import { useTags } from '../../../../tag/hooks';

import './index.css';

const FileTagsDialog = ({ record, onToggle, onSubmit }) => {

  const [isLoading, setLoading] = useState(true);
  const [existingTags, setExistingTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

  const fileName = useMemo(() => getFileNameFromRecord(record), [record]);

  const { tagsData } = useTags();

  useEffect(() => {
    if (!tagsData) {
      return;
    }
    if (!tagsData.rows?.length) {
      setLoading(false);
      return;
    }

    setLoading(true);
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
      const matchedTags = tags.map(tag => getTagByName(tagsData, tag)).filter(Boolean);
      setExistingTags(matchedTags);
      setLoading(false);
    }).catch(error => {
      let errorMessage = gettext('Failed to suggest file tags');
      if (error.status === 429) {
        const err_data = error.response.data;
        errorMessage = gettext(err_data.error_msg);
      }
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

  const handleSubmit = useCallback(() => {
    if (isLoading || selectedTags.length === 0) {
      onToggle();
      return;
    }

    let selectedExitTagIds = [];
    selectedTags.forEach(tagName => {
      const tag = getTagByName(tagsData, tagName);
      if (tag) {
        selectedExitTagIds.push(getTagId(tag));
      }
    });
    const recordId = getRecordIdFromRecord(record);
    let oldTags = getTagsFromRecord(record);
    let oldTagIds = oldTags ? oldTags.map(item => item.row_id) : [];

    let newTagIds = [...oldTagIds];
    selectedExitTagIds.forEach(id => {
      if (!newTagIds.includes(id)) {
        newTagIds.push(id);
      }
    });
    if (newTagIds.length !== oldTagIds.length) {
      onSubmit([{ record_id: recordId, tags: newTagIds, old_tags: oldTagIds }]);
    }
    onToggle();
  }, [selectedTags, onSubmit, onToggle, record, tagsData, isLoading]);

  return (
    <Modal
      isOpen={true}
      toggle={() => { handleSubmit(); }}
      className="sf-file-tags"
      backdropClassName="sf-file-tags-backdrop"
    >
      <div onClick={(e) => e.stopPropagation()}>
        <ModalHeader>{fileName + ' ' + gettext('tags')}</ModalHeader>
        <ModalBody>
          {isLoading ?
            <CenteredLoading />
            :
            <div>
              <div className="mb-6">
                <div className='mb-1'>{gettext('Matching tags')}</div>
                {existingTags.length > 0 && (
                  <>
                    {existingTags.map((tag, index) => {
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
                {existingTags.length === 0 && (
                  <span className='tip'>{gettext(tagsData?.rows?.length ? 'No matching tags' : 'No tags available')}</span>
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
