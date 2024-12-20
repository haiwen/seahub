import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { UncontrolledPopover } from 'reactstrap';
import isHotkey from 'is-hotkey';
import LinkedTags from './linked-tags';
import AddLinkedTags from './add-linked-tags';
import { getRowsByIds } from '../../../../metadata/utils/table';
import { useTags } from '../../../hooks';
import { getEventClassName } from '../../../../metadata/utils/common';

import './index.css';

const POPOVER_WIDTH = 560;
const POPOVER_WINDOW_SAFE_SPACE = 30;
const POPOVER_MAX_HEIGHT = 520;
const POPOVER_MIN_HEIGHT = 300;

const KEY_MODE_TYPE = {
  LINKED_TAGS: 'linked_tags',
  ADD_LINKED_TAGS: 'add_linked_tags',
};

const SetLinkedTagsPopover = ({ isParentTags, target, placement, tagLinks, allTags, hidePopover, addTagLinks, deleteTagLinks }) => {
  const { tagsData } = useTags();
  const linkedRowsIds = Array.isArray(tagLinks) ? tagLinks.map((link) => link.row_id) : [];
  const initialLinkedTags = getRowsByIds(tagsData, linkedRowsIds);
  const [mode, setMode] = useState(KEY_MODE_TYPE.LINKED_TAGS);
  const [linkedTags, setLinkedTags] = useState(initialLinkedTags);

  const popoverRef = useRef(null);

  const getPopoverInnerStyle = () => {
    let style = { width: POPOVER_WIDTH };
    const windowHeight = window.innerHeight - POPOVER_WINDOW_SAFE_SPACE;
    let maxHeight = POPOVER_MAX_HEIGHT;
    if (windowHeight < maxHeight) {
      maxHeight = windowHeight;
    }
    if (maxHeight < POPOVER_MIN_HEIGHT) {
      maxHeight = POPOVER_MIN_HEIGHT;
    }
    style.height = maxHeight;
    return style;
  };

  const onHidePopover = useCallback((event) => {
    if (popoverRef.current && !getEventClassName(event).includes('popover') && !popoverRef.current.contains(event.target)) {
      hidePopover(event);
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, [hidePopover]);

  const onHotKey = useCallback((event) => {
    if (isHotkey('esc', event)) {
      event.preventDefault();
      hidePopover();
    }
  }, [hidePopover]);

  useEffect(() => {
    document.addEventListener('click', onHidePopover, true);
    document.addEventListener('keydown', onHotKey);
    return () => {
      document.removeEventListener('click', onHidePopover, true);
      document.removeEventListener('keydown', onHotKey);
    };
  }, [onHidePopover, onHotKey]);

  const deleteLinedTag = useCallback((tagId) => {
    let updatedLinkedTags = [...linkedTags];
    const deleteIndex = updatedLinkedTags.findIndex((tag) => tag._id === tagId);
    if (deleteIndex < 0) return;
    updatedLinkedTags.splice(deleteIndex, 1);
    setLinkedTags(updatedLinkedTags);
    deleteTagLinks(tagId);
  }, [linkedTags, deleteTagLinks]);

  const addLinkedTag = useCallback((tag) => {
    let updatedLinkedTags = [...linkedTags];
    updatedLinkedTags.push(tag);
    setLinkedTags(updatedLinkedTags);
    addTagLinks(tag);
  }, [linkedTags, addTagLinks]);

  return (
    <UncontrolledPopover
      isOpen
      hideArrow
      positionFixed
      fade={false}
      flip={false}
      placement={placement}
      target={target}
      className="sf-metadata-set-linked-tags-popover"
      boundariesElement={document.body}
    >
      <div ref={popoverRef} style={getPopoverInnerStyle()}>
        {mode === KEY_MODE_TYPE.LINKED_TAGS ?
          <LinkedTags
            isParentTags={isParentTags}
            linkedTags={linkedTags}
            switchToAddTagsPage={() => setMode(KEY_MODE_TYPE.ADD_LINKED_TAGS)}
            deleteLinedTag={deleteLinedTag}
          /> :
          <AddLinkedTags
            allTags={allTags}
            linkedTags={linkedTags}
            switchToLinkedTagsPage={() => setMode(KEY_MODE_TYPE.LINKED_TAGS)}
            addLinkedTag={addLinkedTag}
            deleteLinedTag={deleteLinedTag}
          />
        }
      </div>
    </UncontrolledPopover>
  );
};

SetLinkedTagsPopover.propTypes = {
  isParentTags: PropTypes.bool,
  placement: PropTypes.string,
  target: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  tagLinks: PropTypes.array,
  allTags: PropTypes.array,
  hidePopover: PropTypes.func,
  addTagLinks: PropTypes.func,
  deleteTagLinks: PropTypes.func,
};

SetLinkedTagsPopover.defaultProps = {
  placement: 'bottom-end',
};

export default SetLinkedTagsPopover;
