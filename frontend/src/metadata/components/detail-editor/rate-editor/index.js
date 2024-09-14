import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import Editor from '../../cell-editors/rate-editor';
import { gettext } from '../../../../utils/constants';

import './index.css';

const RateEditor = ({ value, field, onChange: onChangeAPI }) => {

  const onChange = useCallback((update) => {
    onChangeAPI(update[field.key]);
  }, [field, onChangeAPI]);

  return (
    <div
      className="sf-metadata-property-detail-editor sf-metadata-rate-property-detail-editor"
      placeholder={gettext('Empty')}
    >
      <Editor isCellSelected={true} field={field} value={value} onChange={onChange} />
    </div>
  );
};

RateEditor.propTypes = {
  value: PropTypes.number,
  field: PropTypes.object,
  onChange: PropTypes.func,
};

export default RateEditor;
