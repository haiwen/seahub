import React from 'react';
import PropTypes from 'prop-types';
import intl from 'react-intl-universal';
import { UncontrolledPopover } from 'reactstrap';
import isHotkey from 'is-hotkey';
import { COLUMNS_ICON_CONFIG } from '../../../_basic';
import HideColumnItem from '../hide-column-popover-widgets/hide-column-item';
import { getEventClassName } from '../../../utils/utils';

import './index.css';

class HideColumnPopover extends React.Component {

  static defaultProps = {
    readonly: false,
  };

  constructor(props) {
    super(props);
    this.state = {
      fieldSettings: [],
      searchVal: '',
    };
  }

  componentDidMount() {
    document.addEventListener('click', this.hidePopover, true);
    document.addEventListener('keydown', this.onHotKey);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.hidePopover, true);
    document.removeEventListener('keydown', this.onHotKey);
  }

  hidePopover = (e) => {
    if (this.popoverRef && !getEventClassName(e).includes('popover') && !this.popoverRef.contains(e.target)) {
      this.props.onPopoverToggle(e);
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  onHotKey = (e) => {
    if (isHotkey('esc', e)) {
      e.preventDefault();
      this.props.onPopoverToggle();
    }
  };

  static getDerivedStateFromProps(nextProps, preState) {
    const { columns, shownColumnKeys } = nextProps;
    let fieldSettings = columns.map(column => {
      return {
        key: column.key,
        isChecked: shownColumnKeys.includes(column.key),
        columnName: column.name,
        columnIcon: COLUMNS_ICON_CONFIG[column.type],
      };
    });
    // table page cannot hide first column
    fieldSettings.shift();
    return { fieldSettings: fieldSettings };
  }

  onChooseAllColumns = () => {
    const { columns } = this.props;
    let shownColumnKeys = [];
    const { fieldSettings } = this.state;
    const newFieldSettings = fieldSettings.map(setting => {
      setting.isChecked = true;
      shownColumnKeys.push(setting.key);
      return setting;
    });
    shownColumnKeys.unshift(columns[0].key);
    this.setState({ fieldSettings: newFieldSettings }, () => {
      this.props.modifyHiddenColumns(shownColumnKeys);
    });
  };

  onHideAllColumns = () => {
    const { columns } = this.props;
    const newFieldSettings = this.state.fieldSettings.map(setting => {
      setting.isChecked = false;
      return setting;
    });
    // table page cannot hide first column
    const shownColumnKeys = [columns[0].key];
    this.setState({ fieldSettings: newFieldSettings }, () => {
      this.props.modifyHiddenColumns(shownColumnKeys);
    });
  };

  onUpdateFieldSetting = (columnSetting) => {
    const { columns } = this.props;
    const { fieldSettings } = this.state;
    let shownColumnKeys = [];
    const newFieldSettings = fieldSettings.map(setting => {
      if (setting.key === columnSetting.key) {
        setting = columnSetting;
      }
      if (setting.isChecked) {
        shownColumnKeys.push(setting.key);
      }
      return setting;
    });
    // table page cannot hide first column
    if (!shownColumnKeys.includes(columns[0].key)) {
      shownColumnKeys.unshift(columns[0].key);
    }
    this.setState({ fieldSettings: newFieldSettings }, () => {
      this.props.modifyHiddenColumns(shownColumnKeys);
    });
  };

  onPopoverInsideClick = (e) => {
    e.stopPropagation();
  };

  onChangeSearch = (event) => {
    let { searchVal } = this.state;
    if (searchVal === event.target.value) {
      return;
    }
    searchVal = event.target.value;
    this.setState({ searchVal });
  };

  getFilteredColumns = () => {
    let { searchVal, fieldSettings } = this.state;
    searchVal = searchVal.toLowerCase();
    if (!searchVal) {
      return fieldSettings;
    }
    return fieldSettings.filter((setting) => {
      return setting.columnName.toLowerCase().includes(searchVal);
    });
  };

  render() {
    const { target, readonly } = this.props;
    const fieldSettings = this.getFilteredColumns();
    const isEmpty = fieldSettings.length === 0 ? true : false;
    return (
      <UncontrolledPopover
        placement='bottom-end'
        isOpen={true}
        target={target}
        fade={false}
        hideArrow={true}
        className="hidden-column-popover"
        boundariesElement={document.body}
      >
        <div ref={ref => this.popoverRef = ref} onClick={this.onPopoverInsideClick}>
          <div className={`field-settings ${isEmpty ? 'empty' : ''}`}>
            <div className="search-column">
              <input className="form-control" type="text" placeholder={intl.get('Search_column')} value={this.state.searchVal} onChange={this.onChangeSearch} />
            </div>
            {isEmpty &&
              <div className="empty-hidden-columns-container">
                <div className="empty-hidden-columns-list">{intl.get('No_columns_available_to_be_hidden')}</div>
              </div>
            }
            {!isEmpty &&
              <>
                <div className="field-settings-body" style={{ maxHeight: (window.innerHeight - 200) + 'px' }}>
                  {fieldSettings.map(setting => {
                    return (
                      <HideColumnItem
                        key={setting.key}
                        setting={setting}
                        onUpdateFieldSetting={this.onUpdateFieldSetting}
                        readonly={readonly}
                      />
                    );
                  })}
                </div>
                {(!this.state.searchVal && !readonly) &&
                  <div className="field-settings-header">
                    <div className="hide-all px-2" onClick={this.onHideAllColumns}>{intl.get('Hide_all')}</div>
                    <div className="show-all px-2" onClick={this.onChooseAllColumns}>{intl.get('Show_all')}</div>
                  </div>
                }
              </>
            }
          </div>
        </div>
      </UncontrolledPopover>
    );
  }
}

HideColumnPopover.propTypes = {
  target: PropTypes.string.isRequired,
  shownColumnKeys: PropTypes.array.isRequired,
  columns: PropTypes.array.isRequired,
  modifyHiddenColumns: PropTypes.func.isRequired,
  onPopoverToggle: PropTypes.func.isRequired,
  readonly: PropTypes.bool,
};

export default HideColumnPopover;
