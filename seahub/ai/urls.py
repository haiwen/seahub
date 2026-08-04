from django.urls import re_path
from .apis import ImageCaption, GenerateSummary, GenerateFileTags, OCR, Translate, WritingAssistant, \
    ChatMessagesView, ChatMarkdownArtifactView, ChatSessionCopyView, ChatSessionView, ChatSessionsView, ChatView, \
    AIGenerateIcon

urlpatterns = [
    re_path(r'^image-caption/$', ImageCaption.as_view(), name='api-v2.1-image-caption'),
    re_path(r'^generate-file-tags/$', GenerateFileTags.as_view(), name='api-v2.1-generate-file-tags'),
    re_path(r'^generate-summary/$', GenerateSummary.as_view(), name='api-v2.1-generate-summary'),
    re_path(r'^ocr/$', OCR.as_view(), name='api-v2.1-ocr'),
    re_path(r'^translate/$', Translate.as_view(), name='api-v2.1-translate'),
    re_path(r'^writing-assistant/$', WritingAssistant.as_view(), name='api-v2.1-writing-assistant'),
    re_path(r'^generate-icon/$', AIGenerateIcon.as_view(), name='api-v2.1-generate-icon'),

    re_path(r'^chat/$', ChatView.as_view(), name='api-v2.1-ai-chat-view'),
    re_path(r'^chat/sessions/$', ChatSessionsView.as_view(), name='api-v2.1-ai-chat-sessions'),
    re_path(r'^chat/sessions/(?P<session_uuid>[-0-9a-f]+)/$', ChatSessionView.as_view(), name='api-v2.1-ai-chat-session'),
    re_path(r'^chat/sessions/(?P<session_uuid>[-0-9a-f]+)/copy/$', ChatSessionCopyView.as_view(), name='api-v2.1-ai-chat-session-copy'),
    re_path(r'^chat/sessions/(?P<session_uuid>[-0-9a-f]+)/messages/$', ChatMessagesView.as_view(), name='api-v2.1-ai-chat-messages'),
    re_path(r'^chat/markdown-artifacts/(?P<file_uuid>[-0-9a-f]{36})/$', ChatMarkdownArtifactView.as_view(), name='api-v2.1-ai-chat-markdown-artifact'),
]
