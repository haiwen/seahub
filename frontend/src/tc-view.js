import React from 'react';
import { createRoot } from 'react-dom/client';
import Account from './components/account';
import EmptyTip from './components/empty-tip';
import Logo from './components/logo';
import TermsPreviewWidget from './components/terms-preview-widget';
import { gettext } from './utils/constants';
import { Utils } from './utils/utils';

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
        {termsText ?
          <div className="o-auto">
            <div className="py-4 px-4 my-6 mx-auto content">
              <h2 dangerouslySetInnerHTML={{ __html: Utils.HTMLescape(termsName) }}></h2>
              <div className="article">
                <TermsPreviewWidget content={termsText} />
              </div>
            </div>
          </div>
          :
          <div className="cur-view-content">
            <EmptyTip
              text={
                <>
                  <p className="m-0">{gettext('No terms and conditions')}</p>
                </>
              }
            />
          </div>
        }
      </div>
    );
  }
}

const root = createRoot(document.getElementById('wrapper'));
root.render(<TCView />);
