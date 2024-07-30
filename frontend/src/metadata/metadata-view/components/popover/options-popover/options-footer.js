import React from 'react';
import PropTypes from 'prop-types';
import { UncontrolledTooltip } from 'reactstrap';
import { gettext } from '../../../utils';
import './options-footer.css';

function OptionFooter({ column, onToggle }) {
  const options = column?.data?.options || [];
  const isShowCreateBtn = true;
  const downloadUrl = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(options))}`;
  return (
    <div className='option-editor-footer'>
      <span aria-hidden="true" className="sf3-font-help sf3-font option-editor-tips" id="edit-option-tip"></span>
      <UncontrolledTooltip delay={{ show: 0, hide: 0 }} target={'edit-option-tip'} placement='bottom'>
        {gettext('Use the import/export function to transfer options quickly. (The export is in JSON format.) By pasting cells, copied from a text column, an Excel or a TXT file, you can also add options quickly.')}
      </UncontrolledTooltip>
      {/* {isShowCreateBtn && <span className="item-text" onClick={this.onImportOptionsToggle}>{gettext('Import options')}</span>} */}
      {(options && options.length > 0) &&
        <>
          {isShowCreateBtn &&
            <span className="mx-2">|</span>
          }
          <a href={downloadUrl} download={`${column.name}-options.json`} onClick={onToggle}>
            <span className="item-text">{gettext('Export options')}</span>
          </a>
        </>
      }
    </div>
  );
}

OptionFooter.propTypes = {
  column: PropTypes.object.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default OptionFooter;
