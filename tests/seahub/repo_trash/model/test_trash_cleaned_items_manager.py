# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8

from seahub.repo_trash.models import TrashCleanedItems
from seahub.test_utils import BaseTestCase


class TrashCleanedItemsManagerTest(BaseTestCase):

    def setUp(self):

        self.repo_id = self.repo.id
        self.file_path = self.file

    def test_model_manager(self):

        items =  TrashCleanedItems.objects.get_items_by_repo(self.repo_id)
        init_len = len(items)

        item = TrashCleanedItems.objects.add_item(self.repo_id, self.file_path)
        assert item.repo_id == self.repo_id
        assert item.path == self.file_path

        items_after_add =  TrashCleanedItems.objects.get_items_by_repo(self.repo_id)
        assert len(items_after_add) == init_len + 1
