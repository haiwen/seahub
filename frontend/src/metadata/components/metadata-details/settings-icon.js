import React, { useMemo, useCallback, useState } from 'react';
import { gettext } from '../../../utils/constants';
import Icon from '../../../components/icon';
import HideColumnPopover from '../popover/hidden-column-popover';
import { useMetadataDetails } from '../../hooks';
import { useMetadataStatus } from '../../../hooks';

const SettingsIcon = () => {
  const [isShowSetter, setShowSetter] = useState(false);

  const { enableMetadata, globalHiddenColumns } = useMetadataStatus();
  const { modifyColumnOrder, modifyHiddenColumns, record, columns, canModifyDetails } = useMetadataDetails();
  const validColumns = useMemo(() => columns.filter(c => !globalHiddenColumns.includes(c.key)), [columns, globalHiddenColumns]);
  const hiddenColumns = useMemo(() => validColumns.filter(c => !c.shown).map(c => c.key), [validColumns]);

  const onSetterToggle = useCallback(() => {
    setShowSetter(!isShowSetter);
  }, [isShowSetter]);
  const target = useMemo(() => 'detail-control-settings-btn', []);

  if (!enableMetadata || !canModifyDetails || !record) return null;

  return (
    <>
      <div className="detail-control mr-2" id={target} onClick={onSetterToggle} title={gettext('Settings')}>
        <Icon symbol="set-up" className="detail-control-icon" />
      </div>
      {isShowSetter && (
        <HideColumnPopover
          readOnly={false}
          hiddenColumns={hiddenColumns}
          target={target}
          placement="bottom-end"
          columns={validColumns}
          hidePopover={onSetterToggle}
          onChange={modifyHiddenColumns}
          modifyColumnOrder={modifyColumnOrder}
        />
      )}
    </>
  );
};

export default SettingsIcon;
