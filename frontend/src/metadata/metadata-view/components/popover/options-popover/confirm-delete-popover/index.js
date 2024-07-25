import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { CustomizePopover, Loading } from '@seafile/sf-metadata-ui-component';
import { gettext } from '../../../../utils';

import './index.css';

const ConfirmDeletePopover = ({ option, onToggle, onSubmit }) => {
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
      className="sf-metadata-confirm-delete-option-popover"
      hide={toggle}
      hideWithEsc={toggle}
    >
      <div className="sf-metadata-tip-default mt-2 mb-4">
        {gettext('Are you sure you want to delete this option?')}
      </div>
      <div className="d-flex justify-content-end">
        <button className="btn btn-secondary mr-2" onClick={toggle}>{gettext('Cancel')}</button>
        <button className="btn btn-primary" disabled={isDeleting} onClick={isDeleting ? () => {} : submit}>{isDeleting ? <Loading /> : gettext('Delete')}</button>
      </div>
    </CustomizePopover>
  );

};

ConfirmDeletePopover.propTypes = {
  option: PropTypes.object,
  onToggle: PropTypes.func,
  onSubmit: PropTypes.func,
};

export default ConfirmDeletePopover;
