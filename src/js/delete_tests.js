
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// SIMPLIFIED DELETE FUNCTIONS
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// SIMPLIFIED DELETE SPECIFIC TEST

// ADD THIS NEW FUNCTION to your wellsection.js file
function cleanupEmptyValveEntries(wellId, valveId) {
  // Clean up test results
  if (window.valveTestResults[wellId] && window.valveTestResults[wellId][valveId]) {
    const tests = window.valveTestResults[wellId][valveId];
    if (Array.isArray(tests) && tests.length === 0) {
      delete window.valveTestResults[wellId][valveId];
    } else if (typeof tests === 'object' && Object.keys(tests).length === 0) {
      delete window.valveTestResults[wellId][valveId];
    }
  }
  
  // Clean up selected index
  if (window.selectedValveTestIndex[wellId] && window.selectedValveTestIndex[wellId][valveId] !== undefined) {
    delete window.selectedValveTestIndex[wellId][valveId];
  }
  
  // Clean up warnings
  if (window.valveTestWarnings[wellId] && window.valveTestWarnings[wellId][valveId]) {
    delete window.valveTestWarnings[wellId][valveId];
  }
}
// Add these new functions:
async function deleteSpecificTest(wellId, valveId, testIndex) {
  try {
    showTemporaryMessage('Deleting test...', 'info');
    
    const response = await fetch(`http://10.226.14.79:5000/api/integrity_test/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        well: wellId,
        valve: valveId,
        test_index: testIndex,
        delete_reason: "User requested deletion",
        deleted_by: "Rob-mcnano",
        timestamp: "2025-07-14 11:25:14"
      })
    });

    if (response.ok) {
      showTemporaryMessage('Test deleted successfully', 'success');
      // Refresh data and UI
      renderValveTestResultsPanel(wellId);
      renderWellSchematicAndPanel(wellId);
    } else {
      showTemporaryMessage('Failed to delete test', 'error');
    }
  } catch (error) {
    console.error("Error deleting test:", error);
    showTemporaryMessage('Failed to delete test: Network error', 'error');
  }
}

async function deleteAllTestsForValve(wellId, valveId) {
  try {
    showTemporaryMessage('Deleting all tests...', 'info');
    
    const response = await fetch(`http://10.226.14.79:5000/api/integrity_test/delete_all`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        well: wellId,
        valve: valveId,
        delete_reason: "User requested bulk deletion",
        deleted_by: "Rob-mcnano",
        timestamp: "2025-07-14 11:25:14"
      })
    });

    if (response.ok) {
      showTemporaryMessage('All tests deleted successfully', 'success');
      // Refresh data and UI
      renderValveTestResultsPanel(wellId);
      renderWellSchematicAndPanel(wellId);
    } else {
      showTemporaryMessage('Failed to delete tests', 'error');
    }
  } catch (error) {
    console.error("Error deleting tests:", error);
    showTemporaryMessage('Failed to delete tests: Network error', 'error');
  }
}

// SIMPLIFIED DELETE ALL TESTS
async function deleteAllTestsForValve(wellId, valveId) {
    try {
        const response = await fetch('http://p629719.mnet.com:5000/api/delete_valve_test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wellId: wellId,
                valveId: valveId,
                testIndex: null, // null means delete all
                deletedBy: 'Rob-mcna'
            })
        });
        
        if (response.ok) {
            // Simple cleanup
            if (window.valveTestResults[wellId]) {
                window.valveTestResults[wellId][valveId] = [];
            }
            
            // Clear selected index
            if (window.selectedValveTestIndex[wellId]) {
                delete window.selectedValveTestIndex[wellId][valveId];
            }
            
            // Clear warnings
            if (window.valveTestWarnings[wellId]) {
                delete window.valveTestWarnings[wellId][valveId];
                localStorage.setItem('valve_test_warnings', JSON.stringify(window.valveTestWarnings));
            }
            
            saveValveTestResultsToLocalStorage();
            showTemporaryMessage('All tests deleted successfully', 'success');
            return true;
        } else {
            throw new Error('Delete all failed');
        }
    } catch (error) {
        console.error('Delete all error:', error);
        showTemporaryMessage('Delete failed - working offline', 'warning');
        
        // Fallback: delete locally
        if (window.valveTestResults[wellId]) {
            window.valveTestResults[wellId][valveId] = [];
        }
        
        if (window.selectedValveTestIndex[wellId]) {
            delete window.selectedValveTestIndex[wellId][valveId];
        }
        
        if (window.valveTestWarnings[wellId]) {
            delete window.valveTestWarnings[wellId][valveId];
            localStorage.setItem('valve_test_warnings', JSON.stringify(window.valveTestWarnings));
        }
        cleanupEmptyValveEntries(wellId, valveId);
        saveValveTestResultsToLocalStorage();
        return true;
    }
}

// SIMPLIFIED VIEW DELETED TESTS
async function viewDeletedTests(wellId, valveId = null) {
    try {
        showTemporaryMessage('Loading deleted tests...', 'info');
        
        // Simple URL construction
        let url = `http://p629719.mnet.com:5000/api/deleted_valve_tests?well=${wellId}`;
        if (valveId) url += `&valve=${valveId}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Deleted tests response:', data);
        
        // Handle different response formats
        let testsToShow = [];
        if (Array.isArray(data)) {
            testsToShow = data;
        } else if (data.deleted_tests && typeof data.deleted_tests === 'object') {
            // Flatten all valve tests
            testsToShow = Object.values(data.deleted_tests).flat();
        } else if (data.well_id && data.deleted_tests) {
            testsToShow = Object.values(data.deleted_tests).flat();
        }
        
        if (testsToShow.length === 0) {
            showTemporaryMessage('No deleted tests found', 'info');
            return;
        }
        
        // Simple modal display
        showSimpleDeletedTestsModal(testsToShow, wellId);
        
    } catch (error) {
        console.error('View deleted tests error:', error);
        showTemporaryMessage('Cannot load deleted tests - check connection', 'error');
    }
}

// SIMPLIFIED DELETED TESTS MODAL
function showSimpleDeletedTestsModal(testsArray, wellId) {
    // Remove any existing modal
    const existingModal = document.getElementById('simpleDeletedTestsModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'simpleDeletedTestsModal';
    modal.className = 'modal';
    modal.style.cssText = `
        position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%;
        background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center;
    `;
    
    modal.innerHTML = `
        <div style="background: white; color: black; padding: 20px; border-radius: 8px; max-width: 80%; max-height: 80%; overflow-y: auto; min-width: 600px;">
            <h3 style="margin-top: 0; color: #333;">Deleted Tests for Well ${wellId}</h3>
            <p>Found ${testsArray.length} deleted test(s)</p>
            ${testsArray.length > 0 ? `
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                        <thead>
                            <tr style="background: #f5f5f5;">
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Valve</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Deleted At</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Deleted By</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Leak Rate (scfm)</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Pass/Fail</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${testsArray.map((test, index) => {
                                const deletedAt = test.deletion_info?.deleted_at ? 
                                    new Date(test.deletion_info.deleted_at).toLocaleString() : 
                                    (test.deleted_at ? new Date(test.deleted_at).toLocaleString() : 'N/A');
                                const deletedBy = test.deletion_info?.deleted_by || test.deleted_by || 'N/A';
                                const leakRate = test.leak_rate_scfm !== undefined ? 
                                    Number(test.leak_rate_scfm).toFixed(3) : 'N/A';
                                const passStatus = test.pass && test.test_valid && test.leak_rate_pass ? 
                                    '✅ Pass' : '❌ Fail';
                                const valveType = test.ValveType || test.inputs?.ValveType || 'N/A';
                                
                                return `
                                    <tr style="${index % 2 === 1 ? 'background-color: #f8f9fa;' : ''}">
                                        <td style="border: 1px solid #ddd; padding: 8px;">${valveType}</td>
                                        <td style="border: 1px solid #ddd; padding: 8px;">${deletedAt}</td>
                                        <td style="border: 1px solid #ddd; padding: 8px;">${deletedBy}</td>
                                        <td style="border: 1px solid #ddd; padding: 8px;">${leakRate}</td>
                                        <td style="border: 1px solid #ddd; padding: 8px;">${passStatus}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            ` : '<p>No deleted tests to display</p>'}
            <div style="text-align: right; margin-top: 15px;">
                <button onclick="document.getElementById('simpleDeletedTestsModal').remove()" 
                        style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    showTemporaryMessage(`Displaying ${testsArray.length} deleted tests`, 'success');
}

// SIMPLIFIED DELETE CONFIRMATION
async function showDeleteTestConfirmation(wellId, valveId, testIndex = null) {
    const isDeleteAll = testIndex === null;
    const testsArray = window.valveTestResults[wellId] && window.valveTestResults[wellId][valveId];
    
    if (!testsArray) {
        showTemporaryMessage(`No tests found for valve ${valveId}`, 'error');
        return;
    }
    
    // Simple confirmation
    const testCount = Array.isArray(testsArray) ? testsArray.length : 1;
    let confirmMessage;
    
    if (isDeleteAll) {
        confirmMessage = `Delete ALL ${testCount} test(s) for valve ${valveId} in well ${wellId}?`;
    } else {
        confirmMessage = `Delete test ${testIndex + 1} for valve ${valveId} in well ${wellId}?`;
    }
    
    if (confirm(confirmMessage)) {
        showTemporaryMessage('Deleting...', 'info');
        
        try {
            let success = false;
            if (isDeleteAll) {
                success = await deleteAllTestsForValve(wellId, valveId);
            } else {
                success = await deleteSpecificTest(wellId, valveId, testIndex);
            }
            
            if (success) {
                // Refresh displays and update dashboard
                renderValveTestResultsPanel(wellId);
                renderWellSchematicAndPanel(wellId);
                updateDashboardAfterTest(wellId);
            }
        } catch (error) {
            console.error('Delete operation failed:', error);
            showTemporaryMessage('Delete failed', 'error');
        }
    }
}