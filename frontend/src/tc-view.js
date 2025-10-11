import React from 'react';
import { createRoot } from 'react-dom/client';
import Logo from './components/logo';
import EmptyTip from './components/empty-tip';
import Account from './components/common/account';
import TermsPreviewWidget from './components/terms-preview-widget';
import { Utils } from './utils/utils';
import { gettext } from './utils/constants';

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
        { termsText ?
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
                  <p className="m-0">{gettext('There is no teams and conditions yet.')}</p>
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
