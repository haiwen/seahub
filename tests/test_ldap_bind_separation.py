"""Standalone regression tests for Seahub 13 LDAP bind separation.

Runs without a full Seahub/Django installation by loading only the LDAP parser and
methods from accounts.py and replacing the LDAP server with a fake. These
are NOT live LDAP or full integration tests.

Usage (from the Seahub repository root):
    python tests/test_ldap_bind_separation.py
"""
import ast
from pathlib import Path
import types
import unittest

_UNSET = object()

SOURCE = Path(__file__).resolve().parents[1] / 'seahub' / 'base' / 'accounts.py'


class FakeSASL:
    CB_AUTHNAME = 'authname'
    CB_PASS = 'password'

    @staticmethod
    def sasl(callbacks, mechanism):
        return (mechanism, callbacks)


class FakeConnection:
    USER_DN = 'cn=Example User,ou=People,o=msu,dc=ru'

    def __init__(self, result):
        self.result = result
        self.binds = []
        self.unbound = False
        self.protocol_version = None

    def set_option(self, option, value):
        pass

    def sasl_interactive_bind_s(self, dn, mechanism_and_callbacks):
        mechanism, callbacks = mechanism_and_callbacks
        self.binds.append(('sasl', mechanism, callbacks))
        if mechanism not in ('EXTERNAL', 'GSSAPI') and callbacks.get('password') not in ('good-password', 'reader-secret'):
            raise ValueError('invalid user credentials')

    def simple_bind_s(self, dn, password):
        self.binds.append(('simple', dn, password))
        if dn == 'cn=reader,o=msu,dc=ru' and password == 'reader-secret':
            return
        if dn == self.USER_DN and password == 'good-password':
            return
        raise ValueError('invalid credentials')

    def search_s(self, base, scope, filterstr):
        if not self.binds:
            raise ValueError('not bound')
        return self.result

    def unbind_s(self):
        self.unbound = True


class FakeLDAP:
    OPT_REFERRALS = 1
    VERSION3 = 3
    SCOPE_SUBTREE = 2

    def __init__(self):
        self.connections = []
        self.result = [(FakeConnection.USER_DN, {
            'mail': [b'example@sai.msu.ru'], 'uid': [b'authc'],
            'givenName': [b'Example'], 'sn': [b'User'],
        })]

    def initialize(self, url):
        c = FakeConnection(self.result)
        self.connections.append(c)
        return c


def load_backend(path, ldap_instance):
    module = ast.parse(path.read_text(encoding='utf-8'))
    source_cls = next(n for n in module.body if isinstance(n, ast.ClassDef) and n.name == 'CustomLDAPBackend')
    only_methods = [n for n in source_cls.body if isinstance(n, ast.FunctionDef) and n.name in ('ldap_bind', 'search_user')]
    test_cls = ast.ClassDef(name='CustomLDAPBackend', bases=[], keywords=[], body=only_methods, decorator_list=[])
    parser = next(n for n in module.body if isinstance(n, ast.FunctionDef) and n.name == 'parse_ldap_res')
    isolated = ast.fix_missing_locations(ast.Module(body=[parser, test_cls], type_ignores=[]))
    fake_filter = types.SimpleNamespace(filter_format=lambda template, args: template.replace('%s', args[0]))
    ns = dict(ldap=ldap_instance, sasl=FakeSASL, filter=fake_filter,
              LDAP_USER_FIRST_NAME_ATTR='givenName', LDAP_USER_LAST_NAME_ATTR='sn',
              LDAP_USER_NAME_REVERSE=False, USE_LDAP_ROLE_LIST_MAPPING=False)
    exec(compile(isolated, str(path), 'exec'), ns)
    return ns['CustomLDAPBackend']()


class BindSeparationTest(unittest.TestCase):
    def setUp(self):
        self.ldap = FakeLDAP()
        self.backend = load_backend(SOURCE, self.ldap)

    def do_search(self, password, enable_sasl=True, mechanism='EXTERNAL', admin_dn='', user_bind_enable_sasl=_UNSET):
        if user_bind_enable_sasl is _UNSET:
            user_bind_enable_sasl = False if mechanism == 'EXTERNAL' else None
        admin_password = 'reader-secret' if not enable_sasl or mechanism != 'EXTERNAL' else ''
        if not enable_sasl:
            admin_dn = 'cn=reader,o=msu,dc=ru'
        return self.backend.search_user(
            'ldaps://example', admin_dn, admin_password, enable_sasl,
            mechanism, 'uid', 'o=msu,dc=ru', 'mail', 'example@sai.msu.ru',
            password, '', 'mail', '', False, user_bind_enable_sasl)

    def test_external_search_and_simple_user_bind(self):
        self.assertEqual(self.do_search('good-password'), ('Example User', 'example@sai.msu.ru', ''))
        self.assertEqual(self.ldap.connections[0].binds[0][0:2], ('sasl', 'EXTERNAL'))
        self.assertEqual(self.ldap.connections[1].binds[0], ('simple', FakeConnection.USER_DN, 'good-password'))
        self.assertTrue(all(c.unbound for c in self.ldap.connections))

    def test_incorrect_user_password_rejected_after_external_search(self):
        with self.assertRaisesRegex(Exception, 'invalid credentials'):
            self.do_search('bad-password')
        self.assertEqual(self.ldap.connections[0].binds[0][0:2], ('sasl', 'EXTERNAL'))
        self.assertEqual(self.ldap.connections[1].binds[0][0], 'simple')

    def test_empty_password_rejected_before_ldap_bind(self):
        for pwd in ('', None):
            with self.subTest(pwd=pwd):
                self.ldap.connections.clear()
                with self.assertRaisesRegex(Exception, 'must not be empty'):
                    self.do_search(pwd)
                self.assertEqual(self.ldap.connections, [])

    def test_wrong_password_rejected_in_standard_simple_bind(self):
        with self.assertRaisesRegex(Exception, 'invalid credentials'):
            self.do_search('wrong-password', enable_sasl=False)
        self.assertEqual(self.ldap.connections[0].binds[0][0], 'simple')
        self.assertEqual(self.ldap.connections[1].binds[0][0], 'simple')

    def test_external_search_fails_closed_if_user_bind_fails(self):
        # An EXTERNAL search must not be mistaken for user authentication.
        with self.assertRaises(Exception):
            self.do_search('wrong-password')
        self.assertEqual(len(self.ldap.connections), 2)
        self.assertTrue(self.ldap.connections[0].unbound)

    def test_standard_simple_bind_preserved(self):
        self.do_search('good-password', enable_sasl=False)
        self.assertEqual(self.ldap.connections[0].binds[0], ('simple', 'cn=reader,o=msu,dc=ru', 'reader-secret'))
        self.assertEqual(self.ldap.connections[1].binds[0], ('simple', FakeConnection.USER_DN, 'good-password'))


    def test_passwordless_user_mechanisms_rejected(self):
        for mechanism in ('EXTERNAL', 'GSSAPI', 'external', 'ANONYMOUS', 'UNKNOWN'):
            for option in (None, True):
                with self.subTest(mechanism=mechanism, option=option):
                    self.ldap.connections.clear()
                    with self.assertRaisesRegex(Exception, 'cannot verify a password'):
                        self.do_search('good-password', mechanism=mechanism,
                                       user_bind_enable_sasl=option)
                    self.assertEqual(self.ldap.connections, [])

    def test_explicit_simple_user_bind_with_gssapi_service(self):
        self.do_search('good-password', mechanism='GSSAPI', user_bind_enable_sasl=False)
        self.assertEqual(self.ldap.connections[0].binds[0][:2], ('sasl', 'GSSAPI'))
        self.assertEqual(self.ldap.connections[1].binds[0][0], 'simple')

    def test_empty_password_rejected_for_all_bind_modes(self):
        for mechanism in ('EXTERNAL', 'GSSAPI', 'PLAIN', ''):
            for option in (None, True, False):
                with self.subTest(mechanism=mechanism, option=option):
                    with self.assertRaisesRegex(Exception, 'must not be empty'):
                        self.do_search('', mechanism=mechanism, user_bind_enable_sasl=option)
                    self.assertEqual(self.ldap.connections, [])

    def test_missing_service_mechanism_fails_closed(self):
        with self.assertRaisesRegex(Exception, 'service SASL mechanism'):
            self.do_search('good-password', mechanism='', user_bind_enable_sasl=False)
        self.assertEqual(self.ldap.connections, [])

    def test_missing_user_mechanism_fails_closed(self):
        with self.assertRaisesRegex(Exception, 'cannot verify a password'):
            self.do_search('good-password', enable_sasl=False, mechanism='',
                           user_bind_enable_sasl=True)
        self.assertEqual(self.ldap.connections, [])

    def test_invalid_bind_option_fails_closed(self):
        with self.assertRaisesRegex(Exception, 'Invalid LDAP user bind configuration'):
            self.do_search('good-password', user_bind_enable_sasl='False')
        self.assertEqual(self.ldap.connections, [])

    def test_user_sasl_after_simple_service_bind_uses_authc_id(self):
        self.do_search('good-password', enable_sasl=False, mechanism='PLAIN',
                       user_bind_enable_sasl=True)
        self.assertEqual(self.ldap.connections[0].binds[0][0], 'simple')
        self.assertEqual(self.ldap.connections[1].binds[0],
                         ('sasl', 'PLAIN', {'authname': 'authc', 'password': 'good-password'}))

    def test_missing_sasl_identity_rejected(self):
        del self.ldap.result[0][1]['uid']
        with self.assertRaisesRegex(Exception, 'identity must not be empty'):
            self.do_search('good-password', mechanism='PLAIN')
        self.assertEqual(len(self.ldap.connections), 1)
        self.assertTrue(self.ldap.connections[0].unbound)

    def test_missing_or_ambiguous_directory_entry_rejected(self):
        for result in ([], [(None, {})], self.ldap.result * 2):
            with self.subTest(result=result):
                self.ldap.result = result
                self.ldap.connections.clear()
                with self.assertRaisesRegex(Exception, 'not found|one entry'):
                    self.do_search('good-password')
                self.assertEqual(len(self.ldap.connections), 1)
                self.assertTrue(self.ldap.connections[0].unbound)

    def test_wrong_password_rejected_in_password_sasl(self):
        with self.assertRaisesRegex(Exception, 'invalid user credentials'):
            self.do_search('bad-password', mechanism='PLAIN')
        self.assertTrue(self.ldap.connections[0].unbound)

    def test_primary_and_secondary_bind_settings_forwarded(self):
        module = ast.parse(SOURCE.read_text(encoding='utf-8'))
        backend = next(n for n in module.body if isinstance(n, ast.ClassDef)
                       and n.name == 'CustomLDAPBackend')
        authenticate = next(n for n in backend.body if isinstance(n, ast.FunctionDef)
                            and n.name == 'authenticate')
        calls = [n for n in ast.walk(authenticate) if isinstance(n, ast.Call)
                 and isinstance(n.func, ast.Attribute) and n.func.attr == 'search_user']
        self.assertEqual({call.args[-1].id for call in calls}, {
            'LDAP_USER_BIND_ENABLE_SASL', 'MULTI_LDAP_1_USER_BIND_ENABLE_SASL',
        })

    def test_user_simple_bind_can_be_selected_with_other_sasl_mechanisms(self):
        self.do_search('good-password', mechanism='PLAIN', user_bind_enable_sasl=False)
        self.assertEqual(self.ldap.connections[0].binds[0][0:2], ('sasl', 'PLAIN'))
        self.assertEqual(self.ldap.connections[1].binds[0], ('simple', FakeConnection.USER_DN, 'good-password'))

    def test_empty_password_rejected_when_simple_user_bind_is_selected(self):
        with self.assertRaisesRegex(Exception, 'must not be empty'):
            self.do_search('', mechanism='PLAIN', user_bind_enable_sasl=False)
        self.assertEqual(self.ldap.connections, [])

    def test_other_sasl_mechanism_preserved(self):
        self.do_search('good-password', mechanism='PLAIN')
        self.assertEqual(self.ldap.connections[0].binds[0][0:2], ('sasl', 'PLAIN'))
        self.assertEqual(self.ldap.connections[1].binds[0][0:2], ('sasl', 'PLAIN'))
        self.assertEqual(self.ldap.connections[1].binds[0][2]['password'], 'good-password')


if __name__ == '__main__':
    unittest.main(verbosity=2)
