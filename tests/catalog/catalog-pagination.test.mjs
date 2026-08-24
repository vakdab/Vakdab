import assert from 'node:assert/strict';
import { readCatalogMeta, attachCatalogMeta, uniqueCatalogItems } from '../../src/js/services/catalog/pagination.js';

function page(items, pagination) {
    const result = items.slice();
    return attachCatalogMeta(result, readCatalogMeta({ list: items, pagination }, pagination.page, 24, items.length));
}

for (const count of [24, 25, 50, 100]) {
    const items = Array.from({ length: count }, (_, index) => ({ url: `item-${index}` }));
    const first = page(items, { total: 100, pages: 5, page: 1 });
    assert.equal(first.length, count);
    assert.equal(first.pagination.total, 100);
    assert.equal(first.hasNextPage, true);
}

const lastPage = page(Array.from({ length: 4 }, (_, index) => ({ url: `last-${index}` })), { total: 100, pages: 5, page: 5 });
assert.equal(lastPage.hasNextPage, false);
assert.equal(lastPage.pagination.lastPage, 5);

const emptyPage = page([], { total: 0, pages: 0, page: 1 });
assert.equal(emptyPage.length, 0);
assert.equal(emptyPage.hasNextPage, false);

const duplicates = [{ url: 'same' }, { url: 'same' }, { url: 'unique' }];
assert.equal(uniqueCatalogItems(duplicates).length, 2);
console.log('catalog-pagination fixtures: ok');
