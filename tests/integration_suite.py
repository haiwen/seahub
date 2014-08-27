import unittest
import sys

def suite():
  from integration.login import LoginTestCase
  integration_suite = unittest.TestSuite((\
    unittest.makeSuite(LoginTestCase),
    ))

  from integration_api.ping import PingApiTestCase
  from integration_api.authping import AuthPingApiTestCase
  from integration_api.account import AccountApiTestCase 
  integration_api_suite = unittest.TestSuite((\
    unittest.makeSuite(PingApiTestCase),
    unittest.makeSuite(AuthPingApiTestCase),
    unittest.makeSuite(AccountApiTestCase),
    ))

  return unittest.TestSuite([integration_api_suite, integration_suite])

if __name__ == "__main__":
  result = unittest.TextTestRunner(verbosity=2).run(suite())
  sys.exit(not result.wasSuccessful())
