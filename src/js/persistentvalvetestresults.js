/**
 * Fetches persistent valve test results from the backend for all wells and valves.
 * Populates the global window.valveTestResults object with the fetched data.
 * Only includes valves for which the backend returns a non-empty array of test results.
 */
async function fetchPersistentValveTestResults() {
    try {
        console.log('Fetching persistent valve test results for all wells and valves...');
        const wells = window.wells || [];
        // Initialize or clear the results object before fetching
        window.valveTestResults = {};
        window.selectedValveTestIndex = {};

        const fetchPromises = [];
        for (const well of wells) {
            const wellId = well.id;
            const wellName = well.name;
            const valves = (well.christmasTree && Array.isArray(well.christmasTree.valves))
                ? well.christmasTree.valves : [];

            for (const valve of valves) {
                const valveId = valve.id;
                // Assuming the backend endpoint to get ALL tests for a valve is this one
                const url = `http://10.226.14.79:5000/api/integrity_test/?well=${encodeURIComponent(wellId)}&valve=${encodeURIComponent(valveId)}`;
                fetchPromises.push(
                    fetch(url)
                        .then(resp => {
                            if (!resp.ok) {
                                console.warn(`Fetch failed for persistent data for well ${wellName}, valve ${valveId}: ${resp.status}`);
                                return null; // Return null for non-OK responses
                            }
                            return resp.json();
                        })
                        .then(data => ({ wellName, valveId, data }))
                        .catch(error => {
                            console.error(`Error fetching persistent data for well ${wellName}, valve ${valveId}:`, error);
                            return { wellName, valveId, data: null }; // Return null data on fetch error
                        })
                );
            }
        }

        const resultsArray = await Promise.all(fetchPromises);

        for (const { wellName, valveId, data } of resultsArray) {
            // Only process and store data if it's a non-empty array of results
            if (data && Array.isArray(data) && data.length > 0) {
                 if (!window.valveTestResults[wellName]) {
                        window.valveTestResults[wellName] = {};
                        window.selectedValveTestIndex[wellName] = {};
                    }
                    // Store the array of all test results for this valve
                    window.valveTestResults[wellName][valveId] = data;
                    // By default, select the latest test (last item in the array)
                    window.selectedValveTestIndex[wellName][valveId] = data.length - 1;
                    console.log(`Persistent data added for valve ${valveId} on well ${wellName}. Test count: ${data.length}`);
            } else {
                // Log valves with no persistent data found (empty array, null, etc.)
                console.log(`No persistent data found or invalid data for valve ${valveId} on well ${wellName}. Skipping.`);
            }
        }

        console.log('Persistent valve test results fetching complete.', window.valveTestResults);
        return window.valveTestResults;
    } catch (error) {
        console.error('Error in fetchPersistentValveTestResults:', error);
        throw error;
    }
}