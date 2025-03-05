import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import CustomizePopover from '../../../../../components/customize-popover';
import Loading from '../../../../../components/loading';
import { gettext } from '../../../../../utils/constants';

import './index.css';

const ConfirmDeletePopover = ({ option, onToggle, onSubmit, deleteNumber }) => {
  const [isDeleting, setDeleting] = useState(false);

  const toggle = useCallback(() => {
    onToggle();
  }, [onToggle]);

  const submit = useCallback(() => {
    setDeleting(true);
    onSubmit();
  }, [onSubmit]);
  return (
    <CustomizePopover
      target={`sf-metadata-edit-option-more-operation-${option.id}`}
      popoverClassName="sf-metadata-confirm-delete-option-popover"
      hidePopover={toggle}
      hidePopoverWithEsc={toggle}
    >
      <div className="sf-metadata-tip-default mt-2 mb-4">
        {gettext('{name} rows use this option.').replace('{name}', deleteNumber)}{' '}
        {gettext('Are you sure you want to delete this option?')}
      </div>
      <div className="d-flex justify-content-end">
        <button className="btn btn-secondary mr-2" onClick={toggle}>{gettext('Cancel')}</button>
        <button className="btn btn-primary" disabled={isDeleting} onClick={isDeleting ? () => {} : submit}>{isDeleting ? <Loading className="sf-metadata-loading-tip center" /> : gettext('Delete')}</button>
      </div>
    </CustomizePopover>
  );

};

ConfirmDeletePopover.propTypes = {
  option: PropTypes.object,
  onToggle: PropTypes.func,
  onSubmit: PropTypes.func,
  deleteNumber: PropTypes.number,
};

export default ConfirmDeletePopover;
