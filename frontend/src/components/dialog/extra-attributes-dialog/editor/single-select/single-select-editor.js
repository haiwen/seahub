import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { UncontrolledPopover } from 'reactstrap';
import { gettext } from '../../../../../utils/constants';
import SearchInput from '../search-input';
import { getSelectColumnOptions } from '../../../../../utils/extra-attributes';

class SingleSelectEditor extends Component {

  constructor(props) {
    super(props);
    const options = this.getSelectColumnOptions(props);
    this.state = {
      value: props.row[props.column.key],
      searchVal: '',
      highlightIndex: -1,
      maxItemNum: 0,
      itemHeight: 0,
      filteredOptions: options,
    };
    this.options = options;
    this.timer = null;
    this.editorKey = `single-select-editor-${props.column.key}`;
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const currentCascadeColumnValue = this.getCascadeColumnValue(this.props);
    const nextCascadeColumnValue = this.getCascadeColumnValue(nextProps);
    if (currentCascadeColumnValue !== nextCascadeColumnValue) {
      this.options = this.getSelectColumnOptions(nextProps);
      this.setState({ filteredOptions: this.options });
    }
  }

  getCascadeColumnValue = (props) => {
    const { column, row, columns } = props;
    const { data } = column;
    const { cascade_column_key } = data || {};
    if (!cascade_column_key) return '';
    const cascadeColumn = columns.find(item => item.key === cascade_column_key);
    if (!cascadeColumn) return '';
    return row[cascade_column_key];
  }

  getSelectColumnOptions = (props) => {
    const { column, row, columns } = props;
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

  toggle = () => {
    this.ref.toggle();
    this.props.onUpdateState();
  }

  onChangeSearch = (searchVal) => {
    const { searchVal: oldSearchVal } = this.state;
    if (oldSearchVal === searchVal) return;
    const val = searchVal.toLowerCase();
    const filteredOptions = val ?
      this.options.filter((item) => item.name && item.name.toLowerCase().indexOf(val) > -1) : this.options;
    this.setState({ searchVal, filteredOptions });
  }

  onSelectOption = (optionID) => {
    const { column } = this.props;
    this.setState({ value: optionID }, () => {
      this.props.onCommit({ [column.key]: optionID }, column);
      this.toggle();
    });
  }

  render() {
    const { value, filteredOptions } = this.state;
    const { column } = this.props;

    return (
      <UncontrolledPopover
        target={this.editorKey}
        className="single-select-editor-popover"
        trigger="legacy"
        placement="bottom-start"
        hideArrow={true}
        toggle={this.toggle}
        ref={ref => this.ref = ref}
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
            {filteredOptions.map(option => {
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
