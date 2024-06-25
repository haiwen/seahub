import React, { Fragment } from 'react';
import { Icon } from '@seafile/sf-metadata-ui-component';
import { COLUMNS_ICON_CONFIG, FILTER_TERM_MODIFIER_SHOW } from '../../../../_basic';
import { gettext } from '../../../../utils';

class FilterItemUtils {

  static generatorColumnOption(column) {
    if (!column) return null;
    const { type, name } = column;
    return {
      value: { column },
      label: (
        <Fragment>
          <span className="filter-header-icon"><Icon iconName={COLUMNS_ICON_CONFIG[type]} /></span>
          <span className='select-option-name'>{name}</span>
        </Fragment>
      )
    };
  }

  static generatorPredicateOption(filterPredicate) {
    return {
      value: { filterPredicate },
      label: <span className='select-option-name'>{gettext(filterPredicate)}</span>
    };
  }

  static generatorTermModifierOption(filterTermModifier) {
    return {
      value: { filterTermModifier },
      label: <span className='select-option-name'>{gettext(FILTER_TERM_MODIFIER_SHOW[filterTermModifier])}</span>
    };
  }

  static generatorSingleSelectOption(option, selectedOption) {
    return {
      value: { columnOption: option },
      label: (
        <div className='select-option-name single-option-name'>
          <div className="single-select-option" style={{ background: option.color, color: option.textColor || null }} title={option.name} aria-label={option.name}>{option.name}</div>
          <div className='single-check-icon'>
            {selectedOption?.id === option.id && <i className="option-edit sf-metadata-font sf-metadata-icon-check-mark"></i>}
          </div>
        </div>
      )
    };
  }

  static generatorMultipleSelectOption(option, filterTerm) {
    return {
      value: { columnOption: option },
      label: (
        <div className='select-option-name multiple-option-name'>
          <div className="multiple-select-option" style={{ background: option.color, color: option.textColor }} title={option.name} aria-label={option.name}>{option.name}</div>
          <div className='multiple-check-icon'>
            {filterTerm.indexOf(option.id) > -1 && <i className="option-edit sf-metadata-font sf-metadata-icon-check-mark"></i>}
          </div>
        </div>
      )
    };
  }

  static generatorConjunctionOptions() {
    return [
      {
        value: { filterConjunction: 'And' },
        label: (<span className='select-option-name'>{gettext('And')}</span>)
      },
      {
        value: { filterConjunction: 'Or' },
        label: (<span className='select-option-name'>{gettext('Or')}</span>)
      }
    ];
  }

  static getActiveConjunctionOption(conjunction) {
    if (conjunction === 'And') {
      return {
        value: { filterConjunction: 'And' },
        label: (<span className='select-option-name'>{gettext('And')}</span>)
      };
    }
    return {
      value: { filterConjunction: 'Or' },
      label: (<span className='select-option-name'>{gettext('Or')}</span>)
    };
  }
}

export default FilterItemUtils;
