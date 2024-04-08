import React from 'react';
import ReactDom from 'react-dom';
import Logo from './components/logo';
import Account from './components/common/account';
import TermsPreviewWidget from './components/terms-preview-widget';

import './css/tc-accept.css';

const {
  termsName,
  termsText
} = window.tc;

class TCView extends React.Component {

  render() {
    return (
      <div className="h-100 d-flex flex-column">
        <div className="top-header d-flex justify-content-between">
          <Logo />
          <Account />
        </div>
        <div className="o-auto">
          <div className="py-4 px-4 my-6 mx-auto content">
            <h2 dangerouslySetInnerHTML={{__html: termsName}}></h2>
            <div className="article">
              <TermsPreviewWidget content={termsText} />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

ReactDom.render(<TCView />, document.getElementById('wrapper'));
