import React, { useCallback, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import EditTagDialog from '../dialog/edit-tag-dialog';
import { gettext } from '../../../utils/constants';
import { useTags } from '../../hooks';
import tagsAPI from '../../api';
import ImportTagsDialog from '../../../components/dialog/import-tags-dialog';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import Icon from '../../../components/icon';
import CustomDropdown from '../../../components/dropdown';

const AllTagsOperationToolbar = ({ repoID }) => {
  const [isShowEditTagDialog, setShowEditTagDialog] = useState(false);
  const [isShowImportLoadingDialog, setShowImportLoadingDialog] = useState(false);
  const { tagsData, addTag, reloadTags } = useTags();

  const tags = useMemo(() => {
    if (!tagsData) return [];
    return tagsData.rows;
  }, [tagsData]);

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

  const menuItems = useMemo(() => ([
    {
      key: 'new-tag',
      label: gettext('New tag'),
      icon_dom: <Icon symbol="new" className="mr-2 dropdown-item-icon" />,
      onClick: openAddTag,
    },
    {
      key: 'import-tags',
      label: gettext('Import tags'),
      icon_dom: <Icon symbol="import-sdoc" className="mr-2 dropdown-item-icon" />,
      onClick: handleImportTags,
    }
  ]), [openAddTag, handleImportTags]);

  return (
    <>
      <div className="dir-operation">
        <span className="path-item path-item-read-only">{gettext('All tags')}</span>
        <CustomDropdown
          items={menuItems}
          trigger={(
            <>
              <Icon symbol="new" />
              <Icon symbol="down" />
            </>
          )}
          triggerClassName="path-dropdown-item all-tags-operation-toggle"
          menuClassName="position-fixed"
          menuPortal={false}
        />
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
