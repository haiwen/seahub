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
import CopyDirent from '../../../../components/dialog/copy-dirent-dialog';
import { Dirent } from '../../../../models';
import { EVENT_BUS_TYPE, PER_LOAD_NUMBER } from '../../../constants';

const CONTEXT_MENU_KEY = {
  DOWNLOAD: 'download',
  DELETE: 'delete',
  COPY: 'copy',
};

const GalleryContextMenu = ({ metadata, selectedImages, boundaryCoordinates, onDelete, onCopyItem, onAddFolder }) => {
  const [isZipDialogOpen, setIsZipDialogOpen] = useState(false);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);

  const repoID = window.sfMetadataContext.getSetting('repoID');
  const checkCanDeleteRow = window.sfMetadataContext.checkCanDeleteRow();

  const options = useMemo(() => {
    let validOptions = [{ value: CONTEXT_MENU_KEY.DOWNLOAD, label: gettext('Download') }];
    if (checkCanDeleteRow) {
      validOptions.push({ value: CONTEXT_MENU_KEY.DELETE, label: selectedImages.length > 1 ? gettext('Delete') : gettext('Delete file') });
    }
    if (selectedImages.length === 1) {
      validOptions.push({ value: CONTEXT_MENU_KEY.COPY, label: gettext('Copy') });
    }
    return validOptions;
  }, [checkCanDeleteRow, selectedImages]);

  const closeZipDialog = () => {
    setIsZipDialogOpen(false);
  };

  const toggleCopyDialog = useCallback(() => {
    setIsCopyDialogOpen(!isCopyDialogOpen);
  }, [isCopyDialogOpen]);

  const copyStatusProbe = async (retries = 3) => {
    const currentRecordsCount = metadata.recordsCount;
    const viewID = metadata.view._id;
    const params = {
      view_id: viewID,
      start: 0,
      limit: PER_LOAD_NUMBER,
    };

    for (let attempt = 0; attempt < retries; attempt++) {
      const res = await window.sfMetadataContext.getMetadata(params);
      const rows = res.data.results;
      if (rows.length > currentRecordsCount) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return false;
  };

  const handleCopyItem = async (destRepo, dirent, destPath, nodeParentPath, isByDialog) => {
    await onCopyItem(destRepo, dirent, destPath, nodeParentPath, isByDialog);
    const copySuccess = await copyStatusProbe(5);
    if (copySuccess) {
      window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.RELOAD_DATA);
    }
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
      case CONTEXT_MENU_KEY.COPY:
        toggleCopyDialog();
        break;
      default:
        break;
    }
  }, [selectedImages, handleDownload, onDelete, toggleCopyDialog]);

  const dirent = new Dirent({ name: selectedImages[0]?.name });
  const path = selectedImages[0]?.path;

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
      {isCopyDialogOpen && (
        <ModalPortal>
          <CopyDirent
            path={path}
            repoID={repoID}
            dirent={dirent}
            isMultipleOperation={false}
            repoEncrypted={false}
            onItemCopy={handleCopyItem}
            onCancelCopy={toggleCopyDialog}
            onAddFolder={onAddFolder}
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
