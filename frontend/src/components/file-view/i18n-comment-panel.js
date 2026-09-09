import React, { Suspense } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../_i18n/i18n-comment-editor';
import Loading from '../loading';
import CommentPanel from './comment-panel';

export default function I18nCommentPanel(props) {
  return (
    <I18nextProvider i18n={i18n}>
      <Suspense fallback={<Loading />}>
        <CommentPanel {...props} />
      </Suspense>
    </I18nextProvider>
  );
}
