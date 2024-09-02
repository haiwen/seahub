import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import Editor from '../../cell-editor/rate-editor';
import { gettext } from '../../../utils';

import './index.css';

const RateEditor = ({ value, field, onChange: onChangeAPI }) => {

  const onChange = useCallback((update) => {
    console.log(update);
    // onChangeAPI(newValue);
  }, [onChangeAPI]);

  return (
    <div
      className="sf-metadata-property-detail-editor sf-metadata-rate-property-detail-editor"
      placeholder={gettext('Empty')}
    >
      <Editor isCellSelected={true} field={field} value={value} onChange={onChange} />
    </div>
  );
};

export default RateEditor;
