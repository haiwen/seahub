import React, { useMemo, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import ContextMenu from '../../../components/context-menu';
import { gettext, useGoFileserver, fileServerRoot } from '../../../../utils/constants';
import { getRowById } from '../../../utils/table';
import { downloadFile } from '../../../utils/file';
import ZipDownloadDialog from '../../../../components/dialog/zip-download-dialog';
import metadataAPI from '../../../api';
import toaster from '../../../../components/toast';
import { Utils } from '../../../../utils/utils';
import ModalPortal from '../../../../components/modal-portal';

const CONTEXT_MENU_KEY = {
  DOWNLOAD: 'download',
  DELETE: 'delete',
};

const GalleryContextMenu = ({ metadata, selectedImages, boundaryCoordinates, onDelete }) => {
  const [isZipDialogOpen, setIsZipDialogOpen] = useState(false);

  const repoID = window.sfMetadataContext.getSetting('repoID');
  const checkCanDeleteRow = window.sfMetadataContext.checkCanDeleteRow();

  const options = useMemo(() => {
    let validOptions = [{ value: CONTEXT_MENU_KEY.DOWNLOAD, label: gettext('Download') }];
    if (checkCanDeleteRow) {
      validOptions.push({ value: CONTEXT_MENU_KEY.DELETE, label: selectedImages.length > 1 ? gettext('Delete') : gettext('Delete file') });
    }
    return validOptions;
  }, [checkCanDeleteRow, selectedImages]);

  const closeZipDialog = () => {
    setIsZipDialogOpen(false);
  };

  const handleDownload = useCallback(() => {
    if (!selectedImages.length) return;
    if (selectedImages.length === 1) {
      const image = selectedImages[0];
      const record = getRowById(metadata, image.id);
      downloadFile(repoID, record);
      return;
    }
    if (!useGoFileserver) {
      setIsZipDialogOpen(true);
      return;
    }
    const dirents = selectedImages.map(image => {
      const value = image.path === '/' ? image.name : `${image.path}/${image.name}`;
      return value;
    });
    metadataAPI.zipDownload(repoID, '/', dirents).then((res) => {
      const zipToken = res.data['zip_token'];
      location.href = `${fileServerRoot}zip/${zipToken}`;
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }, [repoID, metadata, selectedImages]);

  const handleOptionClick = useCallback(option => {
    switch (option.value) {
      case 'download':
        handleDownload();
        break;
      case 'delete':
        onDelete(selectedImages);
        break;
      default:
        break;
    }
  }, [selectedImages, handleDownload, onDelete]);

  return (
    <>
      <ContextMenu
        options={options}
        boundaryCoordinates={boundaryCoordinates}
        ignoredTriggerElements={['.metadata-gallery-image-item', '.metadata-gallery-grid-image']}
        onOptionClick={handleOptionClick}
      />
      {isZipDialogOpen && (
        <ModalPortal>
          <ZipDownloadDialog
            repoID={repoID}
            path="/"
            target={selectedImages.map(image => image.path === '/' ? image.name : `${image.path}/${image.name}`)}
            toggleDialog={closeZipDialog}
          />
        </ModalPortal>
      )}
    </>
  );
};

GalleryContextMenu.propTypes = {
  metadata: PropTypes.object,
  selectedImages: PropTypes.array,
  boundaryCoordinates: PropTypes.object,
  onDelete: PropTypes.func,
};

export default GalleryContextMenu;
