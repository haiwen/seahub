import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Alert, Button, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import Icon from '../icon';
import SearchInput from '../search-input';
import { gettext } from '../../utils/constants';
import { filterWikiIcons, WIKI_ICON_CATEGORIES } from './constants';
import { WikiIconGlyph } from './wiki-icon';

import '../../css/seahub-modal-header.css';
import './wiki-icon-selector.css';

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
    common: gettext('Common Icons'),
    'system-devices': gettext('System & Devices Icons'),
    'transport-location': gettext('Transport & Location Icons'),
    'entertainment-games': gettext('Entertainment & Games Icons'),
    'medical-health': gettext('Medical & Health Icons'),
    'design-geometry': gettext('Design & Geometry Icons'),
    'objects-daily-life': gettext('Objects & Daily Life Icons'),
    'nature-science': gettext('Nature & Science Icons'),
    'business-finance': gettext('Business & Finance Icons'),
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

  renderIcon = (icon) => {
    const { selectedColor, selectedIcon } = this.props;
    const isSelected = icon === selectedIcon;
    return (
      <button
        key={icon}
        type="button"
        className={classNames('wiki-icon-selector-option', { selected: isSelected })}
        style={isSelected ? {
          backgroundColor: `${selectedColor}1A`,
          color: selectedColor,
        } : null}
        onClick={() => this.props.onIconSelect(icon)}
        aria-label={`${gettext('Select icon')} ${icon}`}
        aria-pressed={isSelected}
      >
        <WikiIconGlyph icon={icon} />
      </button>
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
    const icons = filterWikiIcons(this.state.searchValue);
    if (!icons.length) {
      return <div className="wiki-icon-selector-empty">{gettext('No icons found')}</div>;
    }

    return (
      <div className="wiki-icon-selector-grid wiki-icon-selector-search-results">
        {icons.map(this.renderIcon)}
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
          <ModalHeader className="seahub-modal-header wiki-icon-selector-header">
            <div className="seahub-modal-title-content">
              <button
                type="button"
                className="wiki-icon-selector-back"
                onClick={onPrevious}
                aria-label={gettext('Previous')}
              >
                <Icon symbol="arrow-left" />
              </button>
              <span>{gettext('Select Icon')}</span>
            </div>
          </ModalHeader>
        }
        <ModalBody className="wiki-icon-selector-body">
          <div className="wiki-icon-selector-scroll">
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
          <Button color="primary" onClick={onSubmit} disabled={isSubmitDisabled || isSubmitting}>
            {gettext('Submit')}
          </Button>
        </ModalFooter>
      </>
    );
  }
}

WikiIconSelector.propTypes = propTypes;

export default WikiIconSelector;
