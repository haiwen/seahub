import React, { Fragment, useMemo } from 'react';
import PropTypes from 'prop-types';
import { CustomizeSelect, Icon } from '@seafile/sf-metadata-ui-component';
import { gettext } from '../../../../../../../utils/constants';
import { FILTER_PREDICATE_TYPE } from '../../../../../../constants';

import './index.css';

const CollaboratorFilter = ({ readOnly, filterIndex, filterTerm, collaborators, placeholder, filter_predicate, onSelectCollaborator }) => {
  const supportMultipleSelectOptions = useMemo(() => {
    return [
      FILTER_PREDICATE_TYPE.HAS_ANY_OF,
      FILTER_PREDICATE_TYPE.HAS_ALL_OF,
      FILTER_PREDICATE_TYPE.HAS_NONE_OF,
      FILTER_PREDICATE_TYPE.IS_EXACTLY,
    ];
  }, []);

  const isSupportMultipleSelect = useMemo(() => {
    return supportMultipleSelectOptions.indexOf(filter_predicate) > -1 ? true : false;
  }, [supportMultipleSelectOptions, filter_predicate]);

  const options = useMemo(() => {
    if (!Array.isArray(filterTerm)) return [];
    return collaborators.map((collaborator) => {
      let isSelected = filterTerm.findIndex(item => item === collaborator.email) > -1;
      return {
        value: { filterIndex, columnOption: collaborator },
        label: (
          <Fragment>
            <div className="select-option-name option-collaborator">
              <div className="collaborator-container">
                <div className="collaborator">
                  <span className="collaborator-avatar-container">
                    <img className="collaborator-avatar" alt={collaborator.name} src={collaborator.avatar_url} />
                  </span>
                  <span
                    className="collaborator-name text-truncate"
                    style={{ maxWidth: '200px' }}
                    title={collaborator.name}
                    aria-label={collaborator.name}
                  >{collaborator.name}
                  </span>
                </div>
              </div>
              <div className='collaborator-check-icon'>
                {isSelected && (<Icon iconName="check-mark" />)}
              </div>
            </div>
          </Fragment>
        )
      };
    });
  }, [filterIndex, collaborators, filterTerm]);

  const selectValue = useMemo(() => {
    return Array.isArray(filterTerm) && filterTerm.length > 0 && filterTerm.map((item) => {
      let collaborator = collaborators.find(c => c.email === item);
      if (!collaborator) return null;
      return (
        <div key={item} className="collaborator">
          <span className="collaborator-avatar-container">
            <img className="collaborator-avatar" alt={collaborator.name} src={collaborator.avatar_url} />
          </span>
          <span
            className="collaborator-name text-truncate"
            title={collaborator.name}
            aria-label={collaborator.name}
          >{collaborator.name}
          </span>
        </div>
      );
    });
  }, [filterTerm, collaborators]);

  return (
    <CustomizeSelect
      className="sf-metadata-selector-collaborator"
      value={selectValue ? { label: selectValue } : {}}
      onSelectOption={onSelectCollaborator}
      options={options}
      placeholder={placeholder}
      readOnly={readOnly}
      supportMultipleSelect={isSupportMultipleSelect}
      searchable={true}
      searchPlaceholder={gettext('Search collaborator')}
      isShowSelected={false}
      noOptionsPlaceholder={gettext('No collaborators')}
      component={{
        DropDownIcon: (
          <i className="sf3-font sf3-font-down"></i>
        )
      }}
    />
  );
};

CollaboratorFilter.propTypes = {
  filterIndex: PropTypes.number,
  filterTerm: PropTypes.oneOfType([PropTypes.array, PropTypes.string]), // Make the current bug execution the correct code, this can restore in this Component
  filter_predicate: PropTypes.string,
  collaborators: PropTypes.array,
  onSelectCollaborator: PropTypes.func,
  readOnly: PropTypes.bool,
  placeholder: PropTypes.string,
};

export default CollaboratorFilter;
