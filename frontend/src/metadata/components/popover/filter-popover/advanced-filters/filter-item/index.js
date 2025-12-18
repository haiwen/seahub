import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { UncontrolledTooltip } from 'reactstrap';
import CustomizeSelect from '../../../../../../components/customize-select';
import SearchInput from '../../../../../../components/search-input';
import Icon from '../../../../../../components/icon';
import IconBtn from '../../../../../../components/icon-btn';
import CollaboratorFilter from './collaborator-filter';
import FilterCalendar from '../filter-calendar';
import RateItem from '../../../../cell-editors/rate-editor/rate-item';
import { gettext } from '../../../../../../utils/constants';
import { Utils } from '../../../../../../utils/utils';
import { isCheckboxColumn, isDateColumn, getColumnOptions as getSelectColumnOptions } from '../../../../../utils/column';
import {
  getFilterByColumn, getUpdatedFilterBySelectSingle, getUpdatedFilterBySelectMultiple, getUpdatedFilterByCreator, getUpdatedFilterByCollaborator,
  getColumnOptions, getUpdatedFilterByPredicate,
} from '../../../../../utils/filter';
import {
  CellType, DELETED_OPTION_BACKGROUND_COLOR, DELETED_OPTION_TIPS, FILTER_PREDICATE_TYPE, FILTER_TERM_MODIFIER_TYPE, FILTER_ERR_MSG,
  filterTermModifierIsWithin,
} from '../../../../../constants';
import FilterItemUtils from '../filter-item-utils';

import './index.css';

const propTypes = {
  readOnly: PropTypes.bool,
  index: PropTypes.number.isRequired,
  filter: PropTypes.object.isRequired,
  filterColumn: PropTypes.object.isRequired,
  filterConjunction: PropTypes.string.isRequired,
  conjunctionOptions: PropTypes.array.isRequired,
  filterColumnOptions: PropTypes.array.isRequired,
  value: PropTypes.object,
  deleteFilter: PropTypes.func.isRequired,
  updateFilter: PropTypes.func.isRequired,
  updateConjunction: PropTypes.func.isRequired,
  collaborators: PropTypes.array,
  errMsg: PropTypes.string,
};

const EMPTY_PREDICATE = [FILTER_PREDICATE_TYPE.EMPTY, FILTER_PREDICATE_TYPE.NOT_EMPTY];

class FilterItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      filterTerm: props.filter.filter_term,
      enterRateItemIndex: -1,
    };
    this.filterPredicateOptions = null;
    this.filterTermModifierOptions = null;

    this.filterToolTip = React.createRef();
    this.invalidFilterTip = React.createRef();

    this.initSelectOptions(props);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { filter } = this.props;
    if (nextProps.filter !== filter) {
      this.initSelectOptions(nextProps);
      this.setState({
        filterTerm: nextProps.filter.filter_term,
      });
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    const currentProps = this.props;
    const shouldUpdated = (
      nextProps.index !== currentProps.index ||
      nextProps.filter !== currentProps.filter ||
      nextProps.filterColumn !== currentProps.filterColumn ||
      nextProps.filterConjunction !== currentProps.filterConjunction ||
      nextProps.conjunctionOptions !== currentProps.conjunctionOptions ||
      nextProps.filterColumnOptions !== currentProps.filterColumnOptions ||
      nextState.enterRateItemIndex !== this.state.enterRateItemIndex
    );
    return shouldUpdated;
  }

  initSelectOptions = (props) => {
    const { filter, filterColumn, value } = props;
    let { filterPredicateList, filterTermModifierList } = getColumnOptions(filterColumn, value);
    // The value of the calculation formula column does not exist in the shared view
    this.filterPredicateOptions = filterPredicateList ? filterPredicateList.map(predicate => {
      return FilterItemUtils.generatorPredicateOption(predicate);
    }).filter(item => item) : [];

    const { filter_predicate } = filter;
    if (isDateColumn(filterColumn)) {
      if (filter_predicate === FILTER_PREDICATE_TYPE.IS_WITHIN) {
        filterTermModifierList = filterTermModifierIsWithin;
      }
      this.filterTermModifierOptions = filterTermModifierList.map(termModifier => {
        return FilterItemUtils.generatorTermModifierOption(termModifier);
      });
    }
  };

  onDeleteFilter = (event) => {
    event.nativeEvent.stopImmediatePropagation();
    const { index } = this.props;
    this.props.deleteFilter(index);
  };

  resetState = (filter) => {
    this.setState({ filterTerm: filter.filter_term });
  };

  onSelectConjunction = (value) => {
    const { filterConjunction } = this.props;
    if (filterConjunction === value.filterConjunction) {
      return;
    }
    this.props.updateConjunction(value.filterConjunction);
  };

  onSelectColumn = (value) => {
    const { index, filter } = this.props;
    const { column } = value;
    if (column.key === filter.column_key) return;

    let newFilter = getFilterByColumn(column, filter);
    if (!newFilter) return;

    this.resetState(newFilter);
    this.props.updateFilter(index, newFilter);
  };

  onSelectPredicate = (value) => {
    const { index, filter, filterColumn } = this.props;
    const { filterPredicate } = value;
    if (filter.filter_predicate === filterPredicate) {
      return;
    }
    let newFilter = getUpdatedFilterByPredicate(filter, filterColumn, filterPredicate);
    this.resetState(newFilter);
    this.props.updateFilter(index, newFilter);
  };

  onSelectTermModifier = (value) => {
    const { index, filter } = this.props;
    const { filterTermModifier } = value;
    const inputRangeLabel = [
      FILTER_TERM_MODIFIER_TYPE.EXACT_DATE,
      FILTER_TERM_MODIFIER_TYPE.NUMBER_OF_DAYS_AGO,
      FILTER_TERM_MODIFIER_TYPE.NUMBER_OF_DAYS_FROM_NOW,
      FILTER_TERM_MODIFIER_TYPE.THE_NEXT_NUMBERS_OF_DAYS,
      FILTER_TERM_MODIFIER_TYPE.THE_PAST_NUMBERS_OF_DAYS
    ];
    if (filter.filter_term_modifier === filterTermModifier) {
      return;
    }
    let filter_term = filter.filter_term;
    if (inputRangeLabel.indexOf(filter.filter_term_modifier) > -1) {
      filter_term = '';
    }
    let newFilter = Object.assign({}, filter, { filter_term_modifier: filterTermModifier, filter_term });
    this.resetState(newFilter);
    this.props.updateFilter(index, newFilter);
  };

  onSelectSingle = (value) => {
    const { index, filter } = this.props;
    const { columnOption: option } = value;
    if (filter.filter_term === option.id) {
      return;
    }

    let newFilter = getUpdatedFilterBySelectSingle(filter, option);
    this.resetState(newFilter);
    this.props.updateFilter(index, newFilter);
  };

  onSelectMultiple = (value) => {
    const { index, filter } = this.props;
    const { columnOption: option } = value;

    let newFilter = getUpdatedFilterBySelectMultiple(filter, option);
    this.resetState(newFilter);
    this.props.updateFilter(index, newFilter);
  };

  onSelectCollaborator = (value) => {
    const { index, filter } = this.props;
    const { columnOption: collaborator } = value;
    let newFilter = getUpdatedFilterByCollaborator(filter, collaborator);
    this.resetState(newFilter);
    this.props.updateFilter(index, newFilter);
  };

  onSelectCreator = (value) => {
    const { index, filter } = this.props;
    const { columnOption: collaborator } = value;
    let newFilter = getUpdatedFilterByCreator(filter, collaborator);
    // the predicate is 'is' or 'is not'
    if (!newFilter) {
      return;
    }
    this.resetState(newFilter);
    this.props.updateFilter(index, newFilter);

  };

  onFilterTermCheckboxChanged = (e) => {
    this.onFilterTermChanged(e.target.checked);
  };

  onFilterTermTextChanged = (value) => {
    this.onFilterTermChanged(value);
  };

  onFilterTermNumberChanged = () => {
    const value = this.numberEditor.getValue();
    this.onFilterTermChanged(Object.values(value)[0]);
  };

  onFilterExactDateChanged = (value) => {
    this.onFilterTermChanged(value);
  };

  onFilterTermChanged = (newFilterTerm) => {
    const { index, filter } = this.props;
    const { filterTerm } = this.state;
    if (newFilterTerm !== filterTerm) {
      this.setState({ filterTerm: newFilterTerm });
      let newFilter = Object.assign({}, filter, { filter_term: newFilterTerm });
      this.props.updateFilter(index, newFilter);
    }
  };

  onMouseEnterRateItem = (index) => {
    this.setState({ enterRateItemIndex: index });
  };

  onMouseLeaveRateItem = () => {
    this.setState({ enterRateItemIndex: -1 });
  };

  onChangeRateNumber = (index) => {
    this.onFilterTermChanged(index);
  };

  getInputComponent = (type) => {
    const { readOnly } = this.props;
    const { filterTerm } = this.state;
    if (type === 'text') {
      return (
        <SearchInput
          value={filterTerm}
          onChange={this.onFilterTermTextChanged}
          autoFocus={false}
          disabled={readOnly}
          className='text-truncate'
        />
      );
    } else if (type === 'checkbox') {
      const { readOnly } = this.props;
      return (
        <input
          type="checkbox"
          className="form-check-input"
          disabled={readOnly}
          checked={filterTerm}
          onChange={this.onFilterTermCheckboxChanged}
        />
      );
    }
  };

  renderConjunction = () => {
    const { index, readOnly, filterConjunction, conjunctionOptions } = this.props;
    switch (index) {
      case 0: {
        return null;
      }
      case 1: {
        const activeConjunction = FilterItemUtils.getActiveConjunctionOption(filterConjunction);
        return (
          <CustomizeSelect
            readOnly={readOnly}
            value={activeConjunction}
            options={conjunctionOptions}
            onSelectOption={this.onSelectConjunction}
          />
        );
      }
      default: {
        return (
          <span className="selected-conjunction-show">{gettext(filterConjunction)}</span>
        );
      }
    }

  };

  renderMultipleSelectOption = (options = [], filterTerm) => {
    const { filter } = this.props;
    const { filter_predicate } = filter;
    let isSupportMultipleSelect = false;
    // The first two options are used for single selection, and the last four options are used for multiple selection
    const supportMultipleSelectOptions = [
      FILTER_PREDICATE_TYPE.IS_ANY_OF,
      FILTER_PREDICATE_TYPE.IS_NONE_OF,
      FILTER_PREDICATE_TYPE.HAS_ANY_OF,
      FILTER_PREDICATE_TYPE.HAS_ALL_OF,
      FILTER_PREDICATE_TYPE.HAS_NONE_OF,
      FILTER_PREDICATE_TYPE.IS_EXACTLY
    ];
    if (supportMultipleSelectOptions.includes(filter_predicate)) {
      isSupportMultipleSelect = true;
    }
    const className = 'select-option-name multiple-select-option';
    let labelArray = [];
    if (Array.isArray(options) && Array.isArray(filterTerm)) {
      filterTerm.forEach((item) => {
        let inOption = options.find(option => option.id === item);
        let optionStyle = { margin: '0 10px 0 0' };
        let optionName = null;
        if (inOption) {
          optionName = inOption.name;
          optionStyle.background = inOption.color;
          optionStyle.color = inOption.textColor || null;
        } else {
          optionStyle.background = DELETED_OPTION_BACKGROUND_COLOR;
          optionName = gettext(DELETED_OPTION_TIPS);
        }
        labelArray.push(
          <span className={className} style={optionStyle} key={'option_' + item} title={optionName} aria-label={optionName}>
            {optionName}
          </span>
        );
      });
    }
    const selectedOptionNames = labelArray.length > 0 ? { label: (<Fragment>{labelArray}</Fragment>) } : {};

    const dataOptions = options.map(option => {
      return FilterItemUtils.generatorMultipleSelectOption(option, filterTerm);
    });
    return (
      <CustomizeSelect
        className="sf-metadata-selector-multiple-select"
        value={selectedOptionNames}
        options={dataOptions}
        onSelectOption={this.onSelectMultiple}
        placeholder={gettext('Select option(s)')}
        searchable={true}
        searchPlaceholder={gettext('Search option')}
        noOptionsPlaceholder={gettext('No options available')}
        supportMultipleSelect={isSupportMultipleSelect}
      />
    );
  };

  getAllCollaborators = () => {
    const collaborators = window.sfMetadata.collaborators;
    const collaboratorsCache = window.sfMetadata.collaboratorsCache;
    return [...collaborators, ...Object.values(collaboratorsCache)];
  };

  renderFilterTerm = (filterColumn) => {
    const { index, filter, collaborators, readOnly } = this.props;
    const { type } = filterColumn;
    const { filter_term, filter_predicate, filter_term_modifier } = filter;
    // predicate is empty or not empty
    if (EMPTY_PREDICATE.includes(filter_predicate)) {
      return null;
    }

    // the cell value will be date
    // 1. DATE
    // 2. CTIME: create-time
    // 3. MTIME: modify-time
    // 4. FORMULA: result_type is date
    if (isDateColumn(filterColumn)) {
      const inputRangeLabel = [
        FILTER_TERM_MODIFIER_TYPE.EXACT_DATE,
        FILTER_TERM_MODIFIER_TYPE.NUMBER_OF_DAYS_AGO,
        FILTER_TERM_MODIFIER_TYPE.NUMBER_OF_DAYS_FROM_NOW,
        FILTER_TERM_MODIFIER_TYPE.THE_NEXT_NUMBERS_OF_DAYS,
        FILTER_TERM_MODIFIER_TYPE.THE_PAST_NUMBERS_OF_DAYS
      ];
      if (inputRangeLabel.indexOf(filter_term_modifier) > -1) {
        if (filter_term_modifier === 'exact_date') {
          return (
            <FilterCalendar
              readOnly={readOnly}
              onChange={this.onFilterExactDateChanged}
              value={this.state.filterTerm}
              filterColumn={filterColumn}
            />
          );
        }
        return this.getInputComponent('text');
      }
      return null;
    }

    switch (type) {
      case CellType.NUMBER:
      case CellType.FILE_NAME:
      case CellType.TEXT:
      case CellType.URL: { // The data in the formula column is a date type that has been excluded
        if (filter_predicate === FILTER_PREDICATE_TYPE.IS_CURRENT_USER_ID) {
          return null;
        }
        return this.getInputComponent('text');
      }
      case CellType.CREATOR:
      case CellType.LAST_MODIFIER: {
        if (filter_predicate === FILTER_PREDICATE_TYPE.INCLUDE_ME) {
          return null;
        }
        const creators = collaborators;
        return (
          <CollaboratorFilter
            readOnly={readOnly}
            filterIndex={index}
            filterTerm={filter_term || []}
            collaborators={creators}
            onSelectCollaborator={this.onSelectCreator}
          />
        );
      }
      case CellType.CHECKBOX: {
        return this.getInputComponent('checkbox');
      }
      case CellType.SINGLE_SELECT: {
        // get options
        const options = getSelectColumnOptions(filterColumn);
        if ([FILTER_PREDICATE_TYPE.IS_ANY_OF, FILTER_PREDICATE_TYPE.IS_NONE_OF].includes(filter_predicate)) {
          return this.renderMultipleSelectOption(options, filter_term);
        }
        let selectedOptionDom = { label: null };
        if (filter_term) {
          let selectedOption = options.find(option => option.id === filter_term);
          const className = 'select-option-name single-select-option';
          const style = selectedOption ?
            { background: selectedOption.color, color: selectedOption.textColor || null } :
            { background: DELETED_OPTION_BACKGROUND_COLOR };
          const selectedOptionName = selectedOption ? selectedOption.name : gettext('deleted option');
          selectedOptionDom = { label: (
            <span className={className} style={style} title={selectedOptionName} aria-label={selectedOptionName}>{selectedOptionName}</span>
          ) };
        }

        let dataOptions = options.map(option => {
          return FilterItemUtils.generatorSingleSelectOption(option);
        });

        return (
          <CustomizeSelect
            readOnly={readOnly}
            className="sf-metadata-selector-single-select"
            value={selectedOptionDom}
            options={dataOptions || []}
            onSelectOption={this.onSelectSingle}
            placeholder={gettext('Select an option')}
            searchable={true}
            searchPlaceholder={gettext('Search option')}
            noOptionsPlaceholder={gettext('No options available')}
            isInModal={this.props.isInModal}
          />
        );
      }
      case CellType.COLLABORATOR: {
        if (filter_predicate === FILTER_PREDICATE_TYPE.INCLUDE_ME) return null;
        const allCollaborators = this.getAllCollaborators();
        return (
          <CollaboratorFilter
            readOnly={readOnly}
            filterIndex={index}
            filterTerm={filter_term || []}
            filter_predicate={filter_predicate}
            collaborators={allCollaborators}
            placeholder={gettext('Select collaborators')}
            onSelectCollaborator={this.onSelectCollaborator}
          />
        );
      }
      case CellType.MULTIPLE_SELECT: {
        let { options = [] } = filterColumn.data || {};
        return this.renderMultipleSelectOption(options, filter_term, readOnly);
      }
      case CellType.RATE: {
        const { max } = filterColumn.data || {};
        let rateList = [];
        for (let i = 0; i < max; i++) {
          const rateItem = (
            <RateItem
              key={i}
              enterIndex={this.state.enterRateItemIndex}
              index={i + 1}
              onMouseEnter={this.onMouseEnterRateItem}
              onMouseLeave={this.onMouseLeaveRateItem}
              value={Number(filter_term) || max}
              field={filterColumn}
              isShowRateItem={true}
              onChange={this.onChangeRateNumber}
            />
          );
          rateList.push(rateItem);
        }
        return (
          <div className="filter-rate-list">
            {rateList}
          </div>
        );
      }
      default: {
        return null;
      }
    }
  };

  isRenderErrorTips = () => {
    const { errMsg } = this.props;
    return errMsg && errMsg !== FILTER_ERR_MSG.INCOMPLETE_FILTER;
  };

  renderTipMessage = () => {
    const { filter, filterColumn } = this.props;
    const { filter_predicate } = filter;
    const isContainPredicate = [CellType.LINK].includes(filterColumn.type) && [FILTER_PREDICATE_TYPE.CONTAINS, FILTER_PREDICATE_TYPE.NOT_CONTAIN].includes(filter_predicate);
    if (!isContainPredicate) return null;
    const isRenderErrorTips = this.isRenderErrorTips();
    if (isRenderErrorTips) return null;
    return (
      <div className="ml-2" >
        <IconBtn id={`filter-tool-tip-${filterColumn.key}`} symbol="exclamation-triangle" iconStyle={{ fill: '#FFC92C' }} />
        <UncontrolledTooltip placement="bottom" target={`filter-tool-tip-${filterColumn.key}`} fade={false} className="sf-metadata-tooltip">
          {gettext('If there are multiple items in the cell, a random one will be chosen and be compared with the filter value.')}
        </UncontrolledTooltip>
      </div>
    );
  };

  renderErrorMessage = () => {
    if (!this.isRenderErrorTips()) {
      return null;
    }
    return (
      <div className="ml-2">
        <div ref={this.invalidFilterTip}>
          <IconBtn symbol="exclamation-triangle" iconStyle={{ fill: '#cd201f' }}/>
        </div>
        <UncontrolledTooltip
          target={this.invalidFilterTip}
          placement='bottom'
          fade={false}
          className="sf-metadata-tooltip"
        >
          {gettext('Invalid filter')}
        </UncontrolledTooltip>
      </div>
    );
  };

  render() {
    const { filterPredicateOptions, filterTermModifierOptions } = this;
    const { filter, filterColumn, filterColumnOptions, readOnly } = this.props;
    const { filter_predicate, filter_term_modifier } = filter;
    const activeColumn = FilterItemUtils.generatorColumnOption(filterColumn);
    const activePredicate = FilterItemUtils.generatorPredicateOption(filter_predicate);
    let activeTermModifier = null;
    let _isCheckboxColumn = false;
    if (isDateColumn(filterColumn)) {
      activeTermModifier = FilterItemUtils.generatorTermModifierOption(filter_term_modifier);
    } else if (isCheckboxColumn(filterColumn)) {
      _isCheckboxColumn = true;
    }

    // current predicate is not empty
    const isNeedShowTermModifier = !EMPTY_PREDICATE.includes(filter_predicate);

    return (
      <div className="filter-item">
        {!readOnly && (
          <div
            tabIndex="0"
            role="button"
            className="delete-filter"
            onClick={this.onDeleteFilter}
            onKeyDown={Utils.onKeyDown}
          >
            <Icon className="sf-metadata-icon" symbol="close" />
          </div>
        )}
        <div className="condition">
          <div className="filter-conjunction">
            {this.renderConjunction()}
          </div>
          <div className="filter-container">
            <div className="filter-column">
              <CustomizeSelect
                readOnly={readOnly}
                value={activeColumn}
                options={filterColumnOptions}
                onSelectOption={this.onSelectColumn}
                searchable={true}
                searchPlaceholder={gettext('Search property')}
                noOptionsPlaceholder={gettext('No results')}
              />
            </div>
            <div className={`filter-predicate ml-2 ${_isCheckboxColumn ? 'filter-checkbox-predicate' : ''}`}>
              <CustomizeSelect
                readOnly={readOnly}
                value={activePredicate}
                options={filterPredicateOptions}
                onSelectOption={this.onSelectPredicate}
              />
            </div>
            {isDateColumn(filterColumn) && isNeedShowTermModifier && (
              <div className="filter-term-modifier ml-2">
                <CustomizeSelect
                  readOnly={readOnly}
                  value={activeTermModifier}
                  options={filterTermModifierOptions}
                  onSelectOption={this.onSelectTermModifier}
                />
              </div>
            )}
            <div className="filter-term ml-2">
              {this.renderFilterTerm(filterColumn)}
            </div>
            {this.renderTipMessage()}
            {this.renderErrorMessage()}
          </div>
        </div>
      </div>
    );
  }
}

FilterItem.propTypes = propTypes;

export default FilterItem;
