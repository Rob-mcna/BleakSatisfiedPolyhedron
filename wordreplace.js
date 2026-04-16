// ===== UI wording patch: Deviation -> Dispensation =====
(function () {
  const replacements = [
    ['Create Deviation', 'Create Dispensation'],
    ['View Deviations', 'View Dispensations'],
    ['Deviation Request Form', 'Dispensation Request Form'],
    ['Deviation Admin Panel', 'Dispensation Review Panel'],
    ['No deviations found', 'No dispensations found'],
    ['Deviation not found', 'Dispensation not found'],
    ['Deviation saved to database', 'Dispensation saved to database'],
    ['Failed to save deviation to database', 'Failed to save dispensation to database'],
    ['Warning: Failed to save deviation to database; kept in current session', 'Warning: Failed to save dispensation to database; kept in current session'],
    ['pending deviations', 'pending dispensations'],
    ['deviation', 'dispensation'],
    ['deviations', 'dispensations']
  ];

  function replaceTextInNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    let text = node.nodeValue;
    let updated = text;

    replacements.forEach(([from, to]) => {
      updated = updated.replaceAll(from, to);
    });

    if (updated !== text) {
      node.nodeValue = updated;
    }
  }

  function walk(node) {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      replaceTextInNode(node);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    // skip script/style
    const tag = node.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE') return;

    node.childNodes.forEach(walk);
  }

  function relabelDispensationUI(root = document.body) {
    walk(root);
  }

  // initial pass
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => relabelDispensationUI());
  } else {
    relabelDispensationUI();
  }

  // keep relabeling future modals/sections
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
          relabelDispensationUI(node);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  window.relabelDispensationUI = relabelDispensationUI;
})();
