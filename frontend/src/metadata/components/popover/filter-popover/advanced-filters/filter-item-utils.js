import React from 'react';
import Icon from '../../../../../components/icon';
import { gettext } from '../../../../../utils/constants';
import { COLUMNS_ICON_CONFIG, FILTER_PREDICATE_SHOW, FILTER_TERM_MODIFIER_SHOW } from '../../../../constants';

class FilterItemUtils {

  static generateColumnOption(column) {
    if (!column) return null;
    const { type, name } = column;
    return {
      value: { column },
      label: (
        <div>
          <span className="sf-metadata-filter-header-icon">
            <Icon className="sf-metadata-icon" symbol={COLUMNS_ICON_CONFIG[type]} />
          </span>
          <span className="select-option-name">{name}</span>
        </div>
      )
    };
  }

  static generatePredicateOption(filterPredicate) {
    return {
      value: { filterPredicate },
      label: <span className="select-option-name">{FILTER_PREDICATE_SHOW[filterPredicate]}</span>
    };
  }

  static generateTermModifierOption(filterTermModifier) {
    return {
      value: { filterTermModifier },
      label: <span className="select-option-name">{FILTER_TERM_MODIFIER_SHOW[filterTermModifier]}</span>
    };
  }

  static generateSingleSelectOption(option, selectedOption) {
    return {
      value: { columnOption: option },
      label: (
        <div className="select-option-name single-option-name">
          <div
            className="single-select-option"
            style={{ background: option.color, color: option.textColor || null }}
            title={option.name}
            aria-label={option.name}
          >
            {option.name}
          </div>
          <div className="single-check-icon">
            {selectedOption?.id === option.id && <Icon symbol="check-thin" />}
          </div>
        </div>
      )
    };
  }

  static generateMultipleSelectOption(option, filterTerm) {
    return {
      value: { columnOption: option },
      label: (
        <div className="select-option-name multiple-option-name">
          <div
            className="multiple-select-option"
            style={{ background: option.color, color: option.textColor || null }}
            title={option.name}
            aria-label={option.name}
          >
            {option.name}
          </div>
          <div className="multiple-check-icon">
            {filterTerm.indexOf(option.id) > -1 && <Icon symbol="check-thin" />}
          </div>
        </div>
      )
    };
  }

  static generateConjunctionOptions() {
    return [
      {
        value: { filterConjunction: 'And' },
        label: (<span className="select-option-name">{gettext('And')}</span>)
      },
      {
        value: { filterConjunction: 'Or' },
        label: (<span className="select-option-name">{gettext('Or')}</span>)
      }
    ];
  }

  static getActiveConjunctionOption(conjunction) {
    if (conjunction === 'And') {
      return {
        value: { filterConjunction: 'And' },
        label: (<span className="select-option-name">{gettext('And')}</span>)
      };
    }
    return {
      value: { filterConjunction: 'Or' },
      label: (<span className="select-option-name">{gettext('Or')}</span>)
    };
  }
}

export default FilterItemUtils;
