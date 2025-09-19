import { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import CustomizeSelect from '../../../components/customize-select';
import { gettext } from '../../../utils/constants';

const FILE_TYPES = [
  { id: 'sdoc', label: 'sdoc' },
  { id: 'pdf', label: 'pdf' },
  { id: 'docx', label: 'docx' },
  { id: 'pptx', label: 'pptx' },
  { id: 'xlsx', label: 'xlsx' },
  { id: 'txt', label: 'txt' },
  { id: 'jpg', label: 'jpg' },
  { id: 'jpeg', label: 'jpeg' },
  { id: 'png', label: 'png' },
  { id: 'gif', label: 'gif' }
];

const FileSuffixSelector = ({ readOnly = false, value, modifyFileSuffixes }) => {
  const [selectedSuffixes, setSelectedSuffixes] = useState(value || []);

  const options = useMemo(() => {
    return FILE_TYPES.map(o => {
      const { id, label } = o;
      return {
        value: id,
        label: (
          <div className="select-basic-filter-option">
            <div className="select-basic-filter-option-checkbox mr-2">
              <input type="checkbox" checked={selectedSuffixes.includes(id)} readOnly />
            </div>
            <div className="select-basic-filter-option-name" title={label} aria-label={label}>{label}</div>
          </div>
        )
      };
    });
  }, [selectedSuffixes]);

  const displayValue = useMemo(() => {
    return { label: <>{gettext('File suffix')}</> };
  }, []);

  const onChange = useCallback((newValue) => {
    let newSelectedSuffixes = [...selectedSuffixes];
    if (newSelectedSuffixes.includes(newValue)) {
      newSelectedSuffixes = newSelectedSuffixes.filter(type => type !== newValue);
    } else {
      newSelectedSuffixes.push(newValue);
    }
    setSelectedSuffixes(newSelectedSuffixes);
    modifyFileSuffixes(newSelectedSuffixes);
  }, [selectedSuffixes, modifyFileSuffixes]);

  return (
    <CustomizeSelect
      readOnly={readOnly}
      className={classNames('sf-metadata-basic-filters-select sf-metadata-table-view-basic-filter-file-type-select', {
        'highlighted': selectedSuffixes.length > 0,
      })}
      value={displayValue}
      options={options}
      onSelectOption={onChange}
      supportMultipleSelect={true}
      isInModal={true}
    />
  );
};

FileSuffixSelector.propTypes = {
  readOnly: PropTypes.bool,
  value: PropTypes.array,
  modifyFileSuffixes: PropTypes.func,
};

export default FileSuffixSelector;
