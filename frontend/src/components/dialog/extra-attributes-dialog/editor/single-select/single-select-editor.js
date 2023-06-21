import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { UncontrolledPopover } from 'reactstrap';
import { gettext } from '../../../../../utils/constants';
import SearchInput from '../search-input';
import { getSelectColumnOptions } from '../../../../../utils/extra-attributes';

class SingleSelectEditor extends Component {

  constructor(props) {
    super(props);
    const options = this.getSelectColumnOptions();
    this.state = {
      value: props.row[props.column.key],
      searchVal: '',
      highlightIndex: -1,
      maxItemNum: 0,
      itemHeight: 0
    };
    this.options = options;
    this.filteredOptions = options;
    this.timer = null;
    this.editorKey = `single-select-editor-${props.column.key}`;
  }

  getSelectColumnOptions = () => {
    const { column, row, columns } = this.props;
    let options = getSelectColumnOptions(column);
    const { data } = column;
    const { cascade_column_key, cascade_settings } = data || {};
    if (cascade_column_key) {
      const cascadeColumn = columns.find(item => item.key === cascade_column_key);
      if (cascadeColumn) {
        const cascadeColumnValue = row[cascade_column_key];
        if (!cascadeColumnValue) return [];
        const cascadeSetting = cascade_settings[cascadeColumnValue];
        if (!cascadeSetting || !Array.isArray(cascadeSetting) || cascadeSetting.length === 0) return [];
        return options.filter(option => cascadeSetting.includes(option.id));
      }
    }
    return options;
  }

  setRef = (ref) => {
    this.ref = ref;
    if (!this.ref) return;
    const { toggle } = this.ref;
    this.ref.toggle = () => {
      toggle && toggle();
      this.props.onUpdateState();
    };
  }

  onChangeSearch = (searchVal) => {
    const { searchVal: oldSearchVal } = this.state;
    if (oldSearchVal === searchVal) return;
    const val = searchVal.toLowerCase();
    this.filteredOptions = val ?
      this.options.filter((item) => item.name && item.name.toLowerCase().indexOf(val) > -1) : this.options;
    this.setState({ searchVal });
  }

  onSelectOption = (optionID) => {
    const { column } = this.props;
    this.setState({ value: optionID }, () => {
      this.props.onCommit({ [column.key]: optionID }, column);
      this.ref.toggle();
    });
  }

  render() {
    const { value } = this.state;
    const { column } = this.props;

    return (
      <UncontrolledPopover
        target={this.editorKey}
        className="single-select-editor-popover"
        trigger="legacy"
        placement="bottom-start"
        hideArrow={true}
        ref={this.setRef}
      >
        <div className="single-select-editor-container">
          <div className="search-single-selects">
            <SearchInput
              placeholder={gettext('Find an option')}
              onKeyDown={this.onKeyDown}
              onChange={this.onChangeSearch}
              autoFocus={true}
            />
          </div>
          <div className="single-select-editor-content">
            {this.filteredOptions.map(option => {
              const isSelected = value === option.id;
              const style = {
                backgroundColor: option.color,
                color: option.textColor || null,
                maxWidth: Math.max(200 - 62,  column.width ? column.width  -62 : 0)
              };
              return (
                <div className="single-select-option-container" key={option.id} onClick={this.onSelectOption.bind(this, isSelected ? null : option.id)}>
                  <div className="single-select-option" style={style}>{option.name}</div>
                  <div className="single-select-option-selected">
                    {isSelected && (<i ></i>)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </UncontrolledPopover>
    );
  }
}

SingleSelectEditor.propTypes = {
  value: PropTypes.string,
  row: PropTypes.object,
  column: PropTypes.object,
  columns: PropTypes.array,
  onUpdateState: PropTypes.func,
  onCommit: PropTypes.func,
};

export default SingleSelectEditor;
