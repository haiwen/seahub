import React from 'react';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { gettext, siteRoot } from '../../utils/constants';

const {
  currentLang, langList
} = window.app.pageOptions;

class LanguageSetting extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      dropdownOpen: false,
    };
  }

    toggle = () => {
      this.setState({
        dropdownOpen: !this.state.dropdownOpen
      });
    }

    render() {
      return (
        <div className="setting-item" id="lang-setting">
          <h3 className="setting-item-heading">{gettext('Language Setting')}</h3>
          <Dropdown isOpen={this.state.dropdownOpen} toggle={this.toggle}>
            <DropdownToggle caret>
              {currentLang}
            </DropdownToggle>
            <DropdownMenu>
              {langList.map((item, index) => {
                return (
                  <DropdownItem key={index}>
                    <a href={`${siteRoot}i18n/?lang=${item.langCode}`} className="text-inherit">
                      {item.langName}
                    </a>
                  </DropdownItem>
                );
              })}
            </DropdownMenu>
          </Dropdown>
        </div>
      );
    }
}

export default LanguageSetting;
