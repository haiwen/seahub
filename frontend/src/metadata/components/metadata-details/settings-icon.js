import React, { useMemo, useCallback, useState } from 'react';
import Icon from '../../../components/icon';
import HideColumnPopover from '../popover/hidden-column-popover';
import { useMetadataDetails } from '../../hooks';
import { useMetadataStatus } from '../../../hooks';

const SettingsIcon = () => {
  const [isShowSetter, setShowSetter] = useState(false);

  const { enableMetadata } = useMetadataStatus();
  const { modifyColumnOrder, modifyHiddenColumns, record, columns, canModifyDetails } = useMetadataDetails();
  const hiddenColumns = useMemo(() => columns.filter(c => !c.shown).map(c => c.key), [columns]);

  const onSetterToggle = useCallback(() => {
    setShowSetter(!isShowSetter);
  }, [isShowSetter]);
  const target = useMemo(() => 'detail-control-settings-btn', []);

  if (!enableMetadata || !canModifyDetails || !record) return null;

  return (
    <>
      <div className="detail-control mr-2" id={target} onClick={onSetterToggle}>
        <Icon symbol="set-up" className="detail-control-close" />
      </div>
      {isShowSetter && (
        <HideColumnPopover
          readOnly={false}
          hiddenColumns={hiddenColumns}
          target={target}
          placement="bottom-end"
          columns={columns}
          hidePopover={onSetterToggle}
          onChange={modifyHiddenColumns}
          modifyColumnOrder={modifyColumnOrder}
        />
      )}
    </>
  );
};

export default SettingsIcon;
