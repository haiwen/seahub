import React from 'react';
import Select from 'react-select';
import { gettext, siteRoot } from '../../utils/constants';

const {
  currentLang, langList
} = window.app.pageOptions;

class LanguageSetting extends React.Component {

  constructor(props) {
    super(props);
  }

  onSelectChange = (selectedItem) => {
    // selectedItem: {value: '...', label: '...'}
    location.href = `${siteRoot}i18n/?lang=${selectedItem.value}`;
  }

  render() {
    const options = langList.map((item, index) => {
      return {
        value: item.langCode,
        label: item.langName
      };
    });

    return (
      <div className="setting-item" id="lang-setting">
        <h3 className="setting-item-heading">{gettext('Language Setting')}</h3>
        <Select
          className='language-selector'
          defaultValue={{value: currentLang.langCode, label: currentLang.langName}}
          options={options}
          onChange={this.onSelectChange}
        />
      </div>
    );
  }
}

export default LanguageSetting;
