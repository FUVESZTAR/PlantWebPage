/**
 * Attaches a live-search filter to a <select> element using a paired search
 * input (identified by `searchId`). The full option list is snapshotted
 * whenever `refresh()` is called, and the select is rebuilt on every keystroke
 * so the native browser dropdown only shows matching entries.
 *
 * @param {HTMLSelectElement} selectEl  The <select> to make searchable.
 * @param {string}            searchId  The id of the companion <input> search field.
 * @returns {{ refresh: Function }}     Call refresh() after repopulating the select.
 */
export function makeSelectSearchable(selectEl, searchId) {
  const searchInput = document.getElementById(searchId);
  if (!searchInput) return { refresh: () => {} };

  let allOptions = [];

  function snapshot() {
    allOptions = Array.from(selectEl.options).map(o => ({
      value: o.value,
      text: o.textContent,
      selected: o.selected,
    }));
  }

  function applyFilter() {
    const query = searchInput.value.trim().toLowerCase();
    const currentValue = selectEl.value;

    // Rebuild options: always keep the first (placeholder) option
    selectEl.innerHTML = '';
    allOptions.forEach(o => {
      if (o.value === '' || !query || o.text.toLowerCase().includes(query)) {
        const opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.text;
        selectEl.appendChild(opt);
      }
    });

    // Restore previous selection when it is still visible
    if (currentValue && Array.from(selectEl.options).some(o => o.value === currentValue)) {
      selectEl.value = currentValue;
    }
  }

  searchInput.addEventListener('input', applyFilter);

  // Clear search field when user makes a selection
  selectEl.addEventListener('change', () => {
    searchInput.value = '';
    // Re-snapshot so allOptions reflects the current set
    snapshot();
    applyFilter();
  });

  return {
    refresh() {
      snapshot();
      searchInput.value = '';
      applyFilter();
    },
  };
}
