import React, { Suspense } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../_i18n/i18n-comment-editor';
import CommentPanel from './comment-panel';
import Loading from '../loading';

export default function I18nCommentPanel(props) {
  return (
    <I18nextProvider i18n={i18n}>
      <Suspense fallback={<Loading />}>
        <CommentPanel {...props} />
      </Suspense>
    </I18nextProvider>
  );
}
