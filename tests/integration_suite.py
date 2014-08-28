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
  from integration_api.usermsgs import UserMsgsApiTestCase 
  from integration_api.groups import GroupsApiTestCase
  from integration_api.gmembers import GroupMemeberApiTestCase
  from integration_api.groupmsgs import GroupMsgsApiTestCase
  from integration_api.avatar import AvatarApiTestCase

  from integration_api.library import LibraryApiTestCase
  from integration_api.files import FilesApiTestCase
  from integration_api.starredfiles import StarredFilesApiTestCase
  from integration_api.directories import DirectoriesApiTestCase 
  from integration_api.misc import MiscApiTestCase

  integration_api_suite = unittest.TestSuite((\
    unittest.makeSuite(PingApiTestCase),
    unittest.makeSuite(AuthPingApiTestCase),
    unittest.makeSuite(AccountApiTestCase),
    unittest.makeSuite(UserMsgsApiTestCase),
    unittest.makeSuite(GroupsApiTestCase),
    unittest.makeSuite(GroupMemeberApiTestCase),
    unittest.makeSuite(GroupMsgsApiTestCase),
    unittest.makeSuite(AvatarApiTestCase),
    unittest.makeSuite(LibraryApiTestCase),
    unittest.makeSuite(FilesApiTestCase),
    unittest.makeSuite(StarredFilesApiTestCase),
    unittest.makeSuite(DirectoriesApiTestCase),
    unittest.makeSuite(MiscApiTestCase),
    ))

  return unittest.TestSuite([integration_api_suite, integration_suite])

if __name__ == "__main__":
  result = unittest.TextTestRunner(verbosity=2).run(suite())
  sys.exit(not result.wasSuccessful())
