from flask_cors import CORS
from flask import Flask, request, jsonify
import math
import json
import os
import numpy as np
from scipy.optimize import fsolve
from datetime import datetime 

app = Flask(__name__)
CORS(app)



# Load wells data at startup

WELLS_DATA_FILE = 'wells_data.json'

def load_wells_data():
    """Load wells data from JSON file"""
    if os.path.exists(WELLS_DATA_FILE):
        try:
            with open(WELLS_DATA_FILE, 'r') as f:
                wells = json.load(f)
                print(f"Loaded {len(wells)} wells from {WELLS_DATA_FILE}")
                return wells
        except json.JSONDecodeError:
            print(f"Warning: Could not decode {WELLS_DATA_FILE}. Starting with empty wells.")
            return []
        except Exception as e:
            print(f"Error loading {WELLS_DATA_FILE}: {e}. Starting with empty wells.")
            return []
    else:
        print(f"{WELLS_DATA_FILE} not found. Starting with empty wells.")
        return []

def save_wells_data(wells):
    """Save wells data to JSON file"""
    try:
        with open(WELLS_DATA_FILE, 'w') as f:
            json.dump(wells, f, indent=4)
        print(f"Saved {len(wells)} wells to {WELLS_DATA_FILE}")
    except IOError as e:
        print(f"Error saving wells data to {WELLS_DATA_FILE}: {e}")


wells_data = load_wells_data()

# ----------- File for Storing Test Results -----------
VALVE_TEST_RESULTS_FILE = 'valve_test_results.json'

def load_valve_test_results():
    if os.path.exists(VALVE_TEST_RESULTS_FILE):
        try:
            with open(VALVE_TEST_RESULTS_FILE, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError:
            print(f"Warning: Could not decode {VALVE_TEST_RESULTS_FILE}. Starting with empty results.")
            return {}
        except Exception as e:
            print(f"Error loading {VALVE_TEST_RESULTS_FILE}: {e}. Starting with empty results.")
            return {}
    return {}

def save_valve_test_results(results):
    try:
        with open(VALVE_TEST_RESULTS_FILE, 'w') as f:
            json.dump(results, f, indent=4)
    except IOError as e:
        print(f"Error saving valve test results to {VALVE_TEST_RESULTS_FILE}: {e}")

# ----------- Example Wells Data (cut for brevity; use your real data in production) -----------


VM_DATA = {
    # ... (your existing VM_DATA remains unchanged) ...
    "A02": {
        "SCSSV": {"MMV": 62.33, "HMV": 62.68, "MWV": 63.49, "HWV": 63.85, "PDV": 67.58, "HDVs": 76.79},
        "MMV": {"HMV": 0.35, "MWV": 1.17, "HWV": 1.52, "PDV": 3.12, "HDVs": 14.47},
        "HMV": {"MWV": 0.81, "HWV": 1.17, "PDV": 2.77, "HDVs": 15.17},
        "MWV": {"HWV": 0.35, "PDV": 1.94, "HDVs": 13.30},
        "HWV": {"PDV": 1.58, "HDVs": 12.94},
        "SV": {"SCSSV": 0.44},
        "PFSV": {"SCSSV": 73.77, "MMV": 11.45, "HMV": 11.09, "MWV": 10.56, "HWV": 10.21, "PDV": 9.40}
    },
    "A03": {
        "SCSSV": {"MMV": 58.82, "HMV": 59.18, "MWV": 59.99, "HWV": 60.34, "PDV": 67.58, "HDVs": 76.62},
        "MMV": {"HMV": 0.35, "MWV": 1.17, "HWV": 1.52, "PDV": 3.12, "HDVs": 17.80},
        "HMV": {"MWV": 0.81, "HWV": 1.17, "PDV": 2.77, "HDVs": 18.50},
        "MWV": {"HWV": 0.35, "PDV": 1.94, "HDVs": 16.63},
        "HWV": {"PDV": 1.58, "HDVs": 16.27},
        "SV": {"SCSSV": 0.44},
        "PFSV": {"SCSSV": 73.60, "MMV": 14.78, "HMV": 14.42, "MWV": 13.89, "HWV": 13.54, "PDV": 9.40}
    },
    "A10": {
        "SCSSV": {"MMV": 63.20, "HMV": 63.55, "MWV": 64.37, "HWV": 64.72, "PDV": 67.58, "HDVs": 77.91},
        "MMV": {"HMV": 0.35, "MWV": 1.17, "HWV": 1.52, "PDV": 3.12, "HDVs": 14.71},
        "HMV": {"MWV": 0.81, "HWV": 1.17, "PDV": 2.77, "HDVs": 15.42},
        "MWV": {"HWV": 0.35, "PDV": 1.94, "HDVs": 13.54},
        "HWV": {"PDV": 1.58, "HDVs": 13.19},
        "SV": {"SCSSV": 0.44},
        "PFSV": {"SCSSV": 74.89, "MMV": 11.69, "HMV": 11.34, "MWV": 10.81, "HWV": 10.45, "PDV": 9.40}
    },
    "A17": {
        "SCSSV": {"MMV": 55.81, "HMV": 56.16, "MWV": 56.97, "HWV": 57.33, "PDV": 67.58, "HDVs": 70.94},
        "MMV": {"HMV": 0.35, "MWV": 1.17, "HWV": 1.52, "PDV": 3.12, "HDVs": 15.13},
        "HMV": {"MWV": 0.81, "HWV": 1.17, "PDV": 2.77, "HDVs": 15.84},
        "MWV": {"HWV": 0.35, "PDV": 1.94, "HDVs": 13.97},
        "HWV": {"PDV": 1.58, "HDVs": 13.61},
        "SV": {"SCSSV": 0.44},
        "PFSV": {"SCSSV": 67.92, "MMV": 12.11, "HMV": 11.76, "MWV": 11.23, "HWV": 10.87, "PDV": 9.40}
    },
    "A18": {
        "SCSSV": {"MMV": 40.57, "HMV": 40.93, "MWV": 41.74, "HWV": 42.09, "PDV": 67.58, "HDVs": 57.13},
        "MMV": {"HMV": 0.35, "MWV": 1.17, "HWV": 1.52, "PDV": 3.12, "HDVs": 16.55},
        "HMV": {"MWV": 0.81, "HWV": 1.17, "PDV": 2.77, "HDVs": 17.26},
        "MWV": {"HWV": 0.35, "PDV": 1.94, "HDVs": 15.39},
        "HWV": {"PDV": 1.58, "HDVs": 15.03},
        "SV": {"SCSSV": 0.44},
        "PFSV": {"SCSSV": 54.10, "MMV": 13.53, "HMV": 13.18, "MWV": 12.65, "HWV": 12.29, "PDV": 9.40}
    },
    "B05": {
        "SCSSV": {"MMV": 59.50, "HMV": 59.86, "MWV": 60.69, "HWV": 61.04, "PDV": 67.58, "HDVs": 72.37},
        "MMV": {"HMV": 0.35, "MWV": 1.19, "HWV": 1.54, "PDV": 3.12, "HDVs": 12.86},
        "HMV": {"MWV": 0.83, "HWV": 1.19, "PDV": 2.77, "HDVs": 12.51},
        "MWV": {"HWV": 0.35, "PDV": 1.94, "HDVs": 11.68},
        "HWV": {"PDV": 1.58, "HDVs": 11.33},
        "SV": {"SCSSV": 0.44},
        "PFSV": {"SCSSV": 71.36, "MMV": 11.85, "HMV": 11.50, "MWV": 10.97, "HWV": 10.61, "PDV": 9.40}
    },
    "B06": {
        "SCSSV": {"MMV": 56.29, "HMV": 56.64, "MWV": 57.47, "HWV": 57.83, "PDV": 67.58, "HDVs": 81.17},
        "MMV": {"HMV": 0.35, "MWV": 1.19, "HWV": 1.54, "PDV": 3.12, "HDVs": 24.88},
        "HMV": {"MWV": 0.83, "HWV": 1.19, "PDV": 2.77, "HDVs": 24.53},
        "MWV": {"HWV": 0.35, "PDV": 1.94, "HDVs": 23.70},
        "HWV": {"PDV": 1.58, "HDVs": 23.34},
        "SV": {"SCSSV": 0.36},
        "PFSV": {"SCSSV": 68.45, "MMV": 12.16, "HMV": 11.81, "MWV": 11.28, "HWV": 10.92, "PDV": 9.40}
    },
    "B07": {
        "SCSSV": {"MMV": 64.46, "HMV": 64.81, "MWV": 65.65, "HWV": 66.00, "PDV": 67.58, "HDVs": 81.37},
        "MMV": {"HMV": 0.35, "MWV": 1.19, "HWV": 1.54, "PDV": 3.12, "HDVs": 16.91},
        "HMV": {"MWV": 0.83, "HWV": 1.19, "PDV": 2.77, "HDVs": 16.56},
        "MWV": {"HWV": 0.35, "PDV": 1.94, "HDVs": 15.73},
        "HWV": {"PDV": 1.58, "HDVs": 15.37},
        "SV": {"SCSSV": 0.44},
        "PFSV": {"SCSSV": 76.98, "MMV": 12.52, "HMV": 12.17, "MWV": 11.33, "HWV": 10.98, "PDV": 9.40}
    },
    "B08": {
        "SCSSV": {"MMV": 54.54, "HMV": 54.89, "MWV": 55.72, "HWV": 56.07, "PDV": 67.58, "HDVs": 57.83},
        "MMV": {"HMV": 0.35, "MWV": 1.19, "HWV": 1.54, "PDV": 3.12, "HDVs": 3.30},
        "HMV": {"MWV": 0.83, "HWV": 1.19, "PDV": 2.77, "HDVs": 2.94},
        "MWV": {"HWV": 0.35, "PDV": 1.94, "HDVs": 2.11},
        "HWV": {"PDV": 1.58, "HDVs": 1.76},
        "SV": {"SCSSV": 0.44},
        "PFSV": {"SCSSV": 77.74, "MMV": 23.21, "HMV": 22.85, "MWV": 22.32, "HWV": 21.97, "PDV": 9.40}
    },
    "B13": {
        "SCSSV": {"MMV": 95.00, "HMV": 95.54, "MWV": 96.81, "HWV": 97.35, "PDV": 97.84, "HDVs": 109.83},
        "MMV": {"HMV": 0.54, "MWV": 1.81, "HWV": 2.35, "PDV": 4.30, "HDVs": 14.83},
        "HMV": {"MWV": 1.27, "HWV": 1.81, "PDV": 3.77, "HDVs": 14.29},
        "MWV": {"HWV": 0.54, "PDV": 2.96, "HDVs": 13.01},
        "HWV": {"PDV": 0.54, "HDVs": 12.47},
        "SV": {"SCSSV": 0.58},
        "PFSV": {"SCSSV": 105.27, "MMV": 10.27, "HMV": 9.73, "MWV": 8.92, "HWV": 8.38, "PDV": 11.24}
    },
    "B14": {
        "SCSSV": {"MMV": 91.20, "HMV": 91.74, "MWV": 93.02, "HWV": 93.56, "PDV": 97.84, "HDVs": 108.54},
        "MMV": {"HMV": 0.54, "MWV": 1.81, "HWV": 2.35, "PDV": 4.30, "HDVs": 17.33},
        "HMV": {"MWV": 1.27, "HWV": 1.81, "PDV": 3.77, "HDVs": 16.79},
        "MWV": {"HWV": 0.54, "PDV": 2.96, "HDVs": 15.52},
        "HWV": {"PDV": 0.54, "HDVs": 14.98},
        "SV": {"SCSSV": 0.58},
        "PFSV": {"SCSSV": 103.98, "MMV": 12.78, "HMV": 12.24, "MWV": 11.42, "HWV": 10.88, "PDV": 11.24}
    },
    "B15": {
        "SCSSV": {"MMV": 95.80, "HMV": 96.34, "MWV": 97.62, "HWV": 98.16, "PDV": 97.84, "HDVs": 109.58},
        "MMV": {"HMV": 0.54, "MWV": 1.81, "HWV": 2.35, "PDV": 4.30, "HDVs": 13.78},
        "HMV": {"MWV": 1.27, "HWV": 1.81, "PDV": 3.77, "HDVs": 13.24},
        "MWV": {"HWV": 0.54, "PDV": 2.96, "HDVs": 11.97},
        "HWV": {"PDV": 0.54, "HDVs": 11.43},
        "SV": {"SCSSV": 0.58},
        "PFSV": {"SCSSV": 105.03, "MMV": 9.22, "HMV": 8.68, "MWV": 7.87, "HWV": 7.33, "PDV": 11.24}
    },
    "B16": {
        "SCSSV": {"MMV": 93.54, "HMV": 94.08, "MWV": 94.88, "HWV": 95.41, "PDV": 97.84, "HDVs": 113.84},
        "MMV": {"HMV": 0.54, "MWV": 1.34, "HWV": 1.87, "PDV": 4.30, "HDVs": 20.30},
        "HMV": {"MWV": 0.80, "HWV": 1.34, "PDV": 1.87, "HDVs": 19.76},
        "MWV": {"HWV": 0.54, "PDV": 2.96, "HDVs": 18.96},
        "HWV": {"PDV": 0.54, "HDVs": 18.42},
        "SV": {"SCSSV": 0.57},
        "PFSV": {"SCSSV": 109.08, "MMV": 15.54, "HMV": 15.01, "MWV": 14.21, "HWV": 13.67, "PDV": 11.24}
    },
    "C09": {
        "SCSSV": {"MMV": 77.07, "HMV": 77.61, "MWV": 78.88, "HWV": 79.42, "PDV": 97.84, "HDVs": 95.38},
        "MMV": {"HMV": 0.54, "MWV": 1.81, "HWV": 2.35, "PDV": 4.30, "HDVs": 18.32},
        "HMV": {"MWV": 1.27, "HWV": 1.81, "PDV": 3.77, "HDVs": 19.40},
        "MWV": {"HWV": 0.54, "PDV": 2.96, "HDVs": 16.50},
        "HWV": {"PDV": 0.54, "HDVs": 15.96},
        "SV": {"SCSSV": 0.58},
        "PFSV": {"SCSSV": 91.91, "MMV": 14.84, "HMV": 14.30, "MWV": 13.49, "HWV": 12.95, "PDV": 11.24}
    },
    "C11": {
        "SCSSV": {"MMV": 91.69, "HMV": 92.23, "MWV": 93.50, "HWV": 94.04, "PDV": 97.84, "HDVs": 107.93},
        "MMV": {"HMV": 0.54, "MWV": 1.81, "HWV": 2.35, "PDV": 4.30, "HDVs": 16.24},
        "HMV": {"MWV": 1.27, "HWV": 1.81, "PDV": 3.77, "HDVs": 17.32},
        "MWV": {"HWV": 0.54, "PDV": 2.96, "HDVs": 14.42},
        "HWV": {"PDV": 0.54, "HDVs": 13.88},
        "SV": {"SCSSV": 0.58},
        "PFSV": {"SCSSV": 104.45, "MMV": 12.76, "HMV": 12.22, "MWV": 11.41, "HWV": 10.87, "PDV": 11.24}
    },
    "C12": {
        "SCSSV": {"MMV": 86.32, "HMV": 86.86, "MWV": 88.14, "HWV": 88.68, "PDV": 97.84, "HDVs": 102.78},
        "MMV": {"HMV": 0.54, "MWV": 1.81, "HWV": 2.35, "PDV": 4.30, "HDVs": 16.46},
        "HMV": {"MWV": 1.27, "HWV": 1.81, "PDV": 3.77, "HDVs": 17.54},
        "MWV": {"HWV": 0.54, "PDV": 2.96, "HDVs": 14.65},
        "HWV": {"PDV": 0.54, "HDVs": 14.11},
        "SV": {"SCSSV": 0.58},
        "PFSV": {"SCSSV": 99.31, "MMV": 12.99, "HMV": 12.45, "MWV": 11.64, "HWV": 11.10, "PDV": 11.24}
    },
    "C19": {
        "SCSSV": {"MMV": 101.18, "HMV": 101.72, "MWV": 102.99, "HWV": 103.53, "PDV": 97.84, "HDVs": 117.13},
        "MMV": {"HMV": 0.54, "MWV": 1.81, "HWV": 2.35, "PDV": 4.30, "HDVs": 15.95},
        "HMV": {"MWV": 1.27, "HWV": 1.81, "PDV": 3.77, "HDVs": 17.03},
        "MWV": {"HWV": 0.54, "PDV": 2.96, "HDVs": 14.14},
        "HWV": {"PDV": 0.54, "HDVs": 13.60},
        "SV": {"SCSSV": 0.58},
        "PFSV": {"SCSSV": 113.66, "MMV": 12.48, "HMV": 11.94, "MWV": 11.13, "HWV": 10.59, "PDV": 11.24}
    },
    "C20": {
        "SCSSV": {"MMV": 91.90, "HMV": 92.44, "MWV": 93.71, "HWV": 94.25, "PDV": 97.84, "HDVs": 110.67},
        "MMV": {"HMV": 0.54, "MWV": 1.81, "HWV": 2.35, "PDV": 4.30, "HDVs": 18.78},
        "HMV": {"MWV": 1.27, "HWV": 1.81, "PDV": 3.77, "HDVs": 19.86},
        "MWV": {"HWV": 0.54, "PDV": 2.96, "HDVs": 16.96},
        "HWV": {"PDV": 0.54, "HDVs": 16.42},
        "SV": {"SCSSV": 0.58},
        "PFSV": {"SCSSV": 107.20, "MMV": 15.31, "HMV": 14.77, "MWV": 13.95, "HWV": 13.41, "PDV": 11.24}
    },
    "C21": {
        "SCSSV": {"MMV": 107.30, "HMV": 107.84, "MWV": 109.12, "HWV": 109.66, "PDV": 97.84, "HDVs": 124.50},
        "MMV": {"HMV": 0.54, "MWV": 1.81, "HWV": 2.35, "PDV": 4.30, "HDVs": 17.20},
        "HMV": {"MWV": 1.27, "HWV": 1.81, "PDV": 3.77, "HDVs": 18.28},
        "MWV": {"HWV": 0.54, "PDV": 2.96, "HDVs": 15.38},
        "HWV": {"PDV": 0.54, "HDVs": 14.84},
        "SV": {"SCSSV": 0.58},
        "PFSV": {"SCSSV": 121.39, "MMV": 14.08, "HMV": 13.54, "MWV": 12.73, "HWV": 12.19, "PDV": 11.24}
    }
}


def get_vm(well, test_valve, blocking_valve):
    return VM_DATA.get(well, {}).get(test_valve, {}).get(blocking_valve)

def psig_to_psia(psig):
    return float(psig) + 14.7

def degF_to_degR(temp_F):
    return float(temp_F) + 459.67

# ----------- Gas Law Constants (MUST match your integrity testing documentation) -----------
R = 1545.0        # ft-lbf / (lb-mol * °R)
P_STD = 14.696    # psia
T_STD_F = 60.0    # °F
T_STD_R = 520.0   # °R

VALVE_LIMITS = {
    "SCSSV": {"monitoring_time": 30, "critical_rate": 15},
    "MMV":   {"monitoring_time": 10, "critical_rate": 15},
    "HMV":   {"monitoring_time": 10, "critical_rate": 15},
    "MWV":   {"monitoring_time": 10, "critical_rate": 15},
    "HWV":   {"monitoring_time": 10, "critical_rate": 15},
    "SV":    {"monitoring_time": 5,  "critical_rate": 3},
    "FSV":   {"monitoring_time": 10, "critical_rate": 15}
}

# ----------- Dranchuk-Abou-Kassem Z-factor -----------
def dranchuk_abou_kassem_z(P_psia, T_F, sg=0.6):
    # Pseudo-critical properties for natural gas
    Ppc = 677 + 15 * sg - 37.5 * sg**2  # psia
    Tpc = 168 + 325 * sg - 12.5 * sg**2 # °R

    # Pseudo-reduced pressure and temperature
    Ppr = float(P_psia) / Ppc
    Tpr = float(T_F + 459.67) / Tpc

    # DAK coefficients
    A1 = 0.3265
    A2 = -1.0700
    A3 = -0.5339
    A4 = 0.01569
    A5 = -0.05165
    A6 = 0.5475
    A7 = -0.7361
    A8 = 0.1844
    A9 = 0.1056
    A10 = 0.6134
    A11 = 0.7210

    def f(Z):
        rho_r = 0.27 * Ppr / (Z * Tpr)
        F = (A1 + A2/Tpr + A3/Tpr**3 + A4/Tpr**4 + A5/Tpr**5) * rho_r \
            + (A6 + A7/Tpr + A8/Tpr**2) * rho_r**2 \
            - (A9*((A7/Tpr)+(A8/Tpr**2))) * rho_r**5 \
            + A10*(1+A11*rho_r**2)*(rho_r**2/Tpr**3)*np.exp(-A11*rho_r**2)
        return 1 + F - Z

    Z_initial = 1.0
    Z = fsolve(f, Z_initial)[0]
    return float(Z)

# ----------- Load initial test results from file -----------
valve_test_results = load_valve_test_results()

@app.route('/api/wells', methods=['GET'])
def get_wells():
    global valve_test_results, wells_data
    seen_well_ids = set()
    response_wells_data = []

    # Iterate over the wells data to ensure all defined wells are included
    for well_config_data in wells_data: 
        well_id = well_config_data['id']
        if well_id in seen_well_ids:
            continue
        seen_well_ids.add(well_id)
        
        output_well_data = dict(well_config_data)
        
        current_well_test_history_from_file = valve_test_results.get(well_id, {})
        output_well_data['valveTestResults'] = current_well_test_history_from_file

        latest_valve_test_objects_for_status = {} 
        
        for valve_id_key, tests_data_for_valve in current_well_test_history_from_file.items():
            actual_latest_test_dict = None 

            if isinstance(tests_data_for_valve, list) and tests_data_for_valve:
                last_item_in_history_list = tests_data_for_valve[-1]
                if isinstance(last_item_in_history_list, dict):
                    actual_latest_test_dict = last_item_in_history_list
                elif isinstance(last_item_in_history_list, list) and last_item_in_history_list:
                    potential_dict_inside_list = last_item_in_history_list[-1]
                    if isinstance(potential_dict_inside_list, dict):
                        actual_latest_test_dict = potential_dict_inside_list
                        print(f"DataHandling-Info: Corrected nested list for {well_id}/{valve_id_key} in /api/wells.")
                    else:
                        print(f"DataHandling-Warning: Malformed nested list for {well_id}/{valve_id_key}. Expected dict inside, got {type(potential_dict_inside_list)}.")
                else:
                    print(f"DataHandling-Warning: Last item in test history for {well_id}/{valve_id_key} is not a dict or recoverable. Type: {type(last_item_in_history_list)}.")
            elif isinstance(tests_data_for_valve, dict): 
                actual_latest_test_dict = tests_data_for_valve
                print(f"DataHandling-Info: Old data format (single dict) found for {well_id}/{valve_id_key}.")
            else:
                print(f"DataHandling-Warning: Unexpected data type for valve history of {well_id}/{valve_id_key}. Expected list or dict, got {type(tests_data_for_valve)}.")

            if actual_latest_test_dict is not None:
                if isinstance(actual_latest_test_dict, dict):
                    latest_valve_test_objects_for_status[valve_id_key] = actual_latest_test_dict
                else:
                    print(f"DataHandling-Critical: Logic to extract latest_test_dict for {well_id}/{valve_id_key} resulted in non-dict: {type(actual_latest_test_dict)}. Skipping.")
        
        output_well_data['has_pending_repair'] = any(
            not r.get('pass', True) or \
            not r.get('test_valid', True) or \
            not r.get('leak_rate_pass', True)
            for r in latest_valve_test_objects_for_status.values()
        )
        output_well_data['has_active_deviation'] = any(
            r.get('failure_reasons') 
            for r in latest_valve_test_objects_for_status.values() if isinstance(r, dict) and r.get('failure_reasons')
        )
        response_wells_data.append(output_well_data)
        
    return jsonify(response_wells_data)

# Add the missing POST endpoint for creating wells
@app.route('/api/wells/', methods=['POST'])
def create_well():
    global wells_data
    
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Validate required fields
        required_fields = ['id', 'name']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        well_id = data['id']
        
        # Check if well already exists
        if any(well['id'] == well_id for well in wells_data):
            return jsonify({"error": f"Well with ID '{well_id}' already exists"}), 400
        
        # Create new well with default values
        new_well = {
            'id': well_id,
            'name': data.get('name', well_id),
            'type': data.get('type', ''),
            'treeType': data.get('treeType', ''),
            'schematic': data.get('schematic', ''),
            'rings': data.get('rings', []),
            'metadata': data.get('metadata', ''),
            'valveTestResults': data.get('valveTestResults', {}),
            'created_at': datetime.utcnow().isoformat() + 'Z'
        }
        
        # Add to wells data
        wells_data.append(new_well)
        
        # Save to file
        save_wells_data(wells_data)
        
        print(f"Created new well: {well_id}")
        return jsonify({
            "message": f"Well '{well_id}' created successfully",
            "well": new_well
        }), 201
        
    except Exception as e:
        print(f"Error creating well: {e}")
        return jsonify({"error": "Internal server error"}), 500

# Add endpoint to update well
@app.route('/api/wells/<well_id>', methods=['PUT'])
def update_well(well_id):
    global wells_data
    
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Find the well
        well_index = None
        for i, well in enumerate(wells_data):
            if well['id'] == well_id:
                well_index = i
                break
        
        if well_index is None:
            return jsonify({"error": f"Well '{well_id}' not found"}), 404
        
        # Update well data
        updatable_fields = ['name', 'type', 'treeType', 'schematic', 'rings', 'metadata']
        for field in updatable_fields:
            if field in data:
                wells_data[well_index][field] = data[field]
        
        wells_data[well_index]['updated_at'] = datetime.utcnow().isoformat() + 'Z'
        
        # Save to file
        save_wells_data(wells_data)
        
        print(f"Updated well: {well_id}")
        return jsonify({
            "message": f"Well '{well_id}' updated successfully",
            "well": wells_data[well_index]
        }), 200
        
    except Exception as e:
        print(f"Error updating well: {e}")
        return jsonify({"error": "Internal server error"}), 500

# Add endpoint to delete well
@app.route('/api/wells/<well_id>', methods=['DELETE'])
def delete_well(well_id):
    global wells_data
    
    try:
        # Find the well
        well_index = None
        for i, well in enumerate(wells_data):
            if well['id'] == well_id:
                well_index = i
                break
        
        if well_index is None:
            return jsonify({"error": f"Well '{well_id}' not found"}), 404
        
        # Remove the well
        deleted_well = wells_data.pop(well_index)
        
        # Save to file
        save_wells_data(wells_data)
        
        print(f"Deleted well: {well_id}")
        return jsonify({
            "message": f"Well '{well_id}' deleted successfully",
            "well": deleted_well
        }), 200
        
    except Exception as e:
        print(f"Error deleting well: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/")
def home():
    return (
        "Well Integrity Test API is running. POST to /api/run_integrity_test.\n"
        "All temperature values must be provided in degrees Fahrenheit (°F)."
    )

@app.route('/api/run_integrity_test', methods=['POST'])
def run_integrity_test():
    global valve_test_results
    data = request.json
    well = data.get('Well')
    test_valve = data.get('ValveType', '').upper()
    blocking_valve = data.get('BlockingValve')

    Vm = data.get('CavityVolume')
    if not Vm:
        Vm = get_vm(well, test_valve, blocking_valve)
        if Vm is None:
            return jsonify({
                "error": f"Unable to find Vm for well '{well}', test valve '{test_valve}', blocking valve '{blocking_valve}'. Please check your input or update the Vm database."
            }), 400
    else:
        Vm = float(Vm)

    if test_valve not in VALVE_LIMITS:
        return jsonify({"error": f"Unknown ValveType '{test_valve}'. Must be one of: {list(VALVE_LIMITS.keys())}"}), 400

    required_time = VALVE_LIMITS[test_valve]['monitoring_time']
    critical_rate = VALVE_LIMITS[test_valve]['critical_rate']

    SITHP = float(data.get("SITHP", 0))
    PressureUpstreamPFSV = float(data.get("PressureUpstreamPFSV", 0))
    LiquidYield = float(data.get("LiquidYield", 0))
    k = float(data.get("k", 1.3))
    P1_psig = float(data.get('InitialPressure', 0))
    P2_psig = float(data.get('FinalPressure', P1_psig))
    T1_F = float(data.get('InitialTemperature', 60))
    T2_F = float(data.get('FinalTemperature', T1_F))
    t = float(data.get('MonitoringTime', required_time))
    sg = float(data.get('GasSG', 0.6))  # Gas specific gravity, default 0.6

    # Calculate P1 and P2 in psia
    P1 = psig_to_psia(P1_psig)
    P2 = psig_to_psia(P2_psig)

    # Calculate Z1 and Z2 using DAK unless provided
    Z1 = dranchuk_abou_kassem_z(P1, T1_F, sg)
    Z2 = dranchuk_abou_kassem_z(P2, T2_F, sg)
    
    Rgl = 1000000 / LiquidYield if LiquidYield != 0 else 0
    Vlq = Vm / Rgl if Rgl != 0 else 0
    V1 = Vm - Vlq

    T1 = degF_to_degR(T1_F)
    T2 = degF_to_degR(T2_F)

    # n1: initial moles in test cavity
    n1 = (144 * P1 * V1) / (Z1 * R * T1) if Z1 * R * T1 != 0 else 0

    Qt = critical_rate
    V2 = Qt * t  # Total standard volume of leaked gas over test duration (scf)

    # n2: max moles allowed to leak in (per equation: Z1 and T2 used, not std)
    n2 = (144 * P_STD * V2) / (Z1 * R * T2) if Z1 * R * T2 != 0 else 0

    nt = n1 + n2  # total moles allowed at end of test

    # Pa: max allowed pressure at start (using nt)
    Pa = (Z1 * nt * R * T1) / (144 * V1) if V1 != 0 else 0

    # Pc
    xc = (2 / (k + 1)) ** (k / (k - 1)) if (k + 1) != 0 and (k - 1) != 0 else 0
    if test_valve == "SCSSV":
        Pc = 0.547 * (SITHP + PressureUpstreamPFSV)
    else:
        Pc = PressureUpstreamPFSV * xc
    print(f"Pa: {Pa}, Pc: {Pc}")
    test_valid = Pa <= Pc

    # Pf: allowable final pressure at end of test
    if test_valve == "SCSSV":
        Pf = ((Qt * t * T1) / (28.45 * V1) + (P1 / Z1)) * Z2 if V1 != 0 and Z1 != 0 else 0
    else:
        Pf = (Z2 * nt * R * T2) / (144 * V1) if V1 != 0 else 0

    pass_fail = P2 <= Pf

    # Q_act: actual (computed) leak rate
    if test_valve == "SCSSV":
        try:
            Q_act = 28.45 * ((P2 / Z2 - P1 / Z1) * V1) / (t * T2)
        except ZeroDivisionError:
            Q_act = 0
    else:
        try:
            Q_act = (T_STD_R * V1) / (P_STD * t) * ((Z1 * P2) / (Z2 * T2) - (P1 / T1))
        except ZeroDivisionError:
            Q_act = 0

    leak_rate_pass = Q_act <= critical_rate

    failure_reasons = []
    if not test_valid:
        failure_reasons.append("Test setup invalid (Pa > Pc)")
    if not pass_fail:
        failure_reasons.append("Internal leakage fail (P2 > Pf)")
    if not leak_rate_pass:
        failure_reasons.append("Leak rate exceeds allowable maximum (Q_act > critical_rate)")

    result = {
        "leak_rate_scfm": Q_act,
        "pass": pass_fail,
        "test_valid": test_valid,
        "leak_rate_pass": leak_rate_pass,
        "failure_reasons": failure_reasons,
        "limits": {
            "monitoring_time_min": required_time,
            "critical_rate_scfm": critical_rate
        },
        "thresholds": {
            "Pf": Pf,
            "P2": P2,
            "Pa": Pa,
            "Pc": Pc,
            "xc": xc
        },
        "inputs": {
            "Well": well,
            "ValveType": test_valve,
            "BlockingValve": blocking_valve,
            "InitialPressure_psig": P1_psig,
            "FinalPressure_psig": P2_psig,
            "InitialTemperature_F": T1_F,
            "FinalTemperature_F": T2_F,
            "CavityVolume_ft3": Vm,
            "GasVoidVolume_ft3": V1,
            "MonitoringTime_min": t,
            "Z1": Z1,
            "Z2": Z2,
            "LiquidYield": LiquidYield,
            "SITHP_psig": SITHP,
            "PressureUpstreamPFSV_psig": PressureUpstreamPFSV,
            "k": k,
            "GasSG": sg
        },
        "intermediate": {
            "GasLiquidRatio_scf_per_STB": Rgl,
            "LiquidVolume_ft3": Vlq,
            "n1": n1,
            "n2": n2,
            "nt": nt,
            "V2": V2
        },
        "constants": {
            "P_STD_psia": P_STD,
            "T_STD_F": T_STD_F,
            "T_STD_R": T_STD_R,
            "GasConstant_R": R
        }
    }
    if well and test_valve:
        if well not in valve_test_results:
            valve_test_results[well] = {}
        valve_test_results[well][test_valve] = result
        save_valve_test_results(valve_test_results)
    return jsonify(result)

# Add this global variable near your other globals
deleted_valve_test_results = {}  # Structure: {wellId: {valveId: [deleted_test_objects]}}

def load_deleted_valve_test_results():
    """Load deleted test results from JSON file"""
    global deleted_valve_test_results
    try:
        if os.path.exists('deleted_valve_test_results.json'):
            with open('deleted_valve_test_results.json', 'r') as f:
                deleted_valve_test_results = json.load(f)
                print(f"Loaded deleted valve test results: {len(deleted_valve_test_results)} wells")
        else:
            deleted_valve_test_results = {}
            print("No deleted valve test results file found, starting fresh")
    except Exception as e:
        print(f"Error loading deleted valve test results: {e}")
        deleted_valve_test_results = {}

def save_deleted_valve_test_results():
    """Save deleted test results to JSON file"""
    try:
        with open('deleted_valve_test_results.json', 'w') as f:
            json.dump(deleted_valve_test_results, f, indent=2)
        print("Deleted valve test results saved successfully")
    except Exception as e:
        print(f"Error saving deleted valve test results: {e}")

# Add this to your app initialization (after load_valve_test_results())
load_deleted_valve_test_results()

@app.route('/api/delete_valve_test', methods=['POST'])
def delete_valve_test():
    """Delete a test from active results but store it in deleted results"""
    global valve_test_results, deleted_valve_test_results
    
    data = request.json
    well_id = data.get('wellId')
    valve_id = data.get('valveId')
    test_index = data.get('testIndex')  # If None, delete all tests for the valve
    deleted_by = data.get('deletedBy', 'Unknown')
    
    if not well_id or not valve_id:
        return jsonify({"error": "Well ID and Valve ID are required"}), 400
    
    if well_id not in valve_test_results:
        return jsonify({"error": "Well not found"}), 404
    
    if valve_id not in valve_test_results[well_id]:
        return jsonify({"error": "Valve not found in well"}), 404
    
    tests_array = valve_test_results[well_id][valve_id]
    
    if not isinstance(tests_array, list):
        # Handle old format - convert to array first
        tests_array = [tests_array] if tests_array else []
        valve_test_results[well_id][valve_id] = tests_array
    
    if len(tests_array) == 0:
        return jsonify({"error": "No tests found to delete"}), 404
    
    # Initialize deleted results structure
    if well_id not in deleted_valve_test_results:
        deleted_valve_test_results[well_id] = {}
    if valve_id not in deleted_valve_test_results[well_id]:
        deleted_valve_test_results[well_id][valve_id] = []
    
    deleted_tests = []
    deletion_timestamp = datetime.utcnow().isoformat() + 'Z'
    
    if test_index is None:
        # Delete all tests
        for test in tests_array:
            deleted_test = dict(test)  # Copy the test
            deleted_test['deletion_info'] = {
                'deleted_at': deletion_timestamp,
                'deleted_by': deleted_by,
                'deletion_reason': 'Manual deletion - all tests for valve'
            }
            deleted_tests.append(deleted_test)
        
        # Move all tests to deleted
        deleted_valve_test_results[well_id][valve_id].extend(deleted_tests)
        valve_test_results[well_id][valve_id] = []
        
        message = f"All {len(deleted_tests)} tests for valve {valve_id} on well {well_id} deleted successfully."
    else:
        # Delete specific test
        if test_index < 0 or test_index >= len(tests_array):
            return jsonify({"error": "Invalid test index"}), 400
        
        test_to_delete = tests_array[test_index]
        deleted_test = dict(test_to_delete)  # Copy the test
        deleted_test['deletion_info'] = {
            'deleted_at': deletion_timestamp,
            'deleted_by': deleted_by,
            'deletion_reason': f'Manual deletion - test index {test_index}'
        }
        
        # Move test to deleted
        deleted_valve_test_results[well_id][valve_id].append(deleted_test)
        tests_array.pop(test_index)
        deleted_tests.append(deleted_test)
        
        message = f"Test {test_index} for valve {valve_id} on well {well_id} deleted successfully."
    
    # Save both files
    save_valve_test_results(valve_test_results)
    save_deleted_valve_test_results()
    
    return jsonify({
        "message": message,
        "deleted_count": len(deleted_tests),
        "remaining_count": len(valve_test_results[well_id][valve_id])
    }), 200

@app.route('/api/deleted_valve_tests', methods=['GET'])
def get_deleted_valve_tests():
    """Get deleted test results for audit purposes"""
    well_id = request.args.get('well')
    valve_id = request.args.get('valve')
    
    if well_id and valve_id:
        # Get deleted tests for specific well and valve
        if well_id in deleted_valve_test_results and valve_id in deleted_valve_test_results[well_id]:
            return jsonify({
                "well_id": well_id,
                "valve_id": valve_id,
                "deleted_tests": deleted_valve_test_results[well_id][valve_id]
            })
        else:
            return jsonify({
                "well_id": well_id,
                "valve_id": valve_id,
                "deleted_tests": []
            })
    elif well_id:
        # Get all deleted tests for a specific well
        return jsonify({
            "well_id": well_id,
            "deleted_tests": deleted_valve_test_results.get(well_id, {})
        })
    else:
        # Get all deleted tests
        return jsonify(deleted_valve_test_results)

@app.route('/api/restore_valve_test', methods=['POST'])
def restore_valve_test():
    """Restore a deleted test back to active results"""
    global valve_test_results, deleted_valve_test_results
    
    data = request.json
    well_id = data.get('wellId')
    valve_id = data.get('valveId')
    deleted_test_index = data.get('deletedTestIndex')
    restored_by = data.get('restoredBy', 'Unknown')
    
    if not well_id or not valve_id or deleted_test_index is None:
        return jsonify({"error": "Well ID, Valve ID, and deleted test index are required"}), 400
    
    if (well_id not in deleted_valve_test_results or 
        valve_id not in deleted_valve_test_results[well_id] or
        deleted_test_index >= len(deleted_valve_test_results[well_id][valve_id])):
        return jsonify({"error": "Deleted test not found"}), 404
    
    # Get the deleted test
    deleted_test = deleted_valve_test_results[well_id][valve_id][deleted_test_index]
    
    # Remove deletion info and add restoration info
    restored_test = dict(deleted_test)
    if 'deletion_info' in restored_test:
        del restored_test['deletion_info']
    
    restored_test['restoration_info'] = {
        'restored_at': datetime.utcnow().isoformat() + 'Z',
        'restored_by': restored_by,
        'restoration_reason': 'Manual restoration'
    }
    
    # Initialize active results if needed
    if well_id not in valve_test_results:
        valve_test_results[well_id] = {}
    if valve_id not in valve_test_results[well_id]:
        valve_test_results[well_id][valve_id] = []
    
    # Move test back to active
    valve_test_results[well_id][valve_id].append(restored_test)
    deleted_valve_test_results[well_id][valve_id].pop(deleted_test_index)
    
    # Save both files
    save_valve_test_results(valve_test_results)
    save_deleted_valve_test_results()
    
    return jsonify({
        "message": f"Test for valve {valve_id} on well {well_id} restored successfully."
    }), 200

@app.route('/api/valid_blocking_valves', methods=['GET'])
def get_valid_blocking_valves():
    well = request.args.get('well')
    test_valve = request.args.get('valve')
    if not well or not test_valve:
        return jsonify({"blocking_valves": []})
    blocking_valves = list(VM_DATA.get(well, {}).get(test_valve, {}).keys())
    return jsonify({"blocking_valves": blocking_valves})

@app.route('/api/clear_valve_test_result', methods=['POST'])
def clear_valve_test_result():
    global valve_test_results
    data = request.json
    well_id = data.get('wellId')
    valve_id = data.get('valveId')
    if not well_id or not valve_id:
        return jsonify({"error": "Well ID and Valve ID are required"}), 400
    if well_id in valve_test_results and valve_id in valve_test_results.get(well_id, {}):
        del valve_test_results[well_id][valve_id]
        if not valve_test_results[well_id]:
            del valve_test_results[well_id]
        save_valve_test_results(valve_test_results)
        return jsonify({"message": f"Test result for valve {valve_id} on well {well_id} cleared successfully."}), 200
    else:
        return jsonify({"error": "Test result not found"}), 404

if __name__ == '__main__':
    app.run(debug=True)