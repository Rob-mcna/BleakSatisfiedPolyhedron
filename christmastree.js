






// --- Store test results per well and valve ---
const wellValveTests = {};

// --- Modal for SVG only, with interactive valves ---
function showWellSchematicOnlyModal(wellId) {
  // Use the corrected `wells_data` variable name if you have it in another file
  const well = (typeof wells_data !== 'undefined' ? wells_data : wells).find(w => w.id === wellId); 
  if (!well) {
    console.error("Well not found:", wellId);
    return;
  }
  
  const schematicSVG = schematicSVGs[well.treeType] || `<div style="color:#888;">No schematic available for tree type: ${well.treeType}</div>`;

  let modal = document.getElementById('svgOnlyModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'svgOnlyModal';
    modal.className = 'modal';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="modal-content"
        style="background: #fff; min-width:500px; min-height:600px; max-width:98vw; max-height:98vh;
          text-align:center; position:relative; overflow:auto; border-radius:24px;
          box-shadow: 0 8px 32px 0 rgba(0,0,0,0.18);">
        <button id="closeSvgOnlyModalBtn"
          style="position:absolute;top:10px;right:10px;font-size:28px;background:none;border:none;color:#444;cursor:pointer;z-index:10;">
          &times;
        </button>
        <div id="svgOnlyContent" style="margin:0 auto;display:inline-block;"></div>
        <div id="svgDescBox"
          style="position: absolute; left: 0; bottom: 0; background: rgba(240,240,240,0.93); color: #222;
            font-size: 1em; text-align: left; padding: 15px 16px 10px 20px; min-width: 180px; min-height: 48px;
            border-top-right-radius: 12px; border-bottom-left-radius: 6px; box-shadow: 0 2px 12px 0 rgba(0,0,0,0.06);
            z-index: 2; pointer-events: none; font-family: 'Segoe UI', Arial, sans-serif;">
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('closeSvgOnlyModalBtn').onclick = closeWellSchematicOnlyModal;
    modal.onclick = function(e) {
      if (e.target === modal) closeWellSchematicOnlyModal();
    };
  }
  document.getElementById('svgOnlyContent').innerHTML = schematicSVG;
  
  let desc = `<span style="font-weight:600;">${well.name}</span>`;
  if (well.name && well.name !== well.name) desc += ` &mdash; ${well.name}`;
  if (well.type) desc += `<br><span>${well.type}</span>`;
  if (well.treeType) desc += `<br><span>${well.treeType}</span>`;
  if (well.metadata) desc += `<br><span>${well.metadata}</span>`;
  document.getElementById('svgDescBox').innerHTML = desc;

  modal.style.display = 'flex';

  setTimeout(() => {
    const svg = document.getElementById('svgOnlyContent').querySelector('svg');
    if (!svg) return;
    
    const valveLabels = [
        "SV", "MWV", "HWV", "HMV", "MMV", "SCSSV", "2SV",
        "PFSV", "THDV", "PHDV", "PFSV B/P", "Header B/P", "Bleed Down Valve",
        "IDV", "IFSV", "IHDV", "PDV", "Test Sep HDV", "D Sep HDV", "B Sep HDV", "FHDV",
        "Choke", "Flare Header Choke"
    ];

    Array.from(svg.querySelectorAll('g')).forEach(g => {
      const texts = Array.from(g.querySelectorAll('text')).map(t => (t.textContent || '').trim());
      const foundLabel = valveLabels.find(v => texts.includes(v));
      
      if (foundLabel) {
        g.style.cursor = 'pointer';
        const wellTests = wellValveTests[wellId] || {};
        const testObj = wellTests[foundLabel];
        
        if (testObj && Object.keys(testObj).length > 0) {
          g.setAttribute('opacity', '0.7');
          g.setAttribute('filter', 'drop-shadow(0 0 8px #3fa)');
        } else {
          g.setAttribute('opacity', '1');
          g.removeAttribute('filter');
        }
        
        g.onclick = function(evt) {
          evt.stopPropagation();
          // --- ACTION REQUIRED ---
          // I have restored the call to the older `showValveModal` function.
          // If you have created `openValveWizard`, you can switch to that.
          if (typeof showValveModal === 'function') {
            showValveModal(wellname, foundLabel, testObj || {});
          } else if (typeof openValveWizard === 'function') {
            openValveWizard(wellname, foundLabel, testObj || {});
          } else {
            console.error('Neither showValveModal nor openValveWizard is defined.');
            alert(`Clicked on valve: ${foundLabel}`);
          }
        };
        
        g.oncontextmenu = function(evt) {
          evt.preventDefault();
          if (typeof showValveInputBox === 'function') {
            showValveInputBox(wellname, foundLabel, evt);
          }
        };
      }
    });
  }, 50);
}

function saveValveTests() {
  localStorage.setItem('wimt-valve-tests', JSON.stringify(wellValveTests));
}

function loadValveTests() {
  try {
    const data = JSON.parse(localStorage.getItem('wimt-valve-tests') || '{}');
    Object.assign(wellValveTests, data);
  } catch {}
}
loadValveTests();

function closeWellSchematicOnlyModal() {
  const modal = document.getElementById('svgOnlyModal');
  if (modal) modal.style.display = 'none';
  const inputBox = document.getElementById('valveInputBox');
  if (inputBox) inputBox.remove();
}