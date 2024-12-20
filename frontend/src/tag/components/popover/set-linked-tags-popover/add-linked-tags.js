import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { SearchInput } from '@seafile/sf-metadata-ui-component';
import EmptyTip from '../../../../components/empty-tip';
import Tags from './tags';
import { KeyCodes } from '../../../../constants';
import { gettext } from '../../../../utils/constants';
import { getTagsByNameOrColor } from '../../../utils';

const getSelectableTags = (allTags, idTagSelectedMap) => {
  if (!idTagSelectedMap) {
    return allTags;
  }
  return allTags.filter((tag) => !idTagSelectedMap[tag._id]);
};

const initIdTagSelectedMap = (linkedTags) => {
  let idTagSelectedMap = {};
  linkedTags.forEach((linkedTag) => {
    idTagSelectedMap[linkedTag._id] = true;
  });
  return idTagSelectedMap;
};

const AddLinkedTags = ({ allTags, linkedTags, switchToLinkedTagsPage, addLinkedTag, deleteLinedTag }) => {
  const initialIdTagSelectedMap = initIdTagSelectedMap(linkedTags);
  const [idTagSelectedMap, setIdSelectedMap] = useState(initialIdTagSelectedMap);
  const [selectableTags, setSelectableTags] = useState([]);
  const [searchValue, setSearchValue] = useState('');

  const initialSelectableTagsRef = useRef(getSelectableTags(allTags, initialIdTagSelectedMap));

  const selectTag = useCallback((tag) => {
    let updatedIdTagSelectedMap = { ...idTagSelectedMap };
    if (updatedIdTagSelectedMap[tag._id]) {
      delete updatedIdTagSelectedMap[tag._id];
      setIdSelectedMap(updatedIdTagSelectedMap);
      deleteLinedTag(tag._id);
    } else {
      updatedIdTagSelectedMap[tag._id] = true;
      setIdSelectedMap(updatedIdTagSelectedMap);
      addLinkedTag(tag);
    }

  }, [idTagSelectedMap, addLinkedTag, deleteLinedTag]);

  const onKeyDown = useCallback((event) => {
    if (
      event.keyCode === KeyCodes.ChineseInputMethod ||
      event.keyCode === KeyCodes.Enter ||
      event.keyCode === KeyCodes.LeftArrow ||
      event.keyCode === KeyCodes.RightArrow
    ) {
      event.stopPropagation();
    }
  }, []);

  const onChangeSearch = useCallback((newSearchValue) => {
    if (searchValue === newSearchValue) return;
    setSearchValue(newSearchValue);
  }, [searchValue]);

  useEffect(() => {
    let searchedTags = [];
    if (!searchValue) {
      searchedTags = [...initialSelectableTagsRef.current];
    } else {
      searchedTags = getTagsByNameOrColor(initialSelectableTagsRef.current, searchValue);
    }
    setSelectableTags(searchedTags);
  }, [searchValue, allTags]);

  return (
    <div className="sf-metadata-set-linked-tags-popover-selector">
      <div className="sf-metadata-set-linked-tags-popover-header">
        <div className="sf-metadata-set-linked-tags-popover-title">
          <span className="sf-metadata-set-linked-tags-popover-header-operation sf-metadata-set-linked-tags-popover-back" onClick={switchToLinkedTagsPage}><i className="sf3-font sf3-font-arrow sf-metadata-set-linked-tags-popover-back-icon"></i></span>
          <span>{gettext('Link existing tags')}</span>
        </div>
      </div>
      <div className="sf-metadata-set-linked-tags-popover-body">
        <div className="sf-metadata-set-linked-tags-popover-search-container">
          <SearchInput
            autoFocus
            className="sf-metadata-set-linked-tags-popover-search-tags"
            placeholder={gettext('Search tag')}
            onKeyDown={onKeyDown}
            onChange={onChangeSearch}
          />
        </div>
        {selectableTags.length === 0 && (
          <EmptyTip text={gettext('No tags available')} />
        )}
        {selectableTags.length > 0 && (
          <div className="sf-metadata-set-linked-tags-popover-selectable-tags-wrapper">
            <Tags selectable tags={selectableTags} idTagSelectedMap={idTagSelectedMap} selectTag={selectTag} />
          </div>
        )}
      </div>
    </div>
  );
};

AddLinkedTags.propTypes = {
  isParentTags: PropTypes.bool,
  allTags: PropTypes.array,
  linkedTags: PropTypes.array,
  switchToLinkedTagsPage: PropTypes.func,
  addLinkedTag: PropTypes.func,
  deleteLinedTag: PropTypes.func,
};

export default AddLinkedTags;
