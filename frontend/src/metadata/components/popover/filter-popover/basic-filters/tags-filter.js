import React, { useCallback, useMemo, useRef, useState } from 'react';
import { UncontrolledTooltip } from 'reactstrap';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import Icon from '../../../../../components/icon';
import { gettext } from '../../../../../utils/constants';
import { Utils } from '../../../../../utils/utils';
import { useMetadataStatus } from '../../../../../hooks';
import { useTags } from '../../../../../tag/hooks';
import { getRowById } from '../../../../../components/sf-table/utils/table';
import IconBtn from '../../../../../components/icon-btn';
import ClickOutside from '../../../../../components/click-outside';
import TagsEditor from '../../../cell-editors/tags-editor';

const TagsFilter = ({ value: oldValue, onChange: onChangeAPI }) => {
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);

  const { tagsData } = useTags();
  const { enableTags } = useMetadataStatus();
  const invalidFilterTip = useRef(null);
  const ref = useRef(null);

  const value = useMemo(() => {
    if (!enableTags) return [];
    if (!tagsData) return [];
    if (!Array.isArray(oldValue) || oldValue.length === 0) return [];
    return oldValue.filter(tagId => getRowById(tagsData, tagId));
  }, [oldValue, tagsData, enableTags]);

  const onSelectToggle = useCallback(() => {
    setIsOptionsVisible(!isOptionsVisible);
  }, [isOptionsVisible]);

  const onClickOutside = useCallback((e) => {
    if (!ref.current.contains(e.target)) {
      setIsOptionsVisible(false);
    }
  }, []);

  const handleSelect = useCallback((tagId) => {
    onChangeAPI([...value, tagId]);
  }, [value, onChangeAPI]);

  const handleDeselect = useCallback((tagId) => {
    onChangeAPI(value.filter(v => v !== tagId));
  }, [value, onChangeAPI]);

  const onDeleteFilter = useCallback((event) => {
    event.nativeEvent.stopImmediatePropagation();
    onChangeAPI([]);
    // eslint-disable-next-line
    oldValue = [];
  }, [value, onChangeAPI, oldValue]);

  const renderErrorMessage = () => {
    return (
      <div className="ml-2">
        <div ref={invalidFilterTip}>
          <IconBtn symbol="exclamation-triangle" iconStyle={{ fill: '#cd201f' }}/>
        </div>
        <UncontrolledTooltip
          target={invalidFilterTip}
          placement='bottom'
          fade={false}
          className="sf-metadata-tooltip"
        >
          {gettext('Invalid filter')}
        </UncontrolledTooltip>
      </div>
    );
  };

  const renderTagsTree = () => {
    return (
      <div
        ref={ref}
        className={classNames('sf-metadata-basic-filters-select sf-metadata-basic-filter-tags-select seafile-customize-select custom-select  mr-4', {
          'focus': isOptionsVisible,
          'highlighted': value.length > 0
        })}
      >
        <div
          className="selected-option"
          onClick={onSelectToggle}
        >
          <span className="selected-option-show">{gettext('Tags')}</span>
          <span className="d-inline-flex align-items-center"><Icon symbol="down" /></span>
        </div>
        {isOptionsVisible && (
          <ClickOutside onClickOutside={onClickOutside}>
            <div className="tag-options-container">
              <TagsEditor
                value={value.map(tagId => ({ row_id: tagId }))}
                column={{ width: 400 }}
                onSelect={handleSelect}
                onDeselect={handleDeselect}
                showRecentlyUsed={false}
              />
            </div>
          </ClickOutside>
        )}
      </div>
    );
  };

  if (!enableTags) {
    if (oldValue.length !== 0) {
      return (
        <div>
          {renderTagsTree()}
          {renderErrorMessage()}
          <div
            tabIndex="0"
            role="button"
            className="delete-filter"
            onClick={onDeleteFilter}
            onKeyDown={Utils.onKeyDown}
            aria-label={gettext('Delete')}
          >
            <Icon className="sf-metadata-icon" symbol="close" />
          </div>
        </div>
      );
    } else {
      return null;
    }
  }

  return (
    <>{renderTagsTree()}</>
  );

};

TagsFilter.propTypes = {
  readOnly: PropTypes.bool,
  value: PropTypes.array,
  onChange: PropTypes.func,
};

export default TagsFilter;
