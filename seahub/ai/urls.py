from django.urls import re_path
from .apis import ImageCaption, GenerateSummary, GenerateFileTags, OCR, Translate,\
    WritingAssistant, SdocGeneralAssistant

urlpatterns = [
    re_path(r'^image-caption/$', ImageCaption.as_view(), name='api-v2.1-image-caption'),
    re_path(r'^generate-file-tags/$', GenerateFileTags.as_view(), name='api-v2.1-generate-file-tags'),
    re_path(r'^generate-summary/$', GenerateSummary.as_view(), name='api-v2.1-generate-summary'),
    re_path(r'^ocr/$', OCR.as_view(), name='api-v2.1-ocr'),
    re_path(r'^translate/$', Translate.as_view(), name='api-v2.1-translate'),
    re_path(r'^writing-assistant/$', WritingAssistant.as_view(), name='api-v2.1-writing-assistant'),
    re_path(r'^sdoc-general-assistant/$', SdocGeneralAssistant.as_view(), name='api-v2.1-sdoc-general-assistant'),
]

