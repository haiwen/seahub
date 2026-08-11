import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Alert, Button, ModalBody, ModalFooter } from 'reactstrap';
import SeahubModalHeader from '../../common/seahub-modal-header';
import SearchEmptyTip from '../../common/search-empty-tip';
import Icon from '../../icon';
import SearchInput from '../../search-input';
import Tooltip from '../../tooltip';
import { gettext } from '../../../utils/constants';
import { WIKI_ICON_CATEGORIES } from '../constants';
import { filterWikiIconOptions } from '../constants-utils';
import { WikiIconGlyph } from '../wiki-icon';

import './index.css';

const propTypes = {
  selectedColor: PropTypes.string.isRequired,
  selectedIcon: PropTypes.string,
  onIconSelect: PropTypes.func.isRequired,
  onPrevious: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  isSubmitDisabled: PropTypes.bool,
  isSubmitting: PropTypes.bool,
  errorMessage: PropTypes.string,
  showHeader: PropTypes.bool,
};

const getCategoryName = (categoryId) => {
  const categoryNames = {
    common: gettext('Common icons'),
    'system-devices': gettext('System & devices icons'),
    'transport-location': gettext('Transport & location icons'),
    'entertainment-games': gettext('Entertainment & games icons'),
    'medical-health': gettext('Medical & health icons'),
    'design-geometry': gettext('Design & geometry icons'),
    'objects-daily-life': gettext('Objects & daily life icons'),
    'nature-science': gettext('Nature & science icons'),
    'business-finance': gettext('Business & finance icons'),
  };
  return categoryNames[categoryId];
};

class WikiIconSelector extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      searchValue: '',
    };
  }

  handleSearchChange = (searchValue) => {
    this.setState({ searchValue });
  };

  clearSearch = () => {
    this.setState({ searchValue: '' });
  };

  handleSubmitKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  };

  renderIcon = ({ icon, label }) => {
    const { selectedColor, selectedIcon } = this.props;
    const isSelected = icon === selectedIcon;
    const tooltipTarget = `wiki-icon-selector-option-${icon}`;
    return (
      <React.Fragment key={icon}>
        <button
          id={tooltipTarget}
          type="button"
          className={classNames('wiki-icon-selector-option', { selected: isSelected })}
          style={isSelected ? {
            backgroundColor: `${selectedColor}1A`,
            color: selectedColor,
          } : null}
          onClick={() => this.props.onIconSelect(icon)}
          aria-label={`${gettext('Select icon')} ${label}`}
          aria-pressed={isSelected}
        >
          <WikiIconGlyph icon={icon} />
        </button>
        <Tooltip target={tooltipTarget} placement="top" delay={{ show: 500, hide: 0 }}>
          {label}
        </Tooltip>
      </React.Fragment>
    );
  };

  renderCategorizedIcons = () => {
    return WIKI_ICON_CATEGORIES.map(category => (
      <section className="wiki-icon-selector-category" key={category.id}>
        <h3>
          {getCategoryName(category.id)}
        </h3>
        <div className="wiki-icon-selector-grid">
          {category.icons.map(this.renderIcon)}
        </div>
      </section>
    ));
  };

  renderSearchResults = () => {
    const iconOptions = filterWikiIconOptions(this.state.searchValue);
    if (!iconOptions.length) {
      return (
        <div className="wiki-icon-selector-empty">
          <SearchEmptyTip text={gettext('No icons found')} />
        </div>
      );
    }

    return (
      <div className="wiki-icon-selector-grid wiki-icon-selector-search-results">
        {iconOptions.map(this.renderIcon)}
      </div>
    );
  };

  render() {
    const {
      errorMessage,
      isSubmitting,
      isSubmitDisabled,
      onPrevious,
      onSubmit,
      showHeader = true,
    } = this.props;
    const { searchValue } = this.state;

    return (
      <>
        {showHeader &&
          <SeahubModalHeader className="wiki-icon-selector-header" isShowClose={false}>
            <button
              type="button"
              className="wiki-icon-selector-back"
              onClick={onPrevious}
              aria-label={gettext('Previous')}
            >
              <Icon symbol="arrow-left" />
            </button>
            <span>{gettext('Select icon')}</span>
          </SeahubModalHeader>
        }
        <ModalBody className="wiki-icon-selector-body">
          <div className="wiki-icon-selector-search-container">
            <SearchInput
              className="wiki-icon-selector-search"
              value={searchValue}
              placeholder={gettext('Search icons')}
              onChange={this.handleSearchChange}
              clearValue={this.clearSearch}
              isClearable={true}
              isShowSearchIcon={true}
              autoFocus={true}
              wait={0}
            />
          </div>
          <div className="wiki-icon-selector-scroll">
            {searchValue ? this.renderSearchResults() : this.renderCategorizedIcons()}
            {errorMessage &&
              <Alert color="danger" className="wiki-icon-selector-error mb-0">
                {errorMessage}
              </Alert>
            }
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={onPrevious}>{gettext('Previous')}</Button>
          <Button color="primary" onClick={onSubmit} onKeyDown={this.handleSubmitKeyDown} disabled={isSubmitDisabled || isSubmitting}>
            {gettext('Submit')}
          </Button>
        </ModalFooter>
      </>
    );
  }
}

WikiIconSelector.propTypes = propTypes;

export default WikiIconSelector;
