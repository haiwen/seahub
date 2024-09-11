import React from 'react';
import PropTypes from 'prop-types';
import { UncontrolledTooltip } from 'reactstrap';
import { gettext } from '../../../utils';
import toaster from '../../../../../components/toast';
import './options-footer.css';

export default class OptionFooter extends React.Component {

  static propTypes = {
    column: PropTypes.object.isRequired,
    onToggle: PropTypes.func.isRequired,
    onImportOptions: PropTypes.func.isRequired,
  };

  getValidOptions = (importedOptions) => {
    const { column } = this.props;
    const options = column?.data?.options || [];
    let validOptions = [];
    let optionIdMap = {};
    options.forEach(option => optionIdMap[option.id] = true);
    for (let i = 0; i < importedOptions.length; i++) {
      if (!importedOptions[i] || typeof importedOptions[i] !== 'object') {
        continue;
      }
      if (importedOptions[i].name && importedOptions[i].color && importedOptions[i].id && !optionIdMap[importedOptions[i].id]) {
        validOptions.push(importedOptions[i]);
        optionIdMap[importedOptions[i].id] = true;
      }
    }
    return validOptions;
  };

  onImportOptionsToggle = () => {
    this.importOptionsInput.click();
  };

  importOptionsInputChange = () => {
    if (!this.importOptionsInput.files || this.importOptionsInput.files.length === 0) {
      toaster.warning(gettext('Please select a file'));
      return;
    }
    const fileReader = new FileReader();
    fileReader.onload = this.handleImportOptions.bind(this);
    fileReader.onerror = this.handleImportOptionsError.bind(this);
    fileReader.readAsText(this.importOptionsInput.files[0]);
  };

  handleImportOptions = (event) => {
    let options = [];
    // handle JSON file format is error
    try {
      options = JSON.parse(event.target.result);
    } catch (error) {
      toaster.danger(gettext('The imported options are invalid'));
      return;
    }
    if (!Array.isArray(options) || options.length === 0) {
      toaster.danger(gettext('The imported options are invalid'));
      return;
    }
    let validOptions = this.getValidOptions(options);
    if (validOptions.length === 0) {
      toaster.warning(gettext('The imported option already exists'));
      return;
    }
    const { column } = this.props;
    const oldOptions = column?.data?.options || [];
    validOptions = [...oldOptions, ...validOptions];
    this.props.onImportOptions(validOptions);
    this.importOptionsInput.value = null;
    toaster.success(gettext('Options imported'));
  };

  handleImportOptionsError = () => {
    toaster.success(gettext('Failed imported options'));
  };

  render() {
    const { column, onToggle } = this.props;
    const options = column?.data?.options || [];
    const isShowCreateBtn = true;
    const downloadUrl = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(options))}`;
    return (
      <div className='option-editor-footer'>
        <span aria-hidden="true" className="sf3-font-help sf3-font option-editor-tips" id="edit-option-tip"></span>
        <UncontrolledTooltip delay={{ show: 0, hide: 0 }} target="edit-option-tip" placement="bottom" className="sf-metadata-tooltip">
          {gettext('Use the import/export function to transfer options quickly. (The export is in JSON format.) By pasting cells, copied from a text column, an Excel or a TXT file, you can also add options quickly.')}
        </UncontrolledTooltip>
        <input
          type="file"
          ref={ref => this.importOptionsInput = ref}
          accept='.json'
          className="d-none"
          onChange={this.importOptionsInputChange}
        />
        {isShowCreateBtn && <span className="item-text" onClick={this.onImportOptionsToggle}>{gettext('Import options')}</span>}
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
}
