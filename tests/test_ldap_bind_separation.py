"""Standalone smoke tests for Seahub 13 LDAP bind separation.

Runs without a full Seahub/Django installation by loading only the two LDAP
methods from accounts.py and replacing the LDAP server with a fake. These
are NOT live LDAP or full integration tests.

Usage (from the Seahub repository root):
    python tests/test_ldap_bind_separation.py
"""
import ast
from pathlib import Path
import types
import unittest

SOURCE = Path(__file__).resolve().parents[1] / 'seahub' / 'base' / 'accounts.py'


class FakeSASL:
    CB_AUTHNAME = 'authname'
    CB_PASS = 'password'

    @staticmethod
    def sasl(callbacks, mechanism):
        return (mechanism, callbacks)


class FakeConnection:
    USER_DN = 'cn=Example User,ou=People,o=msu,dc=ru'

    def __init__(self):
        self.binds = []
        self.unbound = False
        self.protocol_version = None

    def set_option(self, option, value):
        pass

    def sasl_interactive_bind_s(self, dn, mechanism_and_callbacks):
        mechanism, callbacks = mechanism_and_callbacks
        self.binds.append(('sasl', mechanism, callbacks))
        if mechanism != 'EXTERNAL' and callbacks.get('password') not in ('good-password', 'reader-secret'):
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
        return [(self.USER_DN, {'mail': [b'example@sai.msu.ru']})]

    def unbind_s(self):
        self.unbound = True


class FakeLDAP:
    OPT_REFERRALS = 1
    VERSION3 = 3
    SCOPE_SUBTREE = 2

    def __init__(self):
        self.connections = []

    def initialize(self, url):
        c = FakeConnection()
        self.connections.append(c)
        return c


def load_backend(path, ldap_instance):
    module = ast.parse(path.read_text(encoding='utf-8'))
    source_cls = next(n for n in module.body if isinstance(n, ast.ClassDef) and n.name == 'CustomLDAPBackend')
    only_methods = [n for n in source_cls.body if isinstance(n, ast.FunctionDef) and n.name in ('ldap_bind', 'search_user')]
    test_cls = ast.ClassDef(name='CustomLDAPBackend', bases=[], keywords=[], body=only_methods, decorator_list=[])
    isolated = ast.fix_missing_locations(ast.Module(body=[test_cls], type_ignores=[]))
    fake_filter = types.SimpleNamespace(filter_format=lambda template, args: template.replace('%s', args[0]))
    ns = dict(ldap=ldap_instance, sasl=FakeSASL, filter=fake_filter,
              parse_ldap_res=lambda data, *args: (FakeConnection.USER_DN, 'Example User', 'example@sai.msu.ru', '', 'authc'))
    exec(compile(isolated, str(path), 'exec'), ns)
    return ns['CustomLDAPBackend']()


class BindSeparationTest(unittest.TestCase):
    def setUp(self):
        self.ldap = FakeLDAP()
        self.backend = load_backend(SOURCE, self.ldap)

    def do_search(self, password, enable_sasl=True, mechanism='EXTERNAL', admin_dn=''):
        admin_password = 'reader-secret' if not enable_sasl or mechanism != 'EXTERNAL' else ''
        if not enable_sasl:
            admin_dn = 'cn=reader,o=msu,dc=ru'
        return self.backend.search_user(
            'ldaps://example', admin_dn, admin_password, enable_sasl,
            mechanism, 'uid', 'o=msu,dc=ru', 'mail', 'example@sai.msu.ru',
            password, '', 'mail', '', False)

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

    def test_other_sasl_mechanism_preserved(self):
        self.do_search('good-password', mechanism='PLAIN')
        self.assertEqual(self.ldap.connections[0].binds[0][0:2], ('sasl', 'PLAIN'))
        self.assertEqual(self.ldap.connections[1].binds[0][0:2], ('sasl', 'PLAIN'))
        self.assertEqual(self.ldap.connections[1].binds[0][2]['password'], 'good-password')


if __name__ == '__main__':
    unittest.main(verbosity=2)
