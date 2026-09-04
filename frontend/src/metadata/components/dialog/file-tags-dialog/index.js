import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Modal, ModalBody, ModalHeader } from 'reactstrap';
import CenteredLoading from '../../../../components/centered-loading';
import toaster from '../../../../components/toast';
import { gettext } from '../../../../utils/constants';
import { Utils } from '../../../../utils/utils';
import { getFileNameFromRecord, getParentDirFromRecord, getTagsFromRecord, getRecordIdFromRecord } from '../../../utils/cell';

import './index.css';

const FileTagsDialog = ({ record, onToggle, onSubmit }) => {

  const [isLoading, setLoading] = useState(true);
  const [existingTags, setExistingTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

  const fileName = useMemo(() => getFileNameFromRecord(record), [record]);

  useEffect(() => {
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
      setExistingTags(res.data.tags || []);
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
  }, []);

  const onClickTag = useCallback((tagId) => {
    let newSelectedTags = selectedTags.slice(0);
    const tagIdIndex = selectedTags.findIndex(i => i === tagId);
    if (tagIdIndex === -1) {
      newSelectedTags.push(tagId);
    } else {
      newSelectedTags = newSelectedTags.filter(i => i !== tagId);
    }
    setSelectedTags(newSelectedTags);
  }, [selectedTags]);

  const handleSubmit = useCallback(() => {
    if (isLoading || selectedTags.length === 0) {
      onToggle();
      return;
    }

    const recordId = getRecordIdFromRecord(record);
    let oldTags = getTagsFromRecord(record);
    let oldTagIds = oldTags ? oldTags.map(item => item.row_id) : [];

    let newTagIds = [...oldTagIds];
    selectedTags.forEach(id => {
      if (!newTagIds.includes(id)) {
        newTagIds.push(id);
      }
    });
    if (newTagIds.length !== oldTagIds.length) {
      onSubmit([{ record_id: recordId, tags: newTagIds, old_tags: oldTagIds }]);
    }
    onToggle();
  }, [selectedTags, onSubmit, onToggle, record, isLoading]);

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
                    {existingTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag.id);
                      return (
                        <div
                          key={tag.id}
                          className={classNames('sf-file-exit-tag', { 'selected': isSelected })}
                          onClick={() => onClickTag(tag.id)}
                        >
                          <div className="sf-file-exit-tag-color" style={{ backgroundColor: tag.color }}></div>
                          <div className="sf-file-exit-tag-name">{tag.name}</div>
                        </div>
                      );
                    })}
                  </>
                )}
                {existingTags.length === 0 && (
                  <span className='tip'>{gettext('No matching tags')}</span>
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
