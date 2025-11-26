import React from 'react';
import PropTypes from 'prop-types';
import { UncontrolledTooltip } from 'reactstrap';
import toaster from '../../../../components/toast';
import { gettext } from '../../../../utils/constants';
import { generateOptionID, getColumnOptions } from '../../../utils/column';
import Icon from '../../../../components/icon';

import './options-footer.css';

const OPTION_KEY = {
  'borderColor': true,
  'color': true,
  'id': true,
  'name': true,
  'textColor': true
};

export default class OptionFooter extends React.Component {

  static propTypes = {
    column: PropTypes.object.isRequired,
    onToggle: PropTypes.func.isRequired,
    onImportOptions: PropTypes.func.isRequired,
  };

  getValidOptions = (importedOptions) => {
    const { column } = this.props;
    const options = getColumnOptions(column);
    let validOptions = [...options];
    let optionIdMap = {};
    let optionNameMap = {};
    options.forEach(option => {
      optionIdMap[option.id] = true;
      optionNameMap[option.name] = true;
    });
    for (let i = 0; i < importedOptions.length; i++) {
      let importedOption = importedOptions[i];
      if (!importedOption || typeof importedOption !== 'object') continue;
      if (importedOption.name && importedOption.color && importedOption.id) {
        if (optionNameMap[importedOption.name]) continue;
        if (optionIdMap[importedOption.id]) {
          importedOption.id = generateOptionID(validOptions);
        }
        optionIdMap[importedOption.id] = true;
        optionNameMap[importedOption.name] = true;
        Object.keys(importedOption).forEach(key => {
          if (!OPTION_KEY[key]) delete importedOption[key];
        });
        validOptions.push(importedOption);
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
    const { column } = this.props;
    const oldOptions = getColumnOptions(column);
    const validOptions = this.getValidOptions(options);
    if (validOptions.length === oldOptions.length) {
      toaster.warning(gettext('The imported options already exists'));
      return;
    }
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
        <span className="option-editor-tips" id="edit-option-tip" aria-hidden="true"><Icon symbol="help" /></span>
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
