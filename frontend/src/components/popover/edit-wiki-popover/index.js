import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Alert, Button, Input, Label, Popover } from 'reactstrap';
import Icon from '../../icon';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import {
  DEFAULT_WIKI_COLOR,
  WIKI_ICON_COLORS,
} from '../../wiki-card-view/constants';
import {
  getDisplayedWikiIcons,
  isHomepageWikiIcon,
  resolveWikiIcon,
} from '../../wiki-card-view/constants-utils';
import { WikiIconGlyph } from '../../wiki-card-view/wiki-icon';
import WikiIconSelector from '../../wiki-card-view/wiki-icon-selector';

import './index.css';

const POPOVER_VIEWPORT_HEIGHT_RATIO = 0.6;
const POPOVER_VIEWPORT_MARGIN = 16;
const POPOVER_TARGET_GAP = 8;

const propTypes = {
  wiki: PropTypes.object.isRequired,
  target: PropTypes.string.isRequired,
  onUpdate: PropTypes.func.isRequired,
  toggleCancel: PropTypes.func.isRequired,
};

class EditWikiPopover extends React.Component {

  popoverRef = null;
  popperUpdate = null;
  updateFrame = null;

  constructor(props) {
    super(props);
    const selectedIcon = resolveWikiIcon(props.wiki.icon);
    this.state = {
      name: props.wiki.name,
      selectedColor: props.wiki.color || DEFAULT_WIKI_COLOR,
      selectedIcon,
      pinnedIcon: isHomepageWikiIcon(selectedIcon) ? null : selectedIcon,
      isIconSelectorOpen: false,
      draftSelectedIcon: null,
      isSubmitting: false,
      errorMessage: '',
    };
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleDocumentMouseDown);
    document.addEventListener('keydown', this.handleDocumentKeyDown);
    this.schedulePositionUpdate();
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      prevState.isIconSelectorOpen !== this.state.isIconSelectorOpen ||
      prevState.errorMessage !== this.state.errorMessage
    ) {
      this.schedulePositionUpdate();
    }
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleDocumentMouseDown);
    document.removeEventListener('keydown', this.handleDocumentKeyDown);
    if (this.updateFrame) {
      window.cancelAnimationFrame(this.updateFrame);
    }
  }

  schedulePositionUpdate = () => {
    if (!this.popperUpdate) return;
    if (this.updateFrame) {
      window.cancelAnimationFrame(this.updateFrame);
    }
    this.updateFrame = window.requestAnimationFrame(() => {
      this.updateFrame = null;
      this.popperUpdate();
    });
  };

  handleDocumentMouseDown = (event) => {
    if (this.popoverRef && !this.popoverRef.contains(event.target)) {
      this.props.toggleCancel();
    }
  };

  handleDocumentKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.props.toggleCancel();
    }
  };

  handlePopoverClick = (event) => {
    event.stopPropagation();
  };

  handlePopoverMouseDown = (event) => {
    event.stopPropagation();
  };

  handleNameChange = (event) => {
    this.setState({
      name: event.target.value,
      errorMessage: '',
    });
  };

  handleColorSelect = (selectedColor) => {
    this.setState({ selectedColor, errorMessage: '' });
  };

  handleIconSelect = (selectedIcon) => {
    this.setState({ selectedIcon, errorMessage: '' });
  };

  openIconSelector = () => {
    this.setState({
      isIconSelectorOpen: true,
      draftSelectedIcon: this.state.selectedIcon,
      errorMessage: '',
    });
  };

  closeIconSelector = () => {
    this.setState((state) => {
      const selectedIcon = state.draftSelectedIcon || state.selectedIcon;
      return {
        selectedIcon,
        pinnedIcon: isHomepageWikiIcon(selectedIcon) ? state.pinnedIcon : selectedIcon,
        isIconSelectorOpen: false,
        draftSelectedIcon: null,
        errorMessage: '',
      };
    });
  };

  handleFullIconSelect = (draftSelectedIcon) => {
    this.setState({ draftSelectedIcon, errorMessage: '' });
  };

  hasChanges = (selectedIcon = this.state.selectedIcon) => {
    const { wiki } = this.props;
    const { name, selectedColor } = this.state;
    return name.trim() !== wiki.name ||
      selectedColor !== (wiki.color || DEFAULT_WIKI_COLOR) ||
      selectedIcon !== resolveWikiIcon(wiki.icon);
  };

  validateInput = () => {
    const name = this.state.name.trim();
    if (!name) {
      return gettext('Name is required.');
    }
    if (name.includes('/')) {
      return gettext('Name should not include ' + '\'/\'' + '.');
    }
    return '';
  };

  submitUpdate = (selectedIcon) => {
    const errorMessage = this.validateInput();
    if (errorMessage) {
      this.setState({ errorMessage });
      return;
    }
    if (!this.hasChanges(selectedIcon) || this.state.isSubmitting) {
      return;
    }

    const details = {
      name: this.state.name.trim(),
      icon: selectedIcon,
      color: this.state.selectedColor,
    };
    this.setState({ isSubmitting: true, errorMessage: '' });
    Promise.resolve(this.props.onUpdate(details)).then(() => {
      this.props.toggleCancel();
    }).catch(error => {
      this.setState({
        isSubmitting: false,
        errorMessage: Utils.getErrorMsg(error),
      });
    });
  };

  handleSubmit = () => {
    this.submitUpdate(this.state.selectedIcon);
  };

  handleIconSelectorSubmit = () => {
    const { draftSelectedIcon } = this.state;
    if (!draftSelectedIcon) return;

    this.setState({ selectedIcon: draftSelectedIcon }, () => {
      this.submitUpdate(draftSelectedIcon);
    });
  };

  handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.handleSubmit();
    }
  };

  getPopoverLayout = () => {
    const defaultLayout = {
      maxHeight: '60vh',
      placement: 'bottom-start',
    };
    if (typeof window === 'undefined') {
      return defaultLayout;
    }

    const target = document.getElementById(this.props.target);
    if (!target) {
      return defaultLayout;
    }

    const targetRect = target.getBoundingClientRect();
    const viewportMaxHeight = window.innerHeight * POPOVER_VIEWPORT_HEIGHT_RATIO;
    const availableBelow = window.innerHeight - targetRect.bottom -
      POPOVER_TARGET_GAP - POPOVER_VIEWPORT_MARGIN;
    const availableAbove = targetRect.top - POPOVER_TARGET_GAP - POPOVER_VIEWPORT_MARGIN;
    const useTopPlacement = availableBelow < viewportMaxHeight && availableAbove > availableBelow;
    const availableHeight = Math.max(useTopPlacement ? availableAbove : availableBelow, 0);

    return {
      maxHeight: Math.min(viewportMaxHeight, availableHeight),
      placement: useTopPlacement ? 'top-start' : 'bottom-start',
    };
  };

  render() {
    const {
      draftSelectedIcon,
      errorMessage,
      isIconSelectorOpen,
      isSubmitting,
      name,
      pinnedIcon,
      selectedColor,
      selectedIcon,
    } = this.state;
    const icons = getDisplayedWikiIcons(pinnedIcon);
    const isSubmitDisabled = isSubmitting || !name.trim() || !this.hasChanges();
    const { maxHeight, placement } = this.getPopoverLayout();

    return (
      <Popover
        target={this.props.target}
        placement={placement}
        isOpen={true}
        fade={false}
        hideArrow={true}
        strategy="fixed"
        boundariesElement={document.body}
        modifiers={[
          {
            name: 'offset',
            options: { offset: [0, 8] },
          },
          {
            name: 'preventOverflow',
            options: {
              boundary: 'viewport',
              padding: POPOVER_VIEWPORT_MARGIN,
              tether: false,
            },
          },
        ]}
        className="edit-wiki-popover"
      >
        {({ update }) => {
          this.popperUpdate = update;
          return (
            <div
              ref={ref => this.popoverRef = ref}
              style={{ maxHeight }}
              onClick={this.handlePopoverClick}
              onMouseDown={this.handlePopoverMouseDown}
            >
              {isIconSelectorOpen ?
                <WikiIconSelector
                  showHeader={false}
                  selectedColor={selectedColor}
                  selectedIcon={draftSelectedIcon}
                  onIconSelect={this.handleFullIconSelect}
                  onPrevious={this.closeIconSelector}
                  onSubmit={this.handleIconSelectorSubmit}
                  isSubmitDisabled={!draftSelectedIcon || !name.trim() || !this.hasChanges(draftSelectedIcon)}
                  isSubmitting={isSubmitting}
                  errorMessage={errorMessage}
                /> :
                <>
                  <div className="edit-wiki-popover-body">
                    <h2 className="sr-only">{gettext('Edit name and icon')}</h2>
                    <div className="edit-wiki-field">
                      <Label for="edit-wiki-name">{gettext('Name')}</Label>
                      <Input
                        id="edit-wiki-name"
                        name="edit-wiki-name"
                        value={name}
                        onChange={this.handleNameChange}
                        onKeyDown={this.handleKeyDown}
                        autoFocus={true}
                      />
                    </div>

                    <div className="edit-wiki-field">
                      <Label>{gettext('Color')}</Label>
                      <div className="wiki-color-options">
                        {WIKI_ICON_COLORS.map(color => {
                          const isSelected = color === selectedColor;
                          return (
                            <button
                              key={color}
                              type="button"
                              className={classNames('wiki-color-option', { selected: isSelected })}
                              style={{ backgroundColor: color }}
                              onClick={() => this.handleColorSelect(color)}
                              aria-label={`${gettext('Select color')} ${color}`}
                              aria-pressed={isSelected}
                            >
                              {isSelected && <Icon symbol="check" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="edit-wiki-field edit-wiki-icons-field">
                      <div className="edit-wiki-icons-header">
                        <Label>{gettext('Icons')}</Label>
                        <button type="button" className="wiki-icons-toggle" onClick={this.openIconSelector}>
                          {gettext('View All')}
                          <Icon symbol="arrow-right" />
                        </button>
                      </div>
                      <div className="wiki-icon-options">
                        {icons.map(icon => {
                          const isSelected = icon === selectedIcon;
                          return (
                            <button
                              key={icon}
                              type="button"
                              className={classNames('wiki-icon-option', { selected: isSelected })}
                              style={isSelected ? {
                                backgroundColor: `${selectedColor}1A`,
                                color: selectedColor,
                              } : null}
                              onClick={() => this.handleIconSelect(icon)}
                              aria-label={`${gettext('Select icon')} ${icon}`}
                              aria-pressed={isSelected}
                            >
                              <WikiIconGlyph icon={icon} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {errorMessage && <Alert color="danger" className="mb-0">{errorMessage}</Alert>}
                  </div>
                  <div className="edit-wiki-popover-footer">
                    <Button color="secondary" onClick={this.props.toggleCancel}>{gettext('Cancel')}</Button>
                    <Button color="primary" onClick={this.handleSubmit} disabled={isSubmitDisabled}>
                      {gettext('Submit')}
                    </Button>
                  </div>
                </>
              }
            </div>
          );
        }}
      </Popover>
    );
  }
}

EditWikiPopover.propTypes = propTypes;

export default EditWikiPopover;
