import unittest
import sys

def suite():
  from integration.login import LoginTestCase
  integration_suite = unittest.TestSuite((\
    unittest.makeSuite(LoginTestCase),
    ))

  from integration_api.ping import PingApiTestCase
  from integration_api.authping import AuthPingApiTestCase
  from integration_api.accounts import AccountsApiTestCase 
  from integration_api.usermsgs import UserMsgsApiTestCase 
  from integration_api.groups import GroupsApiTestCase
  from integration_api.gmembers import GroupMemeberApiTestCase
  from integration_api.groupmsgs import GroupMsgsApiTestCase
  from integration_api.avatar import AvatarApiTestCase

  from integration_api.libraries import LibrariesApiTestCase
  from integration_api.files import FilesApiTestCase
  from integration_api.starredfiles import StarredFilesApiTestCase
  from integration_api.directories import DirectoriesApiTestCase 
  from integration_api.shares import SharesApiTestCase
  from integration_api.misc import MiscApiTestCase

  integration_api_suite = unittest.TestSuite((\
    unittest.makeSuite(PingApiTestCase),
    unittest.makeSuite(AuthPingApiTestCase),
    unittest.makeSuite(AccountsApiTestCase),
    unittest.makeSuite(UserMsgsApiTestCase),
    unittest.makeSuite(GroupsApiTestCase),
    unittest.makeSuite(GroupMemeberApiTestCase),
    unittest.makeSuite(GroupMsgsApiTestCase),
    unittest.makeSuite(AvatarApiTestCase),
    unittest.makeSuite(LibrariesApiTestCase),
    unittest.makeSuite(FilesApiTestCase),
    unittest.makeSuite(StarredFilesApiTestCase),
    unittest.makeSuite(DirectoriesApiTestCase),
    unittest.makeSuite(SharesApiTestCase),
    unittest.makeSuite(MiscApiTestCase),
    ))

  return unittest.TestSuite([integration_api_suite, integration_suite])

if __name__ == "__main__":
  result = unittest.TextTestRunner(verbosity=2).run(suite())
  sys.exit(not result.wasSuccessful())
