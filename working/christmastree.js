// --- Christmas Tree Schematics SVGs ---
// The keys here now EXACTLY match the `treeType` values in your wells_data file.
const schematicSVGs = {
  "Platform A/C - Two Valves": `<svg width="800" height="500" viewBox="0 -10 800 500" xmlns="http://www.w3.org/2000/svg">
    <!-- Vertical stem -->
    <line x1="130" y1="30" x2="130" y2="370" stroke="#333" stroke-width="4"/>
    <!-- TC (Tree Cap) -->
    <g>
    <rect x="122" y="25" width="15" height="15" fill="#aaa" />
    <ellipse cx="130" cy="10" rx="13" ry="13" fill="#6ea2d7" stroke="#4577a4" stroke-width="2"/>
    <text x="90" y="32" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">SC</text>
    </g>
    <!-- 2SV (bowtie) -->
    <g>
    <rect x="105" y="40" width="50" height="50" fill="#90EE90" stroke="#333" stroke-width="0"/>
    <polygon points="110,45 150,45 130,65" fill="#111"/>
    <polygon points="110,85 150,85 130,65" fill="#111"/>
    <text x="90" y="70" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">2SV</text>
    </g>
    <!-- SV (bowtie) -->
    <g>
    <rect x="105" y="90" width="50" height="50" fill="#90EE90" stroke="#333" stroke-width="0"/>
    <polygon points="110,95 150,95 130,115" fill="#111"/>
    <polygon points="110,135 150,135 130,115" fill="#111"/>
    <text x="90" y="125" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">SV</text>
    </g>
    <!-- Gauge block (vertical) -->
    <g>
    <rect x="105" y="139" width="50" height="40" fill="#aaa" />
    <ellipse cx="95" cy="160" rx="10" ry="10" fill="#6ea2d7" stroke="#4577a4" stroke-width="2"/>
    <text x="70" y="167" font-size="14" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">Gauge</text>
    </g>
    <!-- MWV (wing, bowtie left-right) -->
    <g>
    <rect x="175" y="140" width="50" height="50" fill="#90EE90" stroke="#333" stroke-width="0"/>
    <polygon points="180,147 200,165 180,183" fill="#111"/>
    <polygon points="220,147 200,165 220,183" fill="#111"/>
    <text x="200" y="135" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">MWV</text>
    <text x="174" y="167" font-size="14" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">BT</text>
    </g>
    <!-- HWV (wing, bowtie left-right) -->
    <g>
    <rect x="225" y="140" width="50" height="50" fill="#90EE90" stroke="blue" stroke-width="2"/>
    <polygon points="230,147 250,165 230,183" fill="#111"/>
    <polygon points="270,147 250,165 270,183" fill="#111"/>
    <text x="250" y="135" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">HWV</text>
    </g>
    <!-- HMV (bowtie) -->
    <g>
    <rect x="105" y="180" width="50" height="50" fill="#90EE90" stroke="blue" stroke-width="2"/>
    <polygon points="110,185 150,185 130,205" fill="#111"/>
    <polygon points="110,225 150,225 130,205" fill="#111"/>
    <text x="90" y="210" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">HMV</text>
    </g>
    <!-- MMV (bowtie) -->
    <g>
    <rect x="105" y="231" width="50" height="50" fill="#90EE90" stroke="blue" stroke-width="0"/>
    <polygon points="110,235 150,235 130,255" fill="#111"/>
    <polygon points="110,275 150,275 130,255" fill="#111"/>
    <text x="90" y="260" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">MMV</text>
    </g>
    <!-- SCSSV (bowtie) -->
    <g>
    <rect x="105" y="335" width="50" height="50" fill="#90EE90" stroke="blue" stroke-width="2"/>
    <polygon points="110,340 150,340 130,360" fill="#111"/>
    <polygon points="110,380 150,380 130,360" fill="#111"/>
    <text x="90" y="365" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">SCSSV</text>
    </g>
    <!-- Choke -->
    <g>
    <line x1="340" y1="240" x2="340" y2="320" stroke="#333" stroke-width="6"/>
    <polygon points="280,140 320,190 280,190" fill="#aaa"/>
    <polygon points="320,240 370,240 320,190" fill="#aaa"/>
    <ellipse cx="325" cy="280" rx="10" ry="10" fill="#6ea2d7" stroke="#4577a4" stroke-width="2"/>
    <text x="340" y="155" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">Choke</text>
    </g>
    <!-- PFSV -->
    <g>
    <line x1="340" y1="317" x2="730" y2="317" stroke="#333" stroke-width="6"/>
    <rect x="500" y="290" width="50" height="50" fill="#90EE90"/>
    <rect x="510" y="308" width="20" height="15" fill="#111" />
    <polygon points="520,300 540,315 520,330" fill="#111"/>
    <text x="545" y="280" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">PFSV</text>
    </g>
    <!-- THDV -->
    <g>
    <line x1="650" y1="217" x2="650" y2="320" stroke="#333" stroke-width="6"/>
    <line x1="650" y1="220" x2="730" y2="220" stroke="#333" stroke-width="6"/>
    <rect x="730" y="195" width="50" height="50" fill="#90EE90"/>
    <polygon points="735,202 755,220 735,238" fill="#111"/>
    <polygon points="775,202 755,220 775,238" fill="#111"/>
    <text x="755" y="190" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">THDV</text>
    </g>
    <!-- PHDV -->
    <g>
    <rect x="730" y="290" width="50" height="50" fill="#90EE90"/>
    <polygon points="735,295 755,315 735,335" fill="#111"/>
    <polygon points="775,295 755,315 775,335" fill="#111"/>
    <text x="755" y="285" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">PHDV</text>
    </g>
    <!-- Bypass and Bleed Valves -->
    <line x1="450" y1="320" x2="450" y2="430" stroke="blue" stroke-width="2" stroke-dasharray="5,5"/>
    <line x1="449" y1="430" x2="750" y2="430" stroke="blue" stroke-width="2" stroke-dasharray="5,5"/>
    <line x1="600" y1="320" x2="600" y2="430" stroke="blue" stroke-width="2" stroke-dasharray="5,5"/>
    <g>
      <text x="450" y="360" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">PFSV B/P</text>
      <polygon points="440,370 460,370 450,385" fill="blue"/>
      <polygon points="440,400 460,400 450,385" fill="blue"/>
    </g>
    <g>
      <text x="600" y="340" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">Header B/P</text>
      <polygon points="590,350 610,350 600,365" fill="blue"/>
      <polygon points="590,380 610,380 600,365" fill="blue"/>
    </g>
    <g>
      <text x="700" y="410" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">Bleed Down Valve</text>
      <polygon points="735,420 751,430 735,440" fill="blue"/>
      <polygon points="765,420 749,430 765,440" fill="blue"/>
    </g>
  </svg>`,

  "Platform A/C - Single Swab": `<svg width="850" height="500" viewBox="0 0 850 500" xmlns="http://www.w3.org/2000/svg">
    <!-- Vertical stem -->
    <line x1="130" y1="100" x2="130" y2="370" stroke="#333" stroke-width="4"/>
    <!-- TC (Tree Cap) -->
    <g>
    <rect x="122" y="70" width="15" height="15" fill="#aaa" />
    <ellipse cx="130" cy="55" rx="13" ry="13" fill="#6ea2d7" stroke="#4577a4" stroke-width="2"/>
    <text x="90" y="79" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">TC</text>
    </g>
    <!-- SV (bowtie) -->
    <g>
    <rect x="105" y="90" width="50" height="50" fill="#90EE90" stroke="#333" stroke-width="0"/>
    <polygon points="110,95 150,95 130,115" fill="#111"/>
    <polygon points="110,135 150,135 130,115" fill="#111"/>
    <text x="90" y="125" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">SV</text>
    </g>
    <!-- Gauge block (vertical) -->
    <g>
    <rect x="105" y="139" width="50" height="40" fill="#aaa" />
    <ellipse cx="95" cy="160" rx="10" ry="10" fill="#6ea2d7" stroke="#4577a4" stroke-width="2"/>
    <text x="70" y="160" font-size="14" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">Gauge</text>
    </g>
    <!-- MWV (wing, bowtie left-right) -->
    <g>
    <rect x="175" y="140" width="50" height="50" fill="#90EE90" stroke="#333" stroke-width="0"/>
    <polygon points="180,147 200,165 180,183" fill="#111"/>
    <polygon points="220,147 200,165 220,183" fill="#111"/>
    <text x="200" y="135" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">MWV</text>
    <text x="174" y="167" font-size="14" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">BT</text>
    </g>
    <!-- HWV (wing, bowtie left-right) -->
    <g>
    <rect x="225" y="140" width="50" height="50" fill="#90EE90" stroke="blue" stroke-width="2"/>
    <polygon points="230,147 250,165 230,183" fill="#111"/>
    <polygon points="270,147 250,165 270,183" fill="#111"/>
    <text x="250" y="135" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">HWV</text>
    </g>
    <!-- HMV (bowtie) -->
    <g>
    <rect x="105" y="180" width="50" height="50" fill="#90EE90" stroke="blue" stroke-width="2"/>
    <polygon points="110,185 150,185 130,205" fill="#111"/>
    <polygon points="110,225 150,225 130,205" fill="#111"/>
    <text x="90" y="210" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">HMV</text>
    </g>
    <!-- MMV (bowtie) -->
    <g>
    <rect x="105" y="231" width="50" height="50" fill="#90EE90" stroke="blue" stroke-width="0"/>
    <polygon points="110,235 150,235 130,255" fill="#111"/>
    <polygon points="110,275 150,275 130,255" fill="#111"/>
    <text x="90" y="260" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">MMV</text>
    </g>
    <!-- SCSSV (bowtie) -->
    <g>
    <rect x="105" y="335" width="50" height="50" fill="#90EE90" stroke="blue" stroke-width="2"/>
    <polygon points="110,340 150,340 130,360" fill="#111"/>
    <polygon points="110,380 150,380 130,360" fill="#111"/>
    <text x="90" y="365" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">SCSSV</text>
    </g>
    <!-- Choke -->
    <g>
    <line x1="340" y1="240" x2="340" y2="320" stroke="#333" stroke-width="6"/>
    <polygon points="280,140 320,190 280,190" fill="#aaa"/>
    <polygon points="320,240 370,240 320,190" fill="#aaa"/>
    <ellipse cx="325" cy="280" rx="10" ry="10" fill="#6ea2d7" stroke="#4577a4" stroke-width="2"/>
    <text x="340" y="155" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">Choke</text>
    </g>
    <!-- PFSV -->
    <g>
    <line x1="340" y1="317" x2="730" y2="317" stroke="#333" stroke-width="6"/>
    <rect x="500" y="290" width="50" height="50" fill="#90EE90"/>
    <rect x="510" y="308" width="20" height="15" fill="#111" />
    <polygon points="520,300 540,315 520,330" fill="#111"/>
    <text x="545" y="280" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">PFSV</text>
    </g>
    <!-- THDV -->
    <g>
    <line x1="650" y1="217" x2="650" y2="320" stroke="#333" stroke-width="6"/>
    <line x1="650" y1="220" x2="730" y2="220" stroke="#333" stroke-width="6"/>
    <rect x="730" y="195" width="50" height="50" fill="#90EE90"/>
    <polygon points="735,202 755,220 735,238" fill="#111"/>
    <polygon points="775,202 755,220 775,238" fill="#111"/>
    <text x="755" y="190" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">THDV</text>
    </g>
    <!-- PHDV -->
    <g>
    <rect x="730" y="290" width="50" height="50" fill="#90EE90"/>
    <polygon points="735,295 755,315 735,335" fill="#111"/>
    <polygon points="775,295 755,315 775,335" fill="#111"/>
    <text x="755" y="285" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">PHDV</text>
    </g>
    <!-- Bypass and Bleed Valves -->
    <line x1="450" y1="320" x2="450" y2="430" stroke="blue" stroke-width="2" stroke-dasharray="5,5"/>
    <line x1="449" y1="430" x2="750" y2="430" stroke="blue" stroke-width="2" stroke-dasharray="5,5"/>
    <line x1="600" y1="320" x2="600" y2="430" stroke="blue" stroke-width="2" stroke-dasharray="5,5"/>
    <g>
      <text x="450" y="360" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">PFSV B/P</text>
      <polygon points="440,370 460,370 450,385" fill="blue"/>
      <polygon points="440,400 460,400 450,385" fill="blue"/>
    </g>
    <g>
      <text x="600" y="340" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">Header B/P</text>
      <polygon points="590,350 610,350 600,365" fill="blue"/>
      <polygon points="590,380 610,380 600,365" fill="blue"/>
    </g>
    <g>
      <text x="700" y="410" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">Bleed Down Valve</text>
      <polygon points="735,420 751,430 735,440" fill="blue"/>
      <polygon points="765,420 749,430 765,440" fill="blue"/>
    </g>
  </svg>`,

  "Platform B": `<svg width="900" height="500" viewBox="0 0 900 500" xmlns="http://www.w3.org/2000/svg">
    <!-- Vertical stem -->
    <line x1="130" y1="100" x2="130" y2="370" stroke="#333" stroke-width="4"/>
    <!-- TC (Tree Cap) -->
    <g>
    <rect x="122" y="70" width="15" height="15" fill="#aaa" />
    <ellipse cx="130" cy="55" rx="13" ry="13" fill="#6ea2d7" stroke="#4577a4" stroke-width="2"/>
    <text x="90" y="79" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">TC</text>
    </g>
    <!-- SV (bowtie) -->
    <g>
    <rect x="105" y="90" width="50" height="50" fill="#90EE90" stroke="#333" stroke-width="0"/>
    <polygon points="110,95 150,95 130,115" fill="#111"/>
    <polygon points="110,135 150,135 130,115" fill="#111"/>
    <text x="90" y="125" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">SV</text>
    </g>
    <!-- Gauge block (vertical) -->
    <g>
    <rect x="105" y="140" width="50" height="50" fill="#aaa" />
    <text x="140" y="165" font-size="14" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">BT</text>
    <ellipse cx="92" cy="165" rx="10" ry="10" fill="#6ea2d7" stroke="#4577a4" stroke-width="2"/>
    </g>
    <!-- MWV (wing, bowtie left-right) -->
    <g>
    <rect x="155" y="140" width="50" height="50" fill="#90EE90" stroke="#333" stroke-width="0"/>
    <polygon points="160,147 180,165 160,183" fill="#111"/>
    <polygon points="200,147 180,165 200,183" fill="#111"/>
    <text x="180" y="135" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">MWV</text>
    </g>
    <!-- HWV (wing, bowtie left-right) -->
    <g>
    <line x1="240" y1="165" x2="360" y2="165" stroke="#333" stroke-width="4"/>
    <rect x="206" y="140" width="50" height="50" fill="#90EE90" stroke="blue" stroke-width="2"/>
    <polygon points="210,147 230,165 210,183" fill="#111"/>
    <polygon points="250,147 230,165 250,183" fill="#111"/>
    <text x="230" y="135" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">HWV</text>
    </g>
    <!-- HMV (bowtie) -->
    <g>
    <rect x="105" y="190" width="50" height="50" fill="#90EE90"/>
    <polygon points="110,195 150,195 130,215" fill="#111"/>
    <polygon points="110,235 150,235 130,215" fill="#111"/>
    <text x="90" y="210" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">HMV</text>
    </g>
    <!-- MMV (bowtie) -->
    <g>
    <rect x="105" y="241" width="50" height="50" fill="#90EE90" stroke="blue" stroke-width="0"/>
    <polygon points="110,245 150,245 130,265" fill="#111"/>
    <polygon points="110,285 150,285 130,265" fill="#111"/>
    <text x="90" y="260" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">MMV</text>
    </g>
    <!-- SCSSV (bowtie) -->
    <g>
    <rect x="105" y="345" width="50" height="50" fill="#90EE90" stroke="blue" stroke-width="2"/>
    <polygon points="110,350 150,350 130,370" fill="#111"/>
    <polygon points="110,390 150,390 130,370" fill="#111"/>
    <text x="90" y="365" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">SCSSV</text>
    </g>
    <!-- IDV -->
    <g>
    <line x1="320" y1="165" x2="320" y2="450" stroke="#333" stroke-width="4"/>
    <rect x="295" y="241" width="50" height="50" fill="#90EE90" stroke="blue" stroke-width="2"/>
    <polygon points="300,245 340,245 320,265" fill="#111"/>
    <polygon points="300,285 340,285 320,265" fill="#111"/>
    <text x="285" y="260" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">IDV</text>
    </g>
    <!-- IFSV -->
    <g>
    <line x1="318" y1="450" x2="750" y2="450" stroke="#333" stroke-width="4"/>
    <rect x="500" y="425" width="50" height="50" fill="#90EE90"/>
    <rect x="520" y="443" width="20" height="15" fill="#111" />
    <polygon points="530,435 510,450 530,465" fill="#111"/>
    <ellipse cx="600" cy="435" rx="10" ry="10" fill="#6ea2d7" stroke="#4577a4" stroke-width="2"/>
    <text x="540" y="415" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">IFSV</text>
    </g>
    <!-- IHDV -->
    <g>
    <rect x="730" y="425" width="50" height="50" fill="#90EE90"/>
    <polygon points="735,430 755,450 735,470" fill="#111"/>
    <polygon points="775,430 755,450 775,470" fill="#111"/>
    <text x="755" y="490" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">IHDV</text>
    </g>
    <!-- PDV -->
    <g>
    <rect x="345" y="140" width="50" height="50" fill="#90EE90" stroke="blue" stroke-width="2"/>
    <polygon points="350,147 370,165 350,183" fill="#111"/>
    <polygon points="390,147 370,165 390,183" fill="#111"/>
    <text x="385" y="130" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">PDV</text>
    </g>
    <!-- Choke -->
    <g>
    <line x1="450" y1="220" x2="450" y2="302" stroke="#333" stroke-width="4"/>
    <polygon points="400,140 450,170 400,190" fill="#aaa"/>
    <polygon points="420,220 480,220 450,170" fill="#aaa"/>
    <ellipse cx="435" cy="270" rx="10" ry="10" fill="#6ea2d7" stroke="#4577a4" stroke-width="2"/>
    <text x="470" y="135" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">Choke</text>
    </g>
    <!-- PFSV -->
    <g>
    <line x1="450" y1="300" x2="730" y2="300" stroke="#333" stroke-width="4"/>
    <rect x="500" y="275" width="50" height="50" fill="#90EE90"/>
    <rect x="510" y="293" width="20" height="15" fill="#111" />
    <polygon points="520,285 540,300 520,315" fill="#111"/>
    <text x="545" y="260" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">PFSV</text>
    </g>
    <!-- Test Sep HDV -->
    <g>
    <line x1="650" y1="202" x2="730" y2="202" stroke="#333" stroke-width="4"/>
    <rect x="730" y="175" width="50" height="50" fill="#90EE90"/>
    <polygon points="735,180 755,202 735,220" fill="#111"/>
    <polygon points="775,180 755,202 775,220" fill="#111"/>
    <text x="755" y="50" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">Test Sep HDV</text>
    </g>
    <!-- D Sep HDV -->
    <g>
    <line x1="650" y1="85" x2="650" y2="302" stroke="#333" stroke-width="4"/>
    <line x1="648" y1="85" x2="730" y2="85" stroke="#333" stroke-width="4"/>
    <rect x="730" y="60" width="50" height="50" fill="#90EE90"/>
    <polygon points="735,65 755,85 735,105" fill="#111"/>
    <polygon points="775,65 755,85 775,105" fill="#111"/>
    <ellipse cx="635" cy="200" rx="10" ry="10" fill="#6ea2d7" stroke="#4577a4" stroke-width="2"/>
    <text x="755" y="165" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">D Sep HDV</text>
    </g>
    <!-- B Sep HDV -->
    <g>
    <rect x="730" y="275" width="50" height="50" fill="#90EE90"/>
    <polygon points="735,280 755,300 735,320" fill="#111"/>
    <polygon points="775,280 755,300 775,320" fill="#111"/>
    <text x="755" y="265" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">B Sep HDV</text>
    </g>
    <!-- Flare Header -->
    <line x1="630" y1="385" x2="750" y2="385" stroke="#333" stroke-width="2"/>
    <line x1="630" y1="300" x2="630" y2="385" stroke="#333" stroke-width="2"/>
    <g>
      <text x="595" y="350" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">FHDV</text>
      <polygon points="620,330 640,330 630,345" fill="#90EE90"/>
      <polygon points="620,360 640,360 630,345" fill="#90EE90"/>
    </g>
    <g>
      <text x="740" y="365" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">Flare Header Choke</text>
      <polygon points="735,375 760,385 735,395" fill="#90EE90"/>
      <polygon points="749,405 769,405 759,385" fill="#90EE90"/>
    </g>
  </svg>`
};

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
  
  let desc = `<span style="font-weight:600;">${well.id}</span>`;
  if (well.name && well.name !== well.id) desc += ` &mdash; ${well.name}`;
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
            showValveModal(wellId, foundLabel, testObj || {});
          } else if (typeof openValveWizard === 'function') {
            openValveWizard(wellId, foundLabel, testObj || {});
          } else {
            console.error('Neither showValveModal nor openValveWizard is defined.');
            alert(`Clicked on valve: ${foundLabel}`);
          }
        };
        
        g.oncontextmenu = function(evt) {
          evt.preventDefault();
          if (typeof showValveInputBox === 'function') {
            showValveInputBox(wellId, foundLabel, evt);
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