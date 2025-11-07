import React, { useCallback, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import EditTagDialog from '../dialog/edit-tag-dialog';
import { gettext } from '../../../utils/constants';
import { useTags } from '../../hooks';
import tagsAPI from '../../api';
import ImportTagsDialog from '../../../components/dialog/import-tags-dialog';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import Icon from '../../../components/icon';

const AllTagsOperationToolbar = ({ repoID }) => {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isShowEditTagDialog, setShowEditTagDialog] = useState(false);
  const [isShowImportLoadingDialog, setShowImportLoadingDialog] = useState(false);
  const { tagsData, addTag, reloadTags } = useTags();

  const tags = useMemo(() => {
    if (!tagsData) return [];
    return tagsData.rows;
  }, [tagsData]);

  const toggleMenuOpen = useCallback(() => {
    setMenuOpen(!isMenuOpen);
  }, [isMenuOpen]);

  const openAddTag = useCallback(() => {
    setShowEditTagDialog(true);
  }, []);

  const closeAddTag = useCallback(() => {
    setShowEditTagDialog(false);
  }, []);

  const handleAddTags = useCallback((tag, callback) => {
    addTag(tag, callback);
  }, [addTag]);

  const handleImportTags = useCallback(() => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      setShowImportLoadingDialog(true);
      tagsAPI.importTags(repoID, file).then(res => {
        toaster.success(gettext('Successfully imported tags.'));
        setTimeout(() => {
          reloadTags(true);
        }, 10);
      }).catch(error => {
        const errorMsg = Utils.getErrorMsg(error);
        toaster.danger(errorMsg || gettext('Failed to import tags'));
      }).finally(() => {
        setShowImportLoadingDialog(false);
      });
    };
    fileInput.click();
  }, [reloadTags, repoID]);

  return (
    <>
      <div className="dir-operation">
        <span className="path-item path-item-read-only">{gettext('All tags')}</span>
        <Dropdown isOpen={isMenuOpen} toggle={toggleMenuOpen}>
          <DropdownToggle
            tag="span"
            role="button"
            tabIndex="0"
            className="path-item all-tags-operation-toggle"
            onClick={toggleMenuOpen}
            data-toggle="dropdown"
            aria-label={gettext('More operations')}
            aria-expanded={isMenuOpen}
          >
            <Icon symbol="new" />
            <Icon symbol="down" />
          </DropdownToggle>
          <DropdownMenu className='position-fixed'>
            <DropdownItem className="d-flex align-items-center" onClick={openAddTag}>
              <Icon symbol="new" className="mr-2 dropdown-item-icon" />
              {gettext('New tag')}
            </DropdownItem>
            <DropdownItem className="d-flex align-items-center" onClick={handleImportTags}>
              <Icon symbol="import-sdoc" className="mr-2 dropdown-item-icon" />
              {gettext('Import tags')}
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
      {isShowEditTagDialog && (
        <EditTagDialog tags={tags} title={gettext('New tag')} onToggle={closeAddTag} onSubmit={handleAddTags} />
      )}
      {isShowImportLoadingDialog && (
        <ImportTagsDialog toggleDialog={() => setShowImportLoadingDialog(false)} />
      )}
    </>
  );
};

AllTagsOperationToolbar.propTypes = {
  children: PropTypes.node,
};

export default AllTagsOperationToolbar;
