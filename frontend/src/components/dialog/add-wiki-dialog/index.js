import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Alert, Button, Modal, ModalBody, ModalFooter, Input, Label } from 'reactstrap';
import SeahubModalHeader from '../../common/seahub-modal-header';
import { enableSeafileAI, gettext, isPro } from '../../../utils/constants';
import wikiAPI from '../../../utils/wiki-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';
import { SeahubSelect } from '../../common/select';
import Icon from '../../icon';
import Tooltip from '../../tooltip';
import {
  DEFAULT_WIKI_COLOR,
  DEFAULT_WIKI_ICON,
  WIKI_ICON_COLORS,
} from '../../wiki-card-view/constants';
import {
  AI_SUGGESTED_ICON_PAGE_SIZE,
  getDisplayedWikiIconOptions,
  getSuggestedIconPage,
  getWikiAiCustomMessageParts,
  isHomepageWikiIcon,
  normalizeSuggestedIcons,
} from '../../wiki-card-view/constants-utils';
import { WikiIconGlyph } from '../../wiki-card-view/wiki-icon';
import WikiIconSelector from '../../wiki-card-view/wiki-icon-selector';

import './index.css';

const propTypes = {
  toggleCancel: PropTypes.func.isRequired,
  addWiki: PropTypes.func.isRequired,
  currentDeptID: PropTypes.number,
};

class AddWikiDialog extends React.Component {

  suggestedIconNameRefs = {};

  constructor(props) {
    super(props);
    const myWikiOption = this.getMyWikiOption();
    this.state = {
      name: '',
      selectedOption: props.currentDeptID ? null : myWikiOption,
      options: [myWikiOption],
      selectedColor: DEFAULT_WIKI_COLOR,
      selectedIcon: DEFAULT_WIKI_ICON,
      pinnedIcon: null,
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

  getMyWikiOption() {
    return {
      id: '',
      value: 'My wiki',
      email: '',
      label: gettext('My Wikis'),
    };
  }

  componentDidMount() {
    window.addEventListener('resize', this.measureSuggestedIconNameOverflow);
    if (!isPro) return;
    wikiAPI.listWikiDepartments().then(res => {
      const departments = res.data.sort((a, b) => {
        return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
      });
      const options = departments.map(department => ({
        value: department.name,
        id: department.id,
        email: department.email,
        label: department.name,
      }));
      const myWikiOption = this.getMyWikiOption();
      options.unshift(myWikiOption);
      const selectedOption = this.props.currentDeptID ?
        options.find(option => String(option.id) === String(this.props.currentDeptID)) :
        myWikiOption;
      this.setState({ options, selectedOption });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.suggestedIcons !== this.state.suggestedIcons) {
      this.measureSuggestedIconNameOverflow();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.measureSuggestedIconNameOverflow);
    this.clearNameBlurTimer();
    this.invalidateSuggestedIconRequest();
  }

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
      hasSuggestedIconResponse: false,
      suggestedIconPageIndex: 0,
      errorMessage: '',
    });

    const request = wikiAPI.generateWikiIcons(wikiName)
      .then((res) => {
        if (requestId !== this.suggestedIconRequestId) return;
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
        const errorMsg = error.response && error.response.data && error.response.data.error_msg;
        toaster.danger(errorMsg || gettext('Error'));
        this.setState({
          isThinking: false,
          suggestedIcons: [],
          suggestedIconResults: [],
          suggestedIconName: '',
          suggestedIconPageIndex: 0,
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

  inputNewName = (e) => {
    const name = e.target.value;
    this.clearNameBlurTimer();
    this.invalidateSuggestedIconRequest();
    this.setState({
      name,
      isThinking: false,
      suggestedIcons: [],
      suggestedIconResults: [],
      suggestedIconName: '',
      hasSuggestedIconResponse: false,
      suggestedIconPageIndex: 0,
      errorMessage: '',
    });
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

  handleKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
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

  submitWiki = (selectedIcon) => {
    const { isSubmitting, name, selectedColor, selectedOption } = this.state;
    const wikiName = name.trim();
    if (!wikiName || isSubmitting || this.isSuggestedIconPending()) return;

    const details = {
      name: wikiName,
      owner: selectedOption ? selectedOption.id : (this.props.currentDeptID || null),
      icon: selectedIcon,
      color: selectedColor,
    };
    this.setState({ isSubmitting: true, errorMessage: '' });
    Promise.resolve(this.props.addWiki(details)).then(() => {
      this.props.toggleCancel();
    }).catch(error => {
      this.setState({
        isSubmitting: false,
        errorMessage: Utils.getErrorMsg(error),
      });
    });
  };

  handleSubmit = () => {
    this.submitWiki(this.state.selectedIcon);
  };

  toggle = () => {
    this.props.toggleCancel();
  };

  handleSelectChange = (option) => {
    this.setState({ selectedOption: option });
  };

  handleColorSelect = (selectedColor) => {
    this.setState({ selectedColor, errorMessage: '' });
  };

  handleIconSelect = (selectedIcon) => {
    this.setState({ selectedIcon, errorMessage: '' });
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
      });
    });
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

  handleIconSelectorSubmit = () => {
    const { draftSelectedIcon } = this.state;
    if (!draftSelectedIcon) return;

    this.setState({ selectedIcon: draftSelectedIcon }, () => {
      this.submitWiki(draftSelectedIcon);
    });
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
      suggestedIcons,
      suggestedIconName,
      truncatedSuggestedIconNames,
      name,
      pinnedIcon,
      selectedColor,
      selectedIcon,
    } = this.state;
    const iconOptions = getDisplayedWikiIconOptions(pinnedIcon);
    const hasSuggestedIcons = suggestedIcons.length > 0;
    const showNoSuggestedIcons = hasSuggestedIconResponse && !hasSuggestedIcons;
    const isSuggestedIconPending = !isCustomIconPage && (isThinking || suggestedIconName !== name.trim());

    return (
      <Modal
        isOpen={true}
        autoFocus={false}
        centered={true}
        toggle={isIconSelectorOpen ? this.closeIconSelector : this.toggle}
        className={classNames({
          'add-wiki-dialog': !isIconSelectorOpen,
          'wiki-icon-selector-dialog': isIconSelectorOpen,
        })}
      >
        {isIconSelectorOpen ?
          <WikiIconSelector
            selectedColor={selectedColor}
            selectedIcon={draftSelectedIcon}
            onIconSelect={this.handleFullIconSelect}
            onPrevious={this.closeIconSelector}
            onSubmit={this.handleIconSelectorSubmit}
            isSubmitDisabled={!draftSelectedIcon || !name.trim()}
            isSubmitting={isSubmitting}
            errorMessage={errorMessage}
          /> :
          <>
            <SeahubModalHeader toggle={this.toggle}>{gettext('Add Wiki')}</SeahubModalHeader>
            <ModalBody>
              <div className="add-wiki-field">
                <Label for="add-wiki-name">{gettext('Name')}</Label>
                <Input
                  id="add-wiki-name"
                  onKeyDown={this.handleKeyDown}
                  autoFocus={true}
                  value={name}
                  onChange={this.inputNewName}
                  onBlur={this.handleNameBlur}
                  name="wiki-name"
                />
              </div>
              {isPro &&
                <div className="add-wiki-field">
                  <Label>{gettext('Wiki owner')} ({gettext('Optional')})</Label>
                  <SeahubSelect
                    className="add-wiki-owner-select"
                    onChange={this.handleSelectChange}
                    options={this.state.options}
                    hideSelectedOptions={true}
                    placeholder={gettext('Select a department')}
                    maxMenuHeight={200}
                    value={this.state.selectedOption}
                    noOptionsMessage={() => {return gettext('No options available');}}
                  />
                </div>
              }
              <div className="add-wiki-field">
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
              {isCustomIconPage ?
                <div className="add-wiki-icons-field">
                  <div className="add-wiki-icons-header">
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
                      const tooltipTarget = `add-wiki-icon-option-${icon}`;
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
                </div> :
                <div className="add-wiki-icons-field">
                  <div className="add-wiki-icons-header">
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
                            const tooltipTarget = `wiki-ai-suggested-icon-name-${icon}`;
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
                          <>
                            <Icon symbol="ask-ai" className="wiki-ai-icons-placeholder-icon" />
                            <div className="wiki-ai-icons-placeholder-text">
                              {this.renderAiCustomMessage(gettext('Input name, AI matches icons automatically {custom}'))}
                            </div>
                          </>
                        </div>
                  }
                </div>
              }
              {errorMessage && <Alert color="danger" className="mt-3 mb-0">{errorMessage}</Alert>}
            </ModalBody>
            <ModalFooter>
              <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
              <Button color="primary" onClick={this.handleSubmit} onKeyDown={this.handleSubmitKeyDown} disabled={!name.trim() || isSubmitting || isSuggestedIconPending}>
                {gettext('Submit')}
              </Button>
            </ModalFooter>
          </>
        }
      </Modal>
    );
  }
}

AddWikiDialog.propTypes = propTypes;

export default AddWikiDialog;
