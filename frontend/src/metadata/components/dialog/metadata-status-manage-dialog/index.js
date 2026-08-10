import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Button } from 'reactstrap';
import Switch from '../../../../components/switch';
import toaster from '../../../../components/toast';
import TurnOffConfirmDialog from '../turn-off-confirm-dialog';
import metadataAPI from '../../../api';
import { Utils } from '../../../../utils/utils';
import { gettext } from '../../../../utils/constants';
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
  },
  {
    key: PRIVATE_COLUMN_KEY.AI_SUMMARY,
    name: '_ai_summary',
    type: CellType.LONG_TEXT,
  },
  {
    key: PRIVATE_COLUMN_KEY.AI_SUMMARY_MTIME,
    name: '_ai_summary_mtime',
    type: CellType.DATE,
  }
];

const MetadataStatusManagementDialog = ({ value: oldValue, repoID, hiddenColumns: oldHiddenColumns, submit, modifyHiddenColumns }) => {
  const [value, setValue] = useState(oldValue);
  const [submitting, setSubmitting] = useState(false);
  const [showTurnOffConfirmDialog, setShowTurnOffConfirmDialog] = useState(false);
  const [isHiddenColumnsVisible, setHiddenColumnsVisible] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState(oldHiddenColumns || []);

  const columns = useMemo(() => {
    return GLOBAL_CONFIGURABLE_COLUMNS.map(column => {
      return {
        ...column,
        name: getColumnDisplayName(column.key, column.name),
      };
    });
  }, []);

  const onSubmit = useCallback((nextValue) => {
    if (oldHiddenColumns !== hiddenColumns) {
      modifyHiddenColumns(hiddenColumns);
    }

    // Only invoke metadataAPI when value changed
    if (oldValue !== nextValue) {
      if (!nextValue) {
        setShowTurnOffConfirmDialog(true);
        return;
      }
      setSubmitting(true);
      metadataAPI.createMetadata(repoID).then(res => {
        setSubmitting(false);
        submit(true);
        setValue(nextValue);
      }).catch(error => {
        const errorMsg = Utils.getErrorMsg(error);
        toaster.danger(errorMsg);
        setSubmitting(false);
      });
    }
  }, [repoID, oldValue, oldHiddenColumns, modifyHiddenColumns, submit, hiddenColumns]);

  const turnOffConfirmToggle = useCallback(() => {
    setShowTurnOffConfirmDialog(!showTurnOffConfirmDialog);
  }, [showTurnOffConfirmDialog]);

  const turnOffConfirmSubmit = useCallback(() => {
    setShowTurnOffConfirmDialog(false);
    setSubmitting(true);
    metadataAPI.deleteMetadata(repoID).then(res => {
      setSubmitting(false);
      submit(false);
      setValue(false);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      setSubmitting(false);
    });
  }, [repoID, submit]);

  const onValueChange = useCallback(() => {
    const nextValue = !value;
    const canSubmit = (!submitting && oldValue !== nextValue) || (!isHiddenColumnsVisible && (oldHiddenColumns !== hiddenColumns));
    if (canSubmit) {
      onSubmit(nextValue);
    }
  }, [value, onSubmit, submitting, oldValue, isHiddenColumnsVisible, oldHiddenColumns, hiddenColumns]);

  const hidePopover = useCallback(() => {
    setHiddenColumnsVisible(false);

    const canSubmit = (!submitting && oldValue !== value) || (oldHiddenColumns !== hiddenColumns);
    if (canSubmit) {
      onSubmit(value);
    }
  }, [onSubmit, submitting, oldValue, value, oldHiddenColumns, hiddenColumns]);

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

  const count = hiddenColumns.length;
  let text = gettext('Hide properties');
  if (count === 1) {
    text = gettext('1 Hidden property');
  } else if (count > 1) {
    text = `${count} ${gettext('Hidden properties')}`;
  }
  return (
    <div className='library-setting-item'>
      <h3 className='library-setting-item-heading'>{gettext('Extended properties')}</h3>
      <>
        <Switch
          checked={value}
          disabled={submitting}
          size="large"
          textPosition="right"
          className={classnames('change-metadata-status-management w-100', { 'disabled': submitting })}
          onChange={onValueChange}
          placeholder={gettext('Enable extended properties')}
        />
        <p className="setting-tip">
          {gettext('After enable extended properties for files, you can add different properties to files, like collaborators, file expiring time, file description. You can also create different views for files based extended properties.')}
        </p>
        {value && (
          <div className="metadata-status-hide-columns-container mt-5">
            <h4 className="library-setting-item-2nd-heading">{gettext('Global hidden properties')}</h4>
            <p className="setting-tip">
              {gettext('Global hidden properties will not be displayed in all views.')}
            </p>
            <Button
              id="metadata-status-hide-properties-button"
              className={classnames('mt-1 border-0 font-weight-normal metadata-status-hide-properties-button', { 'disabled': !oldValue })}
              onClick={onClickHideColumns}
            >
              <Icon symbol="hide" size={24} />
              <span className="ml-2">{text}</span>
            </Button>
            {isHiddenColumnsVisible && (
              <HideColumnPopover
                placement="bottom-end"
                target="metadata-status-hide-properties-button"
                hiddenColumns={hiddenColumns}
                columns={columns}
                hidePopover={hidePopover}
                onChange={onHiddenColumnsChange}
              />
            )}
          </div>
        )}
      </>
      {showTurnOffConfirmDialog && (
        <TurnOffConfirmDialog title={gettext('Turn off extended properties')} toggle={turnOffConfirmToggle} submit={turnOffConfirmSubmit}>
          <p>{gettext('Do you really want to turn off extended properties? Existing properties will all be deleted.')}</p>
        </TurnOffConfirmDialog>
      )}
    </div>
  );
};

MetadataStatusManagementDialog.propTypes = {
  value: PropTypes.bool,
  repoID: PropTypes.string.isRequired,
  submit: PropTypes.func.isRequired,
};

export default MetadataStatusManagementDialog;
