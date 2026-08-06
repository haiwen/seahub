import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Alert, Button, Modal, ModalBody, ModalFooter, Input, Label } from 'reactstrap';
import SeahubModalHeader from '../../common/seahub-modal-header';
import { gettext, isPro } from '../../../utils/constants';
import wikiAPI from '../../../utils/wiki-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';
import { SeahubSelect } from '../../common/select';
import Icon from '../../icon';
import {
  DEFAULT_WIKI_COLOR,
  DEFAULT_WIKI_ICON,
  WIKI_ICON_COLORS,
} from '../../wiki-card-view/constants';
import { getDisplayedWikiIcons, isHomepageWikiIcon } from '../../wiki-card-view/constants-utils';
import { WikiIconGlyph } from '../../wiki-card-view/wiki-icon';
import WikiIconSelector from '../../wiki-card-view/wiki-icon-selector';

import './index.css';

const propTypes = {
  toggleCancel: PropTypes.func.isRequired,
  addWiki: PropTypes.func.isRequired,
  currentDeptID: PropTypes.number,
};

class AddWikiDialog extends React.Component {

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

  inputNewName = (e) => {
    this.setState({
      name: e.target.value,
      errorMessage: '',
    });
  };

  handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.handleSubmit();
    }
  };

  submitWiki = (selectedIcon) => {
    const { isSubmitting, name, selectedColor, selectedOption } = this.state;
    const wikiName = name.trim();
    if (!wikiName || isSubmitting) return;

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
      isIconSelectorOpen,
      isSubmitting,
      name,
      pinnedIcon,
      selectedColor,
      selectedIcon,
    } = this.state;
    const icons = getDisplayedWikiIcons(pinnedIcon);

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
              <div className="add-wiki-icons-field">
                <div className="add-wiki-icons-header">
                  <Label>{gettext('Icons')}</Label>
                  <button type="button" className="wiki-icons-toggle" onClick={this.openIconSelector}>
                    {gettext('View all')}
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
              {errorMessage && <Alert color="danger" className="mt-3 mb-0">{errorMessage}</Alert>}
            </ModalBody>
            <ModalFooter>
              <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
              <Button color="primary" onClick={this.handleSubmit} disabled={!name.trim() || isSubmitting}>
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
