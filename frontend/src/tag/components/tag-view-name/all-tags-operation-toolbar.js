import React, { useCallback, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { isEnter, isSpace } from '../../../metadata/utils/hotkey';
import { gettext } from '../../../utils/constants';
import { useTags } from '../../hooks';
import EditTagDialog from '../dialog/edit-tag-dialog';

const AllTagsOperationToolbar = ({ children }) => {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isShowEditTagDialog, setShowEditTagDialog] = useState(false);

  const { tagsData, addTag } = useTags();

  const tags = useMemo(() => {
    if (!tagsData) return [];
    return tagsData.rows;
  }, [tagsData]);

  const toggleMenuOpen = useCallback(() => {
    setMenuOpen(!isMenuOpen);
  }, [isMenuOpen]);

  const onDropdownKeyDown = useCallback((event) => {
    if (isEnter(event) || isSpace(event)) {
      toggleMenuOpen();
    }
  }, [toggleMenuOpen]);

  const openAddTag = useCallback(() => {
    setShowEditTagDialog(true);
  }, []);

  const closeAddTag = useCallback(() => {
    setShowEditTagDialog(false);
  }, []);

  const handelAddTags = useCallback((tag, callback) => {
    addTag(tag, callback);
  }, [addTag]);

  return (
    <>
      <div className="dir-operation">
        <Dropdown isOpen={isMenuOpen} toggle={toggleMenuOpen}>
          <DropdownToggle
            tag="i"
            role="button"
            className="path-item"
            onClick={toggleMenuOpen}
            onKeyDown={onDropdownKeyDown}
            data-toggle="dropdown"
          >
            {children}
            <i className="sf3-font-down sf3-font ml-1 path-item-dropdown-toggle"></i>
          </DropdownToggle>
          <DropdownMenu className='position-fixed'>
            <DropdownItem onClick={openAddTag}>
              <i className="sf3-font sf3-font-new mr-2 dropdown-item-icon"></i>
              {gettext('New tag')}
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
      {isShowEditTagDialog && (
        <EditTagDialog tags={tags} title={gettext('New tag')} onToggle={closeAddTag} onSubmit={handelAddTags} />
      )}
    </>
  );
};

AllTagsOperationToolbar.propTypes = {
  children: PropTypes.node,
};

export default AllTagsOperationToolbar;
