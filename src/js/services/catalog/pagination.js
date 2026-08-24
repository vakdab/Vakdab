export const DEFAULT_CATALOG_PAGE_SIZE = 24;

export function readCatalogMeta(data, page, pageSize = DEFAULT_CATALOG_PAGE_SIZE, itemCount = 0) {
    const pagination = data?.pagination || data?.meta?.pagination || {};
    const total = Number(pagination.total || data?.total || data?.count || data?.meta?.total || 0) || 0;
    const currentPage = Number(pagination.current_page || pagination.currentPage || pagination.page || page) || page;
    const lastPage = Number(pagination.last_page || pagination.lastPage || pagination.pages || 0) || (total ? Math.ceil(total / pageSize) : 0);
    const explicitHasNext = pagination.has_next_page ?? pagination.hasNextPage ?? pagination.has_next ?? data?.hasNextPage ?? data?.has_next_page;
    const hasNextPage = explicitHasNext !== undefined
        ? Boolean(explicitHasNext)
        : lastPage > 0
            ? currentPage < lastPage
            : itemCount >= pageSize;
    return { page: currentPage, pageSize, total, lastPage, hasNextPage };
}

export function attachCatalogMeta(items, meta) {
    Object.defineProperties(items, {
        pagination: { value: meta, enumerable: false, configurable: true },
        total: { value: meta.total, enumerable: false, configurable: true },
        hasNextPage: { value: meta.hasNextPage, enumerable: false, configurable: true }
    });
    return items;
}

export function uniqueCatalogItems(items = [], key = item => item?.url || item?.id || '') {
    return [...new Map(items.filter(item => key(item)).map(item => [key(item), item])).values()];
}
