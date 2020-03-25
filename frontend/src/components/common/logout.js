import React from 'react';
import { siteRoot, gettext } from '../../utils/constants'

export default function Logout() {
  const style = {
    width: '32px',
    height: '32px',
    marginLeft: '8px',
    color: '#bbb',
    textDecoration: 'none'
  };
  const classname = "d-flex align-items-center justify-content-center"
  return (
    <a className={classname} style={style} href={`${siteRoot}accounts/logout/`} title={gettext('Logout')}>
      <i className="sf3-font sf3-font-logout" style={{fontSize: '24px'}}></i>
    </a>
  )
}