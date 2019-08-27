# Copyright (c) 2012-2016 Seafile Ltd.
from django.core.paginator import Paginator as DefaultPaginator

def get_page_range(current_page, num_pages):
    first_page = 1
    if num_pages <= 10:
        last_page = num_pages
    else:
        if current_page < 6:
            last_page = 10
        else:
            first_page = current_page - 5
            last_page = current_page + 4 if current_page + 4 < num_pages else num_pages
    return list(range(first_page, last_page + 1))
    
class Paginator(DefaultPaginator):
    def get_page_range(self, current_page=1):
        """
        Returns custom range of pages.
        """
        return get_page_range(current_page, self.num_pages)
