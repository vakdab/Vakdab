function readCatalogMeta(data, page, pageSize = DEFAULT_CATALOG_PAGE_SIZE, itemCount = 0) {
  const pagination = data?.pagination || data?.meta?.pagination || {};
  const total = Number(pagination.total || data?.total || data?.count || data?.meta?.total || 0) || 0;
  const currentPage3 = Number(pagination.current_page || pagination.currentPage || pagination.page || page) || page;
  const lastPage = Number(pagination.last_page || pagination.lastPage || pagination.pages || 0) || (total ? Math.ceil(total / pageSize) : 0);
  const explicitHasNext = pagination.has_next_page ?? pagination.hasNextPage ?? pagination.has_next ?? data?.hasNextPage ?? data?.has_next_page;
  const hasNextPage = explicitHasNext !== void 0 ? Boolean(explicitHasNext) : lastPage > 0 ? currentPage3 < lastPage : itemCount >= pageSize;
  return { page: currentPage3, pageSize, total, lastPage, hasNextPage };
}
function attachCatalogMeta(items, meta) {
  Object.defineProperties(items, {
    pagination: { value: meta, enumerable: false, configurable: true },
    total: { value: meta.total, enumerable: false, configurable: true },
    hasNextPage: { value: meta.hasNextPage, enumerable: false, configurable: true }
  });
  return items;
}
var DEFAULT_CATALOG_PAGE_SIZE;
var init_pagination = __esm({
  "src/js/services/catalog/pagination.js?v=20260829-catalog-28-v1"() {
    DEFAULT_CATALOG_PAGE_SIZE = 28;
  }
});
