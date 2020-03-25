import React from 'react';
import { siteRoot } from '../../utils/constants'

export default function Logout() {
  const style = {
    width: '32px',
    height: '32px',
    marginLeft: '8px'
  }
  return (
    <a style={style} href={`${siteRoot}accounts/logout/`}>
      <i></i>
    </a>
  )
}