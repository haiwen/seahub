import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Alert, Button, Input, Label, Popover } from 'reactstrap';
import Icon from '../../icon';
import Tooltip from '../../tooltip';
import wikiAPI from '../../../utils/wiki-api';
import { enableSeafileAI, gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';
import {
  DEFAULT_WIKI_COLOR,
  WIKI_ICON_COLORS,
} from '../../wiki-card-view/constants';
import {
  AI_SUGGESTED_ICON_PAGE_SIZE,
  getDisplayedWikiIconOptions,
  getSuggestedIconPage,
  getWikiAiCustomMessageParts,
  getWikiAiErrorMessage,
  isHomepageWikiIcon,
  normalizeSuggestedIcons,
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
  suggestedIconNameRefs = {};

  constructor(props) {
    super(props);
    const selectedIcon = resolveWikiIcon(props.wiki.icon);
    this.state = {
      name: props.wiki.name,
      selectedColor: props.wiki.color || DEFAULT_WIKI_COLOR,
      selectedIcon,
      pinnedIcon: isHomepageWikiIcon(selectedIcon) ? null : selectedIcon,
      isCustomIconPage: true,
      isThinking: false,
      suggestedIcons: [],
      suggestedIconResults: [],
      suggestedIconName: '',
      hasSuggestedIconResponse: false,
      suggestedIconPageIndex: 0,
      truncatedSuggestedIconNames: {},
      isIconSelectorOpen: false,
      draftSelectedIcon: null,
      isSubmitting: false,
      errorMessage: '',
    };
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleDocumentMouseDown);
    document.addEventListener('keydown', this.handleDocumentKeyDown);
    window.addEventListener('resize', this.measureSuggestedIconNameOverflow);
    this.schedulePositionUpdate();
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      prevState.isIconSelectorOpen !== this.state.isIconSelectorOpen ||
      prevState.errorMessage !== this.state.errorMessage ||
      prevState.isCustomIconPage !== this.state.isCustomIconPage ||
      prevState.isThinking !== this.state.isThinking ||
      prevState.suggestedIcons !== this.state.suggestedIcons
    ) {
      this.schedulePositionUpdate();
    }
    if (prevState.suggestedIcons !== this.state.suggestedIcons) {
      this.measureSuggestedIconNameOverflow();
    }
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleDocumentMouseDown);
    document.removeEventListener('keydown', this.handleDocumentKeyDown);
    window.removeEventListener('resize', this.measureSuggestedIconNameOverflow);
    this.clearNameBlurTimer();
    this.invalidateSuggestedIconRequest();
    if (this.updateFrame) {
      window.cancelAnimationFrame(this.updateFrame);
    }
  }

  clearNameBlurTimer = () => {
    if (this.nameBlurTimer) {
      clearTimeout(this.nameBlurTimer);
      this.nameBlurTimer = null;
    }
  };

  invalidateSuggestedIconRequest = () => {
    this.suggestedIconRequestId = (this.suggestedIconRequestId || 0) + 1;
    this.suggestedIconRequest = null;
    this.suggestedIconRequestName = '';
  };

  setSuggestedIconNameRef = (icon) => (element) => {
    if (element) {
      this.suggestedIconNameRefs[icon] = element;
      return;
    }
    delete this.suggestedIconNameRefs[icon];
  };

  measureSuggestedIconNameOverflow = () => {
    const truncatedSuggestedIconNames = {};
    this.state.suggestedIcons.forEach(({ icon }) => {
      const element = this.suggestedIconNameRefs[icon];
      if (element && element.scrollWidth > element.clientWidth) {
        truncatedSuggestedIconNames[icon] = true;
      }
    });

    const currentNames = Object.keys(this.state.truncatedSuggestedIconNames).sort().join('|');
    const nextNames = Object.keys(truncatedSuggestedIconNames).sort().join('|');
    if (currentNames === nextNames) return;

    this.setState({ truncatedSuggestedIconNames });
  };

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
    const name = event.target.value;
    this.clearNameBlurTimer();
    const isRequestPending = Boolean(this.suggestedIconRequest);
    this.setState({
      name,
      errorMessage: '',
      isThinking: isRequestPending && Boolean(name.trim()),
      suggestedIcons: [],
      suggestedIconResults: [],
      suggestedIconName: '',
      hasSuggestedIconResponse: false,
      suggestedIconPageIndex: 0,
      truncatedSuggestedIconNames: {},
    });
  };

  showSuggestedIconPage = (pageIndex) => {
    this.setState((state) => {
      if (!state.suggestedIconResults.length) return null;
      const pageCount = Math.ceil(state.suggestedIconResults.length / AI_SUGGESTED_ICON_PAGE_SIZE);
      const suggestedIconPageIndex = pageIndex % pageCount;
      const suggestedIcons = getSuggestedIconPage(state.suggestedIconResults, suggestedIconPageIndex);
      return {
        suggestedIconPageIndex,
        suggestedIcons,
        selectedIcon: suggestedIcons.length ? suggestedIcons[0].icon : state.selectedIcon,
      };
    });
  };

  requestSuggestedIcons = (name, showCachedResults = false) => {
    const wikiName = name.trim();
    if (!wikiName) return;

    if (this.suggestedIconRequest && this.suggestedIconRequestName === wikiName) {
      this.setState({ isThinking: true, errorMessage: '' });
      return this.suggestedIconRequest;
    }

    if (this.state.suggestedIconName === wikiName && this.state.suggestedIconResults.length) {
      if (showCachedResults) {
        this.setState({ isThinking: false, errorMessage: '' }, () => this.showSuggestedIconPage(0));
      }
      return;
    }

    const requestId = (this.suggestedIconRequestId || 0) + 1;
    this.suggestedIconRequestId = requestId;
    this.suggestedIconRequestName = wikiName;
    this.setState({
      isThinking: true,
      suggestedIcons: [],
      suggestedIconResults: [],
      suggestedIconName: '',
      suggestedIconPageIndex: 0,
      truncatedSuggestedIconNames: {},
      errorMessage: '',
    });

    const request = wikiAPI.generateWikiIcons(wikiName)
      .then((res) => {
        if (requestId !== this.suggestedIconRequestId) return;
        if (this.state.name.trim() !== wikiName) {
          this.setState({ isThinking: false });
          return;
        }
        const suggestedIconResults = normalizeSuggestedIcons(res.data.icons);
        const suggestedIcons = getSuggestedIconPage(suggestedIconResults, 0);
        this.setState((state) => ({
          isThinking: false,
          suggestedIcons,
          suggestedIconResults,
          suggestedIconName: suggestedIconResults.length ? wikiName : '',
          hasSuggestedIconResponse: true,
          suggestedIconPageIndex: 0,
          selectedIcon: !state.isCustomIconPage && suggestedIcons.length ? suggestedIcons[0].icon : state.selectedIcon,
        }));
      })
      .catch((error) => {
        if (requestId !== this.suggestedIconRequestId) return;
        if (this.state.name.trim() !== wikiName) {
          this.setState({ isThinking: false });
          return;
        }
        const errorMsg = error.response && error.response.data && error.response.data.error_msg;
        toaster.danger(getWikiAiErrorMessage(errorMsg));
        this.setState({
          isThinking: false,
          suggestedIcons: [],
          suggestedIconResults: [],
          suggestedIconName: '',
          hasSuggestedIconResponse: false,
          suggestedIconPageIndex: 0,
          truncatedSuggestedIconNames: {},
          errorMessage: '',
        });
      })
      .finally(() => {
        if (this.suggestedIconRequest === request) {
          this.suggestedIconRequest = null;
          this.suggestedIconRequestName = '';
        }
      });

    this.suggestedIconRequest = request;
    return request;
  };

  isSuggestedIconPending = () => {
    const { isCustomIconPage, isThinking, name, suggestedIconName } = this.state;
    return !isCustomIconPage && (isThinking || suggestedIconName !== name.trim());
  };

  handleNameBlur = () => {
    if (this.state.isCustomIconPage) return;
    this.clearNameBlurTimer();
    const name = this.state.name.trim();
    if (!name) return;
    this.nameBlurTimer = setTimeout(() => {
      this.nameBlurTimer = null;
      this.requestSuggestedIcons(name);
    }, 500);
  };

  refreshSuggestedIcons = () => {
    const { suggestedIconResults, suggestedIconPageIndex } = this.state;
    if (!suggestedIconResults.length) return;
    const pageCount = Math.ceil(suggestedIconResults.length / AI_SUGGESTED_ICON_PAGE_SIZE);
    this.showSuggestedIconPage((suggestedIconPageIndex + 1) % pageCount);
  };

  openCustomIconPage = () => {
    this.clearNameBlurTimer();
    this.setState((state) => ({
      isCustomIconPage: true,
      pinnedIcon: isHomepageWikiIcon(state.selectedIcon) ? state.pinnedIcon : state.selectedIcon,
      isThinking: false,
      suggestedIcons: [],
      truncatedSuggestedIconNames: {},
      errorMessage: '',
    }));
  };

  renderAiCustomMessage = (message) => {
    const [before, after] = getWikiAiCustomMessageParts(message);
    return (
      <span>
        {before}
        <button type="button" className="wiki-ai-custom-icon" onClick={this.openCustomIconPage}>
          {gettext('Custom')}
        </button>
        {after}
      </span>
    );
  };

  openAiIconPage = () => {
    this.clearNameBlurTimer();
    this.setState({ isCustomIconPage: false, errorMessage: '' }, () => {
      const name = this.state.name.trim();
      if (name) {
        this.requestSuggestedIcons(name, true);
        return;
      }
      this.setState({
        isThinking: false,
        suggestedIcons: [],
        suggestedIconResults: [],
        suggestedIconName: '',
        suggestedIconPageIndex: 0,
        truncatedSuggestedIconNames: {},
      });
    });
  };

  handleColorSelect = (selectedColor) => {
    this.setState({ selectedColor, errorMessage: '' });
  };

  handleIconSelect = (selectedIcon) => {
    this.setState({ selectedIcon, errorMessage: '' });
  };

  openIconSelector = () => {
    this.clearNameBlurTimer();
    this.setState({
      isCustomIconPage: true,
      isIconSelectorOpen: true,
      draftSelectedIcon: this.state.selectedIcon,
      errorMessage: '',
    });
  };

  closeIconSelector = () => {
    this.setState({
      isCustomIconPage: true,
      isIconSelectorOpen: false,
      draftSelectedIcon: null,
      errorMessage: '',
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
    if (this.isSuggestedIconPending() || !this.hasChanges(selectedIcon) || this.state.isSubmitting) {
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
    this.setState((state) => {
      if (!state.draftSelectedIcon) return null;
      return {
        selectedIcon: state.draftSelectedIcon,
        pinnedIcon: isHomepageWikiIcon(state.draftSelectedIcon) ? state.pinnedIcon : state.draftSelectedIcon,
        isCustomIconPage: true,
        isIconSelectorOpen: false,
        draftSelectedIcon: null,
        errorMessage: '',
      };
    });
  };

  handleKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    this.clearNameBlurTimer();
    if (!enableSeafileAI || this.state.isCustomIconPage) return;
    const name = this.state.name.trim();
    if (!name) return;
    this.requestSuggestedIcons(name);
  };

  handleSubmitKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
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
      isCustomIconPage,
      isIconSelectorOpen,
      isSubmitting,
      isThinking,
      hasSuggestedIconResponse,
      name,
      pinnedIcon,
      selectedColor,
      selectedIcon,
      suggestedIcons,
      suggestedIconName,
      truncatedSuggestedIconNames,
    } = this.state;
    const iconOptions = getDisplayedWikiIconOptions(pinnedIcon);
    const hasSuggestedIcons = suggestedIcons.length > 0;
    const showNoSuggestedIcons = hasSuggestedIconResponse && !hasSuggestedIcons;
    const isSuggestedIconPending = !isCustomIconPage && (isThinking || suggestedIconName !== name.trim());
    const isSubmitDisabled = isSubmitting || isSuggestedIconPending || !name.trim() || !this.hasChanges();
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
                  isSubmitDisabled={!draftSelectedIcon}
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
                        onBlur={this.handleNameBlur}
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
                      {isCustomIconPage ?
                        <>
                          <div className="edit-wiki-icons-header">
                            <Label>{gettext('Icons')}</Label>
                            <div className="wiki-icons-actions">
                              {enableSeafileAI &&
                                <>
                                  <button type="button" className="wiki-icons-toggle wiki-icons-auto-match" onClick={this.openAiIconPage}>
                                    <Icon symbol="ask-ai" />
                                    {gettext('Auto match')}
                                  </button>
                                  <span className="wiki-icons-divider" aria-hidden="true" />
                                </>
                              }
                              <button type="button" className="wiki-icons-toggle" onClick={this.openIconSelector}>
                                {gettext('View all')}
                                <Icon symbol="sdoc-next-page" />
                              </button>
                            </div>
                          </div>
                          <div className="wiki-icon-options">
                            {iconOptions.map(({ icon, label }) => {
                              const isSelected = icon === selectedIcon;
                              const tooltipTarget = `edit-wiki-icon-option-${icon}`;
                              return (
                                <React.Fragment key={icon}>
                                  <button
                                    id={tooltipTarget}
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
                                  <Tooltip target={tooltipTarget} placement="top" delay={{ show: 500, hide: 0 }}>
                                    {label}
                                  </Tooltip>
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </> :
                        <>
                          <div className="edit-wiki-icons-header">
                            <Label>{gettext('Suggested icons')}</Label>
                            {hasSuggestedIcons &&
                              <button type="button" className="wiki-icons-toggle wiki-icons-refresh" onClick={this.refreshSuggestedIcons}>
                                <Icon symbol="refresh" />
                                {gettext('Refresh')}
                              </button>
                            }
                          </div>
                          {isThinking ?
                            <div className="wiki-ai-icons-placeholder">
                              <div className="wiki-ai-icons-thinking" role="status" aria-live="polite">
                                <span className="wiki-ai-thinking-spinner" aria-hidden="true" />
                                <div>{gettext('Thinking...')}</div>
                              </div>
                            </div> : hasSuggestedIcons ?
                              <>
                                <div className="wiki-ai-suggested-icons">
                                  {suggestedIcons.map(({ icon, label: iconLabel }) => {
                                    const isSelected = icon === selectedIcon;
                                    const isNameTruncated = truncatedSuggestedIconNames[icon];
                                    const tooltipTarget = `edit-wiki-suggested-icon-name-${icon}`;
                                    return (
                                      <React.Fragment key={icon}>
                                        <button
                                          type="button"
                                          className={classNames('wiki-ai-suggested-icon', { selected: isSelected })}
                                          onClick={() => this.handleIconSelect(icon)}
                                          aria-label={`${gettext('Select icon')} ${iconLabel}`}
                                          aria-pressed={isSelected}
                                        >
                                          <span
                                            className="wiki-ai-suggested-icon-box"
                                            style={isSelected ? {
                                              backgroundColor: `${selectedColor}1A`,
                                              color: selectedColor,
                                            } : null}
                                          >
                                            <WikiIconGlyph icon={icon} />
                                          </span>
                                          <span
                                            id={tooltipTarget}
                                            ref={this.setSuggestedIconNameRef(icon)}
                                            className="wiki-ai-suggested-icon-name"
                                          >
                                            {iconLabel}
                                          </span>
                                          {isSelected && <Icon symbol="check-circle-filled" className="wiki-ai-suggested-icon-check" />}
                                        </button>
                                        {isNameTruncated &&
                                          <Tooltip target={tooltipTarget} placement="bottom" delay={{ show: 500, hide: 0 }}>
                                            {iconLabel}
                                          </Tooltip>
                                        }
                                      </React.Fragment>
                                    );
                                  })}
                                </div>
                                <div className="wiki-ai-suggested-icons-footer">
                                  {this.renderAiCustomMessage(gettext('Icons auto-matched by name {custom}'))}
                                </div>
                              </> : showNoSuggestedIcons ?
                                <div className="wiki-ai-icons-placeholder">
                                  <div className="wiki-ai-icons-placeholder-text">
                                    {this.renderAiCustomMessage(gettext('No suggested icons found. Add icons with {custom}'))}
                                  </div>
                                </div> :
                                <div className="wiki-ai-icons-placeholder">
                                  <Icon symbol="ask-ai" className="wiki-ai-icons-placeholder-icon" />
                                  <div className="wiki-ai-icons-placeholder-text">
                                    {this.renderAiCustomMessage(gettext('Input name, AI matches icons automatically {custom}'))}
                                  </div>
                                </div>
                          }
                        </>
                      }
                    </div>

                    {errorMessage && <Alert color="danger" className="mb-0">{errorMessage}</Alert>}
                  </div>
                  <div className="edit-wiki-popover-footer">
                    <Button color="secondary" onClick={this.props.toggleCancel}>{gettext('Cancel')}</Button>
                    <Button color="primary" onClick={this.handleSubmit} onKeyDown={this.handleSubmitKeyDown} disabled={isSubmitDisabled}>
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
