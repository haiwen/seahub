import unittest
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from types import SimpleNamespace

from django.conf import settings
from django.template import Context, Engine, Library
from django.test import SimpleTestCase, override_settings
from django.urls import include, path
from django.utils import translation


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
SEAHUB_ROOT = REPOSITORY_ROOT / 'seahub'
HTML_BODIES = (
    'group/add_member_email.html',
    'invitations/invitation_email.html',
    'invitations/invitation_revoke_email.html',
    'notifications/file_updates_email.html',
    'notifications/notice_email.html',
    'notifications/notify_virus.html',
    'organizations/org_deactivate_email.html',
    'share/audit_code_email.html',
    'share/share_link_email.html',
    'registration/activation_email.html',
    'registration/password_reset_email.html',
    'shared_link_email.html',
    'shared_link_password_email.html',
    'shared_upload_link_email.html',
    'shared_upload_link_password_email.html',
    'snippets/reset_repo_password.html',
    'sysadmin/short_time_linving_password_reset_link.html',
    'sysadmin/user_activation_email.html',
    'sysadmin/user_add_email.html',
    'sysadmin/user_batch_add_email.html',
    'sysadmin/user_freeze_email.html',
    'sysadmin/user_reset_email.html',
    'team_quota_full.html',
    'user_quota_full.html',
)
TABLE_HEADERS = {
    'notifications/file_updates_email.html': (
        ['User', 'Operation', 'File / Library', 'Time'],
        ['9%', '19%', '20%', '30%', '22%']),
    'notifications/notice_email.html': (
        ['Message', 'Time'], ['9%', '69%', '22%']),
}
NOTICE_VARIANTS = (
    'is_repo_share_msg', 'is_repo_share_to_group_msg', 'is_user_message',
    'is_file_uploaded_msg', 'is_folder_uploaded_msg', 'is_group_join_request',
    'is_add_user_to_group', 'is_file_comment_msg', 'is_wopi_mention_msg',
    'is_guest_invitation_accepted_msg', 'is_deleted_files_msg',
    'is_saml_sso_error_msg', 'is_repo_monitor_msg',
)


def unused_view(request, **kwargs):
    raise AssertionError('Email template tests must not invoke views.')


urlpatterns = [
    path('register/', unused_view, name='registration_register'),
    path('activate/<str:activation_key>/', unused_view,
         name='registration_activate'),
    path('reset/<str:uidb36>/<str:token>/', unused_view,
         name='auth_password_reset_confirm'),
    path('login/', unused_view, name='auth_login'),
    path('users/', unused_view, name='sys_search_users'),
    path('invitations/', include(([
        path('<str:token>/', unused_view, name='token_view'),
    ], 'invitations'))),
]


def template_engine(template_sources=None):
    library = Library()
    library.filter('email2nickname', lambda value: str(
        getattr(value, 'username', value)).split('@')[0])
    library.filter('seahub_filesizeformat', lambda value: str(value) + ' bytes')
    engine = Engine(
        dirs=[str(SEAHUB_ROOT / 'templates')] + [
            str(SEAHUB_ROOT / app / 'templates') for app in (
                'group', 'invitations', 'notifications', 'organizations', 'share')
        ],
        libraries={'i18n': 'django.templatetags.i18n'},
        loaders=[('django.template.loaders.locmem.Loader',
                  template_sources or {}),
                 'django.template.loaders.filesystem.Loader'],
    )
    engine.template_libraries['seahub_tags'] = library
    return engine


def sample_notice(variant='is_repo_share_msg', **extra):
    notice = {
        variant: True,
        'shared_type': 'library',
        'notice_from': 'Synthetic sender',
        'avatar_src': 'https://example.invalid/avatar.png',
        'repo_url': '/library/synthetic/',
        'repo_name': 'Synthetic library',
        'group_url': '/group/synthetic/',
        'group_name': 'Synthetic group',
        'user_msg_url': '/message/synthetic/',
        'user_msg': 'Synthetic message text',
        'file_link': '/file/synthetic/',
        'file_url': '/file/synthetic/',
        'file_name': 'Synthetic file.txt',
        'folder_link': '/folder/synthetic/',
        'folder_name': 'Synthetic folder',
        'parent_dir_link': '/folder/parent/',
        'parent_dir_name': 'Synthetic parent',
        'grpjoin_user_profile_url': '/profile/synthetic/',
        'grpjoin_group_url': '/group/synthetic/',
        'grpjoin_group_name': 'Synthetic group',
        'grpjoin_request_msg': 'Synthetic request text',
        'group_staff_profile_url': '/profile/synthetic/',
        'author': 'Synthetic author',
        'inv_accepter': 'Synthetic guest',
        'inv_url': '/invitation/synthetic/',
        'inv_accept_at': '2026-11-25 09:00',
        'error_msg': 'Synthetic SSO error',
        'repo_monitor_msg': 'Synthetic monitor message',
        'timestamp': datetime(2026, 11, 25, 9, 30),
    }
    notice.update(extra)
    return notice


def sample_context(**extra):
    context = {
        'LANGUAGE_CODE': 'fr',
        'url_base': 'https://example.invalid',
        'site_name': 'Synthetic Seafile',
        'media_url': '/media/',
        'logo_path': 'img/logo.png',
        'name': 'Synthetic recipient',
        'user_name': 'Synthetic recipient',
        'username': 'recipient@example.invalid',
        'user': SimpleNamespace(username='recipient@example.invalid'),
        'email': 'sender@example.invalid',
        'to_email': 'recipient@example.invalid',
        'inviter': 'sender@example.invalid',
        'group': SimpleNamespace(group_name='Synthetic group'),
        'org': SimpleNamespace(org_name='Synthetic organization'),
        'org_name': 'Synthetic organization',
        'reactivate_link': 'https://example.invalid/reactivate/',
        'token': 'synthetic-token',
        'activation_key': 'synthetic-activation-key',
        'uid': 'synthetic-uid',
        'expiration_days': 3,
        'code': '123456',
        'password': 'synthetic-password',
        'shared_from': 'Synthetic sender',
        'url': 'https://example.invalid/verify/',
        'file_shared_name': 'Synthetic document.txt',
        'file_shared_type': 'file',
        'file_shared_link': 'https://example.invalid/file/synthetic/',
        'folder_name': 'Synthetic folder',
        'shared_upload_link': 'https://example.invalid/upload/synthetic/',
        'extra_msg': 'Synthetic sharing message',
        'quota_usage': 900,
        'quota_total': 1000,
        'repo_name': 'Synthetic library',
        'file_path': '/Synthetic file.txt',
        'owner': 'owner@example.invalid',
        'repo_name_file_list': [{'repo_name': 'Synthetic library',
                                 'file_path': '/Synthetic file.txt'}],
        'reg_email': 'new-user@example.invalid',
        'user_search_link': 'https://example.invalid/users/?query=synthetic',
        'group_name': 'Synthetic group',
        'group_join_msg': 'Synthetic join request',
        'notice_count': 1,
        'notices': [sample_notice()],
        'updates_count': 1,
        'updates': [{
            'user_avatar': 'https://example.invalid/avatar.png',
            'op_user_link': '<a href="https://example.invalid/user/">Uploader</a>',
            'operation': 'Modified',
            'op_details': '<a href="https://example.invalid/file/">Document.txt</a>',
            'local_timestamp': datetime(2026, 11, 25, 9, 30),
        }],
    }
    context.update(extra)
    return context


class Element:
    def __init__(self, tag, attrs=()):
        self.tag = tag
        self.attrs = dict(attrs)
        self.children = []

    def find_all(self, tag):
        matches = []
        for child in self.children:
            if isinstance(child, Element):
                if child.tag == tag:
                    matches.append(child)
                matches.extend(child.find_all(tag))
        return matches

    def text(self):
        return ''.join(child.text() if isinstance(child, Element) else child
                       for child in self.children)


class EmailMarkupParser(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.root = Element('root')
        self.stack = [self.root]
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        element = Element(tag, attrs)
        self.stack[-1].children.append(element)
        if tag not in ('img', 'br', 'hr', 'meta', 'link', 'input'):
            self.stack.append(element)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                return

    def handle_data(self, data):
        self.stack[-1].children.append(data)


@override_settings(ROOT_URLCONF=__name__, USE_I18N=True, LANGUAGE_CODE='en',
                   USE_TZ=False)
class EmailAccessibilityTemplateTest(SimpleTestCase):
    def setUp(self):
        self.engine = template_engine()

    def render(self, template_name, language='en', **extra):
        with translation.override(language):
            html = self.engine.get_template(template_name).render(
                Context(sample_context(**extra)))
        return EmailMarkupParser(html).root

    def test_all_html_bodies_keep_the_original_email_shell(self):
        for template_name in ('email_base.html',) + HTML_BODIES:
            for language in ('en', 'de', 'zh-cn', 'zh-tw', 'ar'):
                with self.subTest(template_name=template_name, language=language):
                    page = self.render(template_name, language)
                    wrapper = next(child for child in page.children
                                   if isinstance(child, Element))
                    self.assertEqual(wrapper.attrs, {
                        'style': 'background:#f2f2f2;padding:40px 0;',
                    })
                    self.assertIn('width:700px;',
                                  page.find_all('div')[1].attrs['style'])

    def test_notification_data_tables_keep_named_native_semantics(self):
        for template_name, (labels, widths) in TABLE_HEADERS.items():
            with self.subTest(template_name=template_name):
                page = self.render(template_name)
                table, = page.find_all('table')
                self.assertNotIn(table.attrs.get('role'), ('none', 'presentation'))
                summary, = [paragraph for paragraph in page.find_all('p')
                            if paragraph.attrs.get('id') ==
                            table.attrs['aria-labelledby']]
                self.assertIn('Synthetic Seafile', summary.text())
                self.assertEqual(len(table.find_all('thead')), 1)
                self.assertEqual(len(table.find_all('tbody')), 1)
                header_row, = table.find_all('thead')[0].find_all('tr')
                cells = [child for child in header_row.children
                         if isinstance(child, Element)]
                self.assertEqual([cell.attrs['width'] for cell in cells], widths)
                self.assertEqual(cells[0].tag, 'td')
                self.assertEqual(cells[0].text(), '')
                self.assertEqual([cell.text().strip() for cell in cells[1:]], labels)
                for header in table.find_all('th'):
                    self.assertEqual(header.attrs['scope'], 'col')
                    self.assertTrue(header.text().strip())
                    self.assertIn('color: #9c9c9c;', header.attrs['style'])
                for image in page.find_all('img'):
                    self.assertEqual(image.attrs['alt'], '')

    def test_empty_single_and_multiple_notification_rows(self):
        for template_name in TABLE_HEADERS:
            for count in (0, 1, 3):
                with self.subTest(template_name=template_name, count=count):
                    context = sample_context()
                    context.update(notice_count=count, updates_count=count,
                                   notices=context['notices'] * count,
                                   updates=context['updates'] * count)
                    page = self.render(template_name, **context)
                    body, = page.find_all('tbody')
                    self.assertEqual(len(body.find_all('tr')), count)
                    summary = next(paragraph for paragraph in page.find_all('p')
                                   if 'id' in paragraph.attrs)
                    self.assertIn('1 new' if count == 1 else str(count),
                                  summary.text())

    def test_file_update_cells_follow_the_column_reading_order(self):
        page = self.render('notifications/file_updates_email.html')
        body, = page.find_all('tbody')
        self.assertEqual([cell.text().strip() for cell in body.find_all('td')],
                         ['', 'Uploader', 'Modified', 'Document.txt',
                          '2026-11-25 9:30:00'])

    def test_decorative_avatar_cells_reference_an_existing_text_header(self):
        for template_name in TABLE_HEADERS:
            with self.subTest(template_name=template_name):
                context = sample_context()
                context.update(notices=context['notices'] * 3,
                               updates=context['updates'] * 3,
                               notice_count=3, updates_count=3)
                page = self.render(template_name, **context)
                table, = page.find_all('table')
                for row in table.find_all('tbody')[0].find_all('tr'):
                    avatar = row.find_all('td')[0]
                    header, = [cell for cell in table.find_all('th')
                               if cell.attrs.get('id') ==
                               avatar.attrs['headers']]
                    self.assertEqual(header.attrs['scope'], 'col')
                    self.assertIn(header.text(), ('User', 'Message'))
                    self.assertEqual(avatar.find_all('img')[0].attrs['alt'], '')

    def test_notice_variants_keep_message_before_timestamp(self):
        for variant in NOTICE_VARIANTS:
            for shared_type in ('library', 'folder'):
                with self.subTest(variant=variant, shared_type=shared_type):
                    page = self.render(
                        'notifications/notice_email.html', notices=[
                            sample_notice(variant, shared_type=shared_type)])
                    body, = page.find_all('tbody')
                    avatar, message, timestamp = body.find_all('td')
                    self.assertEqual(avatar.text(), '')
                    self.assertIn('Synthetic', message.text())
                    self.assertEqual(timestamp.text(), '2026-11-25 9:30:00')

    def test_notification_name_reuses_the_translated_summary(self):
        for template_name in TABLE_HEADERS:
            for language in ('de', 'zh-cn', 'zh-tw', 'ar'):
                with self.subTest(template_name=template_name, language=language):
                    page = self.render(template_name, language)
                    table, = page.find_all('table')
                    summary = next(paragraph for paragraph in page.find_all('p')
                                   if paragraph.attrs.get('id') ==
                                   table.attrs['aria-labelledby'])
                    self.assertTrue(summary.text().strip())
                    self.assertEqual(sum(paragraph.attrs.get('id') ==
                                         table.attrs['aria-labelledby']
                                         for paragraph in page.find_all('p')), 1)

    def test_shell_uses_no_layout_tables_or_presentation_role_on_data(self):
        for template_name in HTML_BODIES:
            with self.subTest(template_name=template_name):
                tables = self.render(template_name).find_all('table')
                self.assertEqual(len(tables), int(template_name in TABLE_HEADERS))
                for table in tables:
                    self.assertNotIn(table.attrs.get('role'),
                                     ('presentation', 'none'))

    def test_plaintext_bodies_and_subject_stay_unwrapped(self):
        expected_text = {
            'group/group_join_email.html': 'Synthetic join request',
            'registration/register_complete_email.html':
                'new-user@example.invalid',
            'registration/register_complete_email_subject.html':
                'New account created on Synthetic Seafile',
        }
        for template_name, expected in expected_text.items():
            with self.subTest(template_name=template_name):
                page = self.render(template_name)
                self.assertIn(expected, page.text())
                self.assertFalse(any(isinstance(child, Element)
                                     for child in page.children))


if __name__ == '__main__':
    import django

    settings.configure(INSTALLED_APPS=[], LANGUAGE_CODE='en', USE_I18N=True,
                       USE_TZ=False, DEFAULT_CHARSET='utf-8')
    django.setup()
    unittest.main()
