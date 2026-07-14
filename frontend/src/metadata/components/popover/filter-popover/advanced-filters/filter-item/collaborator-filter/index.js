import React, { Fragment, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import CustomizeSelect from '../../../../../../../components/customize-select';
import DeleteCollaborator from '../../../../../cell-editors/collaborator-editor/delete-collaborator';
import { gettext } from '../../../../../../../utils/constants';
import { FILTER_PREDICATE_TYPE } from '../../../../../../constants';
import Icon from '../../../../../../../components/icon';

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
                    title={collaborator.name}
                    aria-label={collaborator.name}
                  >{collaborator.name}
                  </span>
                </div>
              </div>
              <div className='collaborator-check-icon'>
                {isSelected && <Icon symbol="check" />}
              </div>
            </div>
          </Fragment>
        )
      };
    });
  }, [filterIndex, collaborators, filterTerm]);

  const selectedCollaborators = useMemo(() => {
    if (!Array.isArray(filterTerm)) return [];
    return filterTerm.filter(email => collaborators.some(collaborator => collaborator.email === email));
  }, [filterTerm, collaborators]);

  const onDeleteCollaborator = useCallback((email, event) => {
    event && event.stopPropagation();
    event && event.nativeEvent && event.nativeEvent.stopImmediatePropagation();
    const collaborator = collaborators.find(item => item.email === email);
    if (!collaborator) return;
    onSelectCollaborator({ filterIndex, columnOption: collaborator });
  }, [collaborators, filterIndex, onSelectCollaborator]);

  const selectValue = useMemo(() => {
    if (selectedCollaborators.length === 0) return null;
    return (
      <DeleteCollaborator
        value={selectedCollaborators}
        collaborators={collaborators}
        onDelete={onDeleteCollaborator}
        removable={!readOnly}
        showRemoveTooltip={false}
      />
    );
  }, [selectedCollaborators, collaborators, onDeleteCollaborator, readOnly]);

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
      searchPlaceholder={gettext('Search collaborators')}
      isShowSelected={selectedCollaborators.length > 0}
      noOptionsPlaceholder={gettext('No collaborators')}
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
