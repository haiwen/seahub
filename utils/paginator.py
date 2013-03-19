from django.core.paginator import Paginator as DefaultPaginator

class Paginator(DefaultPaginator):
    def get_page_range(self, current_page=1):
        """
        Returns custom range of pages.
        """
        first_page = 1
        total_page = self.num_pages
        if total_page <= 10:
            last_page = total_page 
        else:
            if current_page < 6:
                last_page = 10
            else:
                first_page = current_page - 5
                last_page = current_page + 4 if current_page + 4 < total_page else total_page
        return range(first_page, last_page + 1)
