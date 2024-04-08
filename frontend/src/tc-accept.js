import React from 'react';
import ReactDom from 'react-dom';
import { Button } from 'reactstrap';
import { gettext } from './utils/constants';
import Logo from './components/logo';
import Account from './components/common/account';
import TermsPreviewWidget from './components/terms-preview-widget';

import './css/tc-accept.css';

const { csrfToken } = window.app.pageOptions;
const {
  termsName,
  formAction,
  formTerms,
  formReturnTo,
  logoutURL,
  termsText
} = window.tc;


class TCAccept extends React.Component {

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
            <form action={formAction} method="post">
              <input type="hidden" name="csrfmiddlewaretoken" value={csrfToken} />
              <div dangerouslySetInnerHTML={{__html: formTerms}}></div>
              <div dangerouslySetInnerHTML={{__html: formReturnTo}}></div>
              <Button type="submit">{gettext('Accept')}</Button>
              <a href={logoutURL} className="btn btn-secondary ml-2">{gettext('Cancel')}</a>
            </form>
          </div>
        </div>
      </div>
    );
  }
}

ReactDom.render(<TCAccept />, document.getElementById('wrapper'));
