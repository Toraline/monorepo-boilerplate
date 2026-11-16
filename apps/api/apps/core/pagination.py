"""The one way in which every list of the server is returned: in pages."""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class Pagination(PageNumberPagination):
    """20 rows per page. "?page=2" asks for another page, "?pageSize=50" for another size."""

    page_size = 20
    page_size_query_param = "pageSize"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response(
            {
                "count": self.page.paginator.count,
                "page": self.page.number,
                "pageSize": self.page.paginator.per_page,
                "totalPages": self.page.paginator.num_pages,
                "results": data,
            }
        )


def paged_response(request, queryset, serializer_class) -> Response:
    """One page of the queryset, in the shape that every list of the server uses."""
    paginator = Pagination()
    page = paginator.paginate_queryset(queryset, request)
    return paginator.get_paginated_response(serializer_class(page, many=True).data)
