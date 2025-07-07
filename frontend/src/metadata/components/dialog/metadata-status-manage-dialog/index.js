import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { ModalBody, ModalFooter, Button } from 'reactstrap';
import Switch from '../../../../components/switch';
import toaster from '../../../../components/toast';
import TurnOffConfirmDialog from '../turn-off-confirm-dialog';
import metadataAPI from '../../../api';
import { Utils } from '../../../../utils/utils';
import { gettext, mdFileConutLimit } from '../../../../utils/constants';
import Icon from '../../../../components/icon';
import { HideColumnPopover } from '../../popover';
import { CellType, PRIVATE_COLUMN_KEY } from '../../../constants';
import { getColumnDisplayName } from '../../../utils/column';

import './index.css';

const GLOBAL_CONFIGURABLE_COLUMNS = [
  {
    key: PRIVATE_COLUMN_KEY.PARENT_DIR,
    name: '_parent_dir',
    type: CellType.TEXT,
  },
  {
    key: PRIVATE_COLUMN_KEY.FILE_CREATOR,
    name: '_file_creator',
    type: CellType.TEXT,
  },
  {
    key: PRIVATE_COLUMN_KEY.FILE_CTIME,
    name: '_file_ctime',
    type: CellType.DATE,
  },
  {
    key: PRIVATE_COLUMN_KEY.FILE_MODIFIER,
    name: '_file_modifier',
    type: CellType.TEXT,
  },
  {
    key: PRIVATE_COLUMN_KEY.FILE_MTIME,
    name: '_file_mtime',
    type: CellType.DATE,
  },
  {
    key: PRIVATE_COLUMN_KEY.FILE_TYPE,
    name: '_file_type',
    type: CellType.SINGLE_SELECT,
  },
  {
    key: PRIVATE_COLUMN_KEY.LOCATION,
    name: '_location',
    type: CellType.GEOLOCATION,
  },
  {
    key: PRIVATE_COLUMN_KEY.SIZE,
    name: '_size',
    type: CellType.NUMBER,
  },
  {
    key: PRIVATE_COLUMN_KEY.FILE_DESCRIPTION,
    name: '_description',
    type: CellType.LONG_TEXT,
  }
];

const MetadataStatusManagementDialog = ({ value: oldValue, repoID, hiddenColumns: oldHiddenColumns, toggleDialog: toggle, submit, modifyHiddenColumns }) => {
  const [value, setValue] = useState(oldValue);
  const [submitting, setSubmitting] = useState(false);
  const [showTurnOffConfirmDialog, setShowTurnOffConfirmDialog] = useState(false);
  const [isHiddenColumnsVisible, setHiddenColumnsVisible] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState(oldHiddenColumns || []);

  const hideColumnBtnRef = useRef(null);

  const columns = useMemo(() => {
    return GLOBAL_CONFIGURABLE_COLUMNS.map(column => {
      return {
        ...column,
        name: getColumnDisplayName(column.key, column.name),
      };
    });
  }, []);

  const onToggle = useCallback(() => {
    if (submitting) return;
    toggle && toggle();
  }, [submitting, toggle]);

  const onSubmit = useCallback(() => {
    if (!value) {
      setShowTurnOffConfirmDialog(true);
      return;
    }
    setSubmitting(true);
    metadataAPI.createMetadata(repoID).then(res => {
      submit(true);
      toggle();
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      setSubmitting(false);
    });
  }, [repoID, value, submit, toggle]);

  const turnOffConfirmToggle = useCallback(() => {
    setShowTurnOffConfirmDialog(!showTurnOffConfirmDialog);
  }, [showTurnOffConfirmDialog]);

  const turnOffConfirmSubmit = useCallback(() => {
    setShowTurnOffConfirmDialog(false);
    setSubmitting(true);
    metadataAPI.deleteMetadata(repoID).then(res => {
      submit(false);
      toggle();
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      setSubmitting(false);
    });
  }, [repoID, submit, toggle]);

  const onValueChange = useCallback(() => {
    const nextValue = !value;
    setValue(nextValue);
  }, [value]);

  const hidePopover = useCallback(() => {
    setHiddenColumnsVisible(false);
  }, []);

  const showPopover = useCallback(() => {
    setHiddenColumnsVisible(true);
  }, []);

  const onClickHideColumns = useCallback(() => {
    if (!oldValue) return;
    isHiddenColumnsVisible ? hidePopover() : showPopover();
  }, [oldValue, isHiddenColumnsVisible, hidePopover, showPopover]);

  const onHiddenColumnsChange = useCallback((columns) => {
    setHiddenColumns(columns);
  }, []);

  useEffect(() => {
    if (!isHiddenColumnsVisible && (oldHiddenColumns !== hiddenColumns)) {
      modifyHiddenColumns(hiddenColumns);
    }
  }, [isHiddenColumnsVisible, oldHiddenColumns, hiddenColumns, modifyHiddenColumns]);

  const count = hiddenColumns.length;
  let text = gettext('Hide properties');
  if (count === 1) {
    text = gettext('1 Hidden property');
  } else if (count > 1) {
    text = `${count} ${gettext('Hidden properties')}`;
  }
  return (
    <>
      {!showTurnOffConfirmDialog && (
        <>
          <ModalBody className="metadata-status-management-dialog">
            <Switch
              checked={value}
              disabled={submitting}
              size="large"
              textPosition="right"
              className={classnames('change-metadata-status-management w-100', { 'disabled': submitting })}
              onChange={onValueChange}
              placeholder={gettext('Enable extended properties')}
            />
            <p className="tip m-0">
              {gettext('After enable extended properties for files, you can add different properties to files, like collaborators, file expiring time, file description. You can also create different views for files based extended properties.')}
            </p>
            <br/>
            <p className="tip m-0">
              {gettext('Metadata feature is not supported for libraries containing more than {mdFileConutLimit} files.').replace('{mdFileConutLimit}', mdFileConutLimit)}
            </p>
            {value && (
              <div className="metadata-status-hide-columns-container mt-4">
                <span className="text-truncate">{gettext('Global hidden properties')}</span>
                <p className="tip">
                  {gettext('Global hidden properties will not be displayed in all views.')}
                </p>
                <div
                  ref={hideColumnBtnRef}
                  id="metadata-status-hide-properties-button"
                  className={classnames('metadata-status-hide-properties-button', { 'disabled': !oldValue })}
                  onClick={onClickHideColumns}
                  aria-label="hide properties"
                >
                  <Icon symbol="hide" size={24} />
                  <span className="ml-1">{text}</span>
                </div>
                {isHiddenColumnsVisible && (
                  <HideColumnPopover
                    placement="bottom-start"
                    target="metadata-status-hide-properties-button"
                    hiddenColumns={hiddenColumns}
                    columns={columns}
                    canReorder={false}
                    hidePopover={hidePopover}
                    onChange={onHiddenColumnsChange}
                  />
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={onToggle}>{gettext('Cancel')}</Button>
            <Button color="primary" disabled={oldValue === value || submitting} onClick={onSubmit}>{gettext('Submit')}</Button>
          </ModalFooter>
        </>
      )}
      {showTurnOffConfirmDialog && (
        <TurnOffConfirmDialog title={gettext('Turn off extended properties')} toggle={turnOffConfirmToggle} submit={turnOffConfirmSubmit}>
          <p>{gettext('Do you really want to turn off extended properties? Existing properties will all be deleted.')}</p>
        </TurnOffConfirmDialog>
      )}
    </>
  );
};

MetadataStatusManagementDialog.propTypes = {
  value: PropTypes.bool,
  repoID: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired,
};

export default MetadataStatusManagementDialog;
