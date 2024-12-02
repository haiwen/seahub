import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { CenteredLoading } from '@seafile/sf-metadata-ui-component';
import { gettext } from '../../../../utils/constants';
import { Utils } from '../../../../utils/utils';
import { getFileNameFromRecord, getParentDirFromRecord, getTagsFromRecord, getRecordIdFromRecord
} from '../../../utils/cell';
import toaster from '../../../../components/toast';
import classNames from 'classnames';
import { getTagByName, getTagId } from '../../../../tag/utils';
import { PRIVATE_COLUMN_KEY as TAGS_PRIVATE_COLUMN_KEY } from '../../../../tag/constants';
import { SELECT_OPTION_COLORS } from '../../../constants';
import { useTags } from '../../../../tag/hooks';

import './index.css';

const ImageTagsDialog = ({ record, onToggle, onSubmit }) => {

  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [imageTags, setImageTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

  const fileName = useMemo(() => getFileNameFromRecord(record), [record]);

  const { tagsData, addTags } = useTags();

  useEffect(() => {
    let path = '';
    if (Utils.imageCheck(fileName) && window.sfMetadataContext.canModifyRow(record)) {
      const parentDir = getParentDirFromRecord(record);
      path = Utils.joinPath(parentDir, fileName);
    }
    if (path === '') {
      setLoading(false);
      return;
    }
    window.sfMetadataContext.imageTags(path).then(res => {
      const tags = res.data.tags;
      setImageTags(tags);
      setLoading(false);
    }).catch(error => {
      const errorMessage = gettext('Failed to generate image tags');
      toaster.danger(errorMessage);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSelectImageTag = useCallback((tagName) => {
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
    setSubmitting(true);
    if (selectedTags.length === 0) {
      onToggle();
      return;
    }

    let { newTags, exitTagIds } = selectedTags.reduce((cur, pre) => {
      const tag = getTagByName(tagsData, pre);
      if (tag) {
        cur.exitTagIds.push(getTagId(tag));
      } else {
        cur.newTags.push(pre);
      }
      return cur;
    }, { newTags: [], exitTagIds: [] });

    newTags = newTags.map(tagName => {
      const defaultOptions = SELECT_OPTION_COLORS.slice(0, 24);
      const defaultOption = defaultOptions[Math.floor(Math.random() * defaultOptions.length)];
      return { [TAGS_PRIVATE_COLUMN_KEY.TAG_NAME]: tagName, [TAGS_PRIVATE_COLUMN_KEY.TAG_COLOR]: defaultOption.COLOR };
    });
    const recordId = getRecordIdFromRecord(record);
    let value = getTagsFromRecord(record);
    value = value ? value.map(item => item.row_id) : [];

    if (newTags.length > 0) {
      addTags(newTags, {
        success_callback: (operation) => {
          const newTagIds = operation.tags?.map(tag => getTagId(tag));
          let newValue = [...value, ...newTagIds];
          exitTagIds.forEach(id => {
            if (!newValue.includes(id)) {
              newValue.push(id);
            }
          });
          onSubmit([{ record_id: recordId, tags: newValue, old_tags: value }]);
          onToggle();
        },
        fail_callback: (error) => {
          setSubmitting(false);
        },
      });
      return;
    }
    let newValue = [...value];
    exitTagIds.forEach(id => {
      if (!newValue.includes(id)) {
        newValue.push(id);
      }
    });
    if (newValue.length !== value.length) {
      onSubmit([{ record_id: recordId, tags: newValue, old_tags: value }]);
    }
    onToggle();
  }, [selectedTags, onSubmit, onToggle, record, addTags, tagsData]);

  return (
    <Modal isOpen={true} toggle={() => onToggle()} className="sf-metadata-auto-image-tags">
      <ModalHeader toggle={onToggle}>{fileName + gettext('\'s tags')}</ModalHeader>
      <ModalBody>
        {isLoading ? (
          <CenteredLoading />
        ) : (
          <div className="auto-image-tags-container">
            {imageTags.length > 0 ? (
              <>
                {imageTags.map((tagName, index) => {
                  const isSelected = selectedTags.includes(tagName);
                  return (
                    <div
                      key={index}
                      className={classNames('auto-image-tag', { 'selected': isSelected })}
                      onClick={() => onSelectImageTag(tagName)}
                    >
                      {tagName}
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="empty-tip">{gettext('No tags')}</div>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={() => onToggle()}>{gettext('Cancel')}</Button>
        <Button color="primary" disabled={isLoading || isSubmitting} onClick={handelSubmit}>{gettext('Submit')}</Button>
      </ModalFooter>
    </Modal>
  );
};

ImageTagsDialog.propTypes = {
  record: PropTypes.object,
  onToggle: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default ImageTagsDialog;
