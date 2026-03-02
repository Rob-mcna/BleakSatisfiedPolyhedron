# app/routes/well_integrity_test_routes.py
# -*- coding: utf-8 -*-

from flask import Blueprint, jsonify, request

from app.controllers.well_integrity_test_controller import (
    blocking_valve,
    give_integrity_test,
    integrity_test,
    give_integrity_test_failure,
    save_test_failure,
    save_test_failure_action,
    update_test_failure_action,
    give_test_failure_action,
)

# This blueprint is registered in create_app() with:
# app.register_blueprint(integrity_teste_bp, url_prefix="/api/integrity_test")
#
# So:
#   "/"           → /api/integrity_test/
#   "/failure"    → /api/integrity_test/failure
#   "/action"     → /api/integrity_test/action
#   "/blocking_valve" → /api/integrity_test/blocking_valve
#   "/valid_blocking_valves" → /api/integrity_test/valid_blocking_valves

integrity_teste_bp = Blueprint("integrity_test", __name__)

# ---------------------------------------------------------------------------
# Blocking valve helpers
# ---------------------------------------------------------------------------

@integrity_teste_bp.route("/blocking_valve", methods=["GET"])
def get_blocking_valve():
    """
    GET /api/integrity_test/blocking_valve?well=<well_id>&valve=<valve_id>
    Raw helper endpoint that returns whatever blocking_valve() returns.
    """
    well_id = request.args.get("well")
    valve_id = request.args.get("valve")
    return jsonify(blocking_valve(well_id, valve_id))

@integrity_teste_bp.route("/valid_blocking_valves", methods=["GET"])
def get_valid_blocking_valves():
    """
    GET /api/integrity_test/valid_blocking_valves?well=<well_id>&valve=<valve_id>

    Returns a normalized structure for the frontend dropdown:
      { "blocking_valves": [ "HWV", "MMV", ... ] }
    """
    well_id = request.args.get("well")
    valve_id = request.args.get("valve")

    raw = blocking_valve(well_id, valve_id)

    if raw is None:
        vals = []
    elif isinstance(raw, (list, tuple, set)):
        vals = list(raw)
    else:
        vals = [raw]

    return jsonify({"blocking_valves": vals})

# ---------------------------------------------------------------------------
# Integrity test: GET existing result, POST new test
# ---------------------------------------------------------------------------

@integrity_teste_bp.route("/", methods=["GET"])
def get_integrity_test():
    """
    GET /api/integrity_test/?well=<well_id>&valve=<valve_id>

    Used by the dashboard (fetchValveTestResults) to read saved test results.
    """
    well_id = request.args.get("well")
    valve_id = request.args.get("valve")
    return jsonify(give_integrity_test(well_id, valve_id))

@integrity_teste_bp.route("/", methods=["POST"])
def post_integrity_test():
    """
    POST /api/integrity_test/

    Body: JSON payload from the frontend valve test form.
    This runs the test and stores the result.
    """
    data = request.get_json(silent=True) or {}
    return jsonify(integrity_test(data))

# ---------------------------------------------------------------------------
# Test failure records (for failed integrity tests)
# ---------------------------------------------------------------------------

@integrity_teste_bp.route("/failure", methods=["POST"])
def post_integrity_failure():
    """
    POST /api/integrity_test/failure?well=<well_id>&valve=<valve_id>

    Body: JSON describing the failure, sent when a test fails.
    """
    well_id = request.args.get("well")
    valve_id = request.args.get("valve")
    data = request.get_json(silent=True) or {}
    return jsonify(save_test_failure(well_id, valve_id, data))

@integrity_teste_bp.route("/failure", methods=["GET"])
def get_integrity_test_failure():
    """
    GET /api/integrity_test/failure?well=<well_id>&valve=<valve_id>

    Returns failure information for a given well+valve pair.
    """
    well_id = request.args.get("well")
    valve_id = request.args.get("valve")
    return jsonify(give_integrity_test_failure(well_id, valve_id))
@integrity_teste_bp.route("/results", methods=["GET"])
def get_integrity_results_for_well():
    """
    GET /api/integrity_test/results?well=<well_id>

    Returns all integrity-test results for a given well.
    The implementation of give_integrity_test_for_well must be in your controller.
    """
    well_id = request.args.get("well")
    # You need to implement this in your controller:
    # from app.controllers.well_integrity_test_controller import give_integrity_test_for_well
    from app.controllers.well_integrity_test_controller import give_integrity_test_for_well
    return jsonify(give_integrity_test_for_well(well_id))
# ---------------------------------------------------------------------------
# Actions taken on failures
# ---------------------------------------------------------------------------

@integrity_teste_bp.route("/action", methods=["POST"])
def post_integrity_failure_action():
    """
    POST /api/integrity_test/action?id=<failure_id>

    Body: JSON describing an action taken to address the failure.
    """
    failure_id = request.args.get("id")
    data = request.get_json(silent=True) or {}
    return jsonify(save_test_failure_action(failure_id, data))

@integrity_teste_bp.route("/action/<string:failure_id>", methods=["PUT"])
def put_integrity_failure_action(failure_id):
    """
    PUT /api/integrity_test/action/<failure_id>

    Updates an existing failure-action record.
    """
    data = request.get_json(silent=True) or {}
    return jsonify(update_test_failure_action(failure_id, data))

@integrity_teste_bp.route("/action/<string:failure_id>", methods=["GET"])
def get_integrity_failure_action(failure_id):
    """
    GET /api/integrity_test/action/<failure_id>

    Returns a specific failure-action record.
    """
    return jsonify(give_test_failure_action(failure_id))



@integrity_teste_bp.route("/results", methods=["GET"])
def get_integrity_results_for_well():
    """
    GET /api/integrity_test/results?well=<well_id>

    Returns all integrity-test results for a given well.
    This matches the frontend call:
      /api/integrity_test/results?well=${wellId}
    """
    well_id = request.args.get("well")
    if not well_id:
        return jsonify({"Error": "Missing well parameter"}), 400

    # Query all results for this well, join to get valve name
    results = (
        InegrityTestResult.query
        .join(Valve, Valve.id == InegrityTestResult.test_valve_id)
        .filter(InegrityTestResult.test_well_id == well_id)
        .all()
    )

    out = []
    for r in results:
        out.append({
            "valveId": r.test_valve_id,
            "valveName": r.blocking_valve.name if r.blocking_valve else None,
            "monitoringTime": r.monitoring_time,
            "criticalRate": r.critical_rate,
            "initialPressure": r.initial_pressure,
            "finalPressure": r.final_pressure,
            "initialTemperature": r.initial_temperature,
            "finalTemperature": r.final_temperature,
            "leakRate": r.leak_rate,
            "sithp": r.sithp,
            "liquid_yield": r.liquid_yield,
            "status": r.status,
        })

    return jsonify(out)

def give_integrity_test_for_well(well_id: str):
    """
    Return all integrity test results for a given well_id.
    This is pseudocode – adapt to your ORM.
    """
    # Example with SQLAlchemy model InegrityTestResult:
    from app.models.integrity_test_result import InegrityTestResult

    if not well_id:
        return {"error": "Missing well parameter"}

    results = (
        InegrityTestResult.query
        .filter_by(well_id=well_id)
        .all()
    )

    return [r.to_dict() for r in results]






@integrity_teste_bp.route("/results", methods=["GET"])
def get_integrity_results_for_well():
    """
    GET /api/integrity_test/results?well=<well_id>

    Returns all integrity-test results for the given well in the format
    the frontend expects:

      {
        "<valveId>": [  // array of test runs for this valve
          {
            leak_rate_scfm: ...,
            limits: { monitoring_time_min, critical_rate_scfm },
            thresholds: { Pa, Pc, Pf, P2, xc },
            inputs: { Well, ValveType, BlockingValve, ... },
            status: "pass" | "fail",
            ...
          },
          ...
        ],
        ...
      }
    """
    well_id = request.args.get("well")
    if not well_id:
        return jsonify({"Error": "Missing well parameter"}), 400

    # Load all test results for this well
    results = (
        InegrityTestResult.query
        .options(
            db.joinedload(InegrityTestResult.blocking_valve),
            db.joinedload(InegrityTestResult.test_valve),
            db.joinedload(InegrityTestResult.test_well),
        )
        .filter(InegrityTestResult.test_well_id == well_id)
        .all()
    )

    out = {}

    for r in results:
        valve_id = str(r.test_valve_id)

        # Build an object that matches what integrity_test() returns
        # so validateTestOnFrontend can work without changes.
        final_pressure_psia = psig_to_psia(r.final_pressure)

        test_obj = {
            # Main result fields
            "leak_rate_scfm": r.leak_rate,
            "leak_rate_pass": (r.leak_rate is not None and r.critical_rate is not None
                               and r.leak_rate <= r.critical_rate),
            "failure_reasons": [],  # can be filled on frontend

            # Limits section
            "limits": {
                "monitoring_time_min": r.monitoring_time,
                "critical_rate_scfm": r.critical_rate,
            },

            # Thresholds section (Pc, Pa, Pf, P2 etc)
            "thresholds": {
                "Pf": r.pressure_final_condition,      # allowed final pressure
                "P2": final_pressure_psia,             # actual final pressure in psia
                "Pa": r.allowable_test_starting,       # allowed starting pressure
                "Pc": r.critical_pressure_cavity,      # critical pressure
                "xc": r.critical_pressure_ratio,       # critical ratio
            },

            # Inputs section (used in UI + export)
            "inputs": {
                "Well": r.test_well.name if r.test_well else None,
                "ValveType": r.test_valve.name if r.test_valve else None,
                "BlockingValve": (
                    r.blocking_valve.name if r.blocking_valve else None
                ),
                "InitialPressure_psig": r.initial_pressure,
                "FinalPressure_psig": r.final_pressure,
                "InitialTemperature_F": r.initial_temperature,
                "FinalTemperature_F": r.final_temperature,
                "MonitoringTime_min": r.monitoring_time,
                "LiquidYield": r.liquid_yield,
                "SITHP_psig": r.sithp,
                "specificHeatRatio": r.specific_heat_ratio,
                "GasSG": r.gas_specific_gravity,
                "timestamp": (
                    r.updated_at or r.created_at
                ),
            },

            # Status for coloring
            "status": r.status,  # "pass" / "fail" as you already store

            # Optional: echo a few more DB fields if useful in frontend/debug
            "monitoringTime": r.monitoring_time,
            "criticalRate": r.critical_rate,
        }

        # Group by valveId, as the frontend expects
        out.setdefault(valve_id, []).append(test_obj)

    return jsonify(out)


--- Fetch Complete ---
dashboard.js:341 Valves with valid test data: 0
dashboard.js:342 Valves skipped (invalid/no data): 0
dashboard.js:343 Valves with valid test data (window.valveTestResults): {}
dashboard.js:344 Valves with no/invalid data (window.valvesWithNoData): {}
dashboard.js:1404 Dashboard: Well data and valve test results fetched successfully.
dashboard.js:518 Deduplicated wells: 17 → 17
dashboard.js:518 Deduplicated wells: 17 → 17
dashboard.js:518 Deduplicated wells: 17 → 17
dashboard.js:518 Deduplicated wells: 17 → 17
render_functions.js:184 Starting to render schematic for well 05b0eba6-126d-4e23-89d9-679c40969b0a
render_functions.js:128 Loading valve test results for well 05b0eba6-126d-4e23-89d9-679c40969b0a
render_functions.js:141 Fetching test results from API for well 05b0eba6-126d-4e23-89d9-679c40969b0a
safety_system.js:237 Dashboard filter changed to: safety-system
dashboard.js:518 Deduplicated wells: 17 → 17
dashboard.js:518 Deduplicated wells: 17 → 17
dashboard.js:518 Deduplicated wells: 17 → 17
render_functions.js:149 Fetched test results for well 05b0eba6-126d-4e23-89d9-679c40969b0a: (9) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
wellsection.js:420 Validating test with data: {criticalRate: 15, finalPressure: 1, finalTemperature: 114, initialPressure: 0, initialTemperature: 117, …}
wellsection.js:421 Using valve limits: {critical_rate: 15}
wellsection.js:494 Test validation result: pass=true, status=pass {criticalRate: 15, finalPressure: 1, finalTemperature: 114, initialPressure: 0, initialTemperature: 117, …}
wellsection.js:420 Validating test with data: {criticalRate: 15, finalPressure: 3, finalTemperature: 91, initialPressure: 1, initialTemperature: 92, …}
wellsection.js:421 Using valve limits: {critical_rate: 15}
wellsection.js:494 Test validation result: pass=true, status=pass {criticalRate: 15, finalPressure: 3, finalTemperature: 91, initialPressure: 1, initialTemperature: 92, …}
wellsection.js:420 Validating test with data: {criticalRate: 15, finalPressure: 14, finalTemperature: 117, initialPressure: 0, initialTemperature: 126, …}
wellsection.js:421 Using valve limits: {critical_rate: 15}
wellsection.js:494 Test validation result: pass=true, status=pass {criticalRate: 15, finalPressure: 14, finalTemperature: 117, initialPressure: 0, initialTemperature: 126, …}
wellsection.js:420 Validating test with data: {criticalRate: 15, finalPressure: 26, finalTemperature: 126, initialPressure: 0, initialTemperature: 129, …}
wellsection.js:421 Using valve limits: {critical_rate: 15}
wellsection.js:494 Test validation result: pass=true, status=pass {criticalRate: 15, finalPressure: 26, finalTemperature: 126, initialPressure: 0, initialTemperature: 129, …}
wellsection.js:420 Validating test with data: {criticalRate: 15, finalPressure: 34, finalTemperature: 129, initialPressure: 0, initialTemperature: 137, …}
wellsection.js:421 Using valve limits: {critical_rate: 15}
wellsection.js:494 Test validation result: pass=true, status=pass {criticalRate: 15, finalPressure: 34, finalTemperature: 129, initialPressure: 0, initialTemperature: 137, …}
wellsection.js:420 Validating test with data: {criticalRate: 3, finalPressure: 4, finalTemperature: 129, initialPressure: 0, initialTemperature: 137, …}
wellsection.js:421 Using valve limits: {critical_rate: 3}
wellsection.js:494 Test validation result: pass=true, status=pass {criticalRate: 3, finalPressure: 4, finalTemperature: 129, initialPressure: 0, initialTemperature: 137, …}
wellsection.js:420 Validating test with data: {criticalRate: 15, finalPressure: 1, finalTemperature: 114, initialPressure: 0, initialTemperature: 117, …}
wellsection.js:421 Using valve limits: {critical_rate: 15}
wellsection.js:494 Test validation result: pass=true, status=pass {criticalRate: 15, finalPressure: 1, finalTemperature: 114, initialPressure: 0, initialTemperature: 117, …}
wellsection.js:420 Validating test with data: {criticalRate: 15, finalPressure: 12, finalTemperature: 90, initialPressure: 5, initialTemperature: 90, …}
wellsection.js:421 Using valve limits: {critical_rate: 15}
wellsection.js:494 Test validation result: pass=true, status=pass {criticalRate: 15, finalPressure: 12, finalTemperature: 90, initialPressure: 5, initialTemperature: 90, …}
wellsection.js:420 Validating test with data: {criticalRate: 15, finalPressure: 748, finalTemperature: 90, initialPressure: 540, initialTemperature: 90, …}
wellsection.js:421 Using valve limits: {critical_rate: 15}
wellsection.js:494 Test validation result: pass=false, status=fail {criticalRate: 15, finalPressure: 748, finalTemperature: 90, initialPressure: 540, initialTemperature: 90, …}
render_functions.js:168 Successfully loaded and validated test results for well 05b0eba6-126d-4e23-89d9-679c40969b0a {0: {…}, 1: {…}, 2: {…}, 3: {…}, 4: {…}, 5: {…}, 6: {…}, 7: {…}, 8: {…}}
render_functions.js:149 Fetched test results for well 05b0eba6-126d-4e23-89d9-679c40969b0a: (9) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
wellsection.js:420 Validating test with data: {criticalRate: 15, finalPressure: 1, finalTemperature: 114, initialPressure: 0, initialTemperature: 117, …}
wellsection.js:421 Using valve limits: {critical_rate: 15}
wellsection.js:494 Test validation result: pass=true, status=pass {criticalRate: 15, finalPressure: 1, finalTemperature: 114, initialPressure: 0, initialTemperature: 117, …}
wellsection.js:420 Validating test with data: {criticalRate: 15, finalPressure: 3, finalTemperature: 91, initialPressure: 1, initialTemperature: 92, …}criticalRate: 15finalPressure: 3finalTemperature: 91initialPressure: 1initialTemperature: 92leakRate: 0.2355371944929222liquid_yield: 31monitoringTime: 30sithp: 748status: "pass"valveId: "4169ca77-9463-4df1-9393-9114ef664ae2"valveName: "HBV"[[Prototype]]: Object
wellsection.js:421 Using valve limits: {critical_rate: 15}
wellsection.js:494 Test validation result: pass=true, status=pass {criticalRate: 15, finalPressure: 3, finalTemperature: 91, initialPressure: 1, initialTemperature: 92, …}P2: 0Pa: 0Pc: 0Pf: 0criticalRate: 15failure_reasons: []finalPressure: 3finalTemperature: 91initialPressure: 1initialTemperature: 92inputs: {}leakRate: 0.2355371944929222leak_rate_pass: trueliquid_yield: 31monitoringTime: 30pass: truesithp: 748status: "pass"test_valid: truethresholds: {}valveId: "4169ca77-9463-4df1-9393-9114ef664ae2"valveName: "HBV"[[Prototype]]: Object
wellsection.js:420 Validating test with data: {criticalRate: 15, finalPressure: 14, finalTemperature: 117, initialPressure: 0, initialTemperature: 126, …}
wellsection.js:421 Using valve limits: {critical_rate: 15}
wellsection.js:494 Test validation result: pass=true, status=pass {criticalRate: 15, finalPressure: 14, finalTemperature: 117, initialPressure: 0, initialTemperature: 126, …}
wellsection.js:420 Validating test with data: {criticalRate: 15, finalPressure: 26, finalTemperature: 126, initialPressure: 0, initialTemperature: 129, …}
wellsection.js:421 Using valve limits: {critical_rate: 15}
wellsection.js:494 Test validation result: pass=true, status=pass {criticalRate: 15, finalPressure: 26, finalTemperature: 126, initialPressure: 0, initialTemperature: 129, …}
wellsection.js:420 Validating test with data: {criticalRate: 15, finalPressure: 34, finalTemperature: 129, initialPressure: 0, initialTemperature: 137, …}
wellsection.js:421 Using valve limits: {critical_rate: 15}
wellsection.js:494 Test validation result: pass=true, status=pass {criticalRate: 15, finalPressure: 34, finalTemperature: 129, initialPressure: 0, initialTemperature: 137, …}
wellsection.js:420 Validating test with data: {criticalRate: 3, finalPressure: 4, finalTemperature: 129, initialPressure: 0, initialTemperature: 137, …}
wellsection.js:421 Using valve limits: {critical_rate: 3}
wellsection.js:494 Test validation result: pass=true, status=pass {criticalRate: 3, finalPressure: 4, finalTemperature: 129, initialPressure: 0, initialTemperature: 137, …}
wellsection.js:420 Validating test with data: {criticalRate: 15, finalPressure: 1, finalTemperature: 114, initialPressure: 0, initialTemperature: 117, …}
wellsection.js:421 Using valve limits: {critical_rate: 15}
wellsection.js:494 Test validation result: pass=true, status=pass {criticalRate: 15, finalPressure: 1, finalTemperature: 114, initialPressure: 0, initialTemperature: 117, …}
wellsection.js:420 Validating test with data: {criticalRate: 15, finalPressure: 12, finalTemperature: 90, initialPressure: 5, initialTemperature: 90, …}
wellsection.js:421 Using valve limits: {critical_rate: 15}
wellsection.js:494 Test validation result: pass=true, status=pass {criticalRate: 15, finalPressure: 12, finalTemperature: 90, initialPressure: 5, initialTemperature: 90, …}
wellsection.js:420 Validating test with data: {criticalRate: 15, finalPressure: 748, finalTemperature: 90, initialPressure: 540, initialTemperature: 90, …}
wellsection.js:421 Using valve limits: {critical_rate: 15}
wellsection.js:494 Test validation result: pass=false, status=fail {criticalRate: 15, finalPressure: 748, finalTemperature: 90, initialPressure: 540, initialTemperature: 90, …}
render_functions.js:168 Successfully loaded and validated test results for well 05b0eba6-126d-4e23-89d9-679c40969b0a {0: {…}, 1: {…}, 2: {…}, 3: {…}, 4: {…}, 5: {…}, 6: {…}, 7: {…}, 8: {…}}
render_functions.js:238 Available test results for well: 05b0eba6-126d-4e23-89d9-679c40969b0a
render_functions.js:239 By ID: {0: {…}, 1: {…}, 2: {…}, 3: {…}, 4: {…}, 5: {…}, 6: {…}, 7: {…}, 8: {…}}
render_functions.js:240 By name: {0: {…}, 1: {…}, 2: {…}, 3: {…}, 4: {…}, 5: {…}, 6: {…}, 7: {…}, 8: {…}}
render_functions.js:238 Available test results for well: 05b0eba6-126d-4e23-89d9-679c40969b0a
render_functions.js:239 By ID: {0: {…}, 1: {…}, 2: {…}, 3: {…}, 4: {…}, 5: {…}, 6: {…}, 7: {…}, 8: {…}}
render_functions.js:240 By name: {0: {…}, 1: {…}, 2: {…}, 3: {…}, 4: {…}, 5: {…}, 6: {…}, 7: {…}, 8: {…}}
render_functions.js:238 Available test results for well: 05b0eba6-126d-4e23-89d9-679c40969b0a
render_functions.js:239 By ID: {0: {…}, 1: {…}, 2: {…}, 3: {…}, 4: {…}, 5: {…}, 6: {…}, 7: {…}, 8: {…}}
render_functions.js:240 By name: {0: {…}, 1: {…}, 2: {…}, 3: {…}, 4: {…}, 5: {…}, 6: {…}, 7: {…}, 8: {…}}
render_functions.js:245 Processing SVG elements for valve coloring
render_functions.js:257 Checking test status for valve: TC (4f58a31a-f017-4065-9d54-dda9b75061b4)
render_functions.js:285 No test results found for TC
render_functions.js:291 Set color #e6c23a for valve TC
render_functions.js:257 Checking test status for valve: 2SV (e78e3951-f2ad-4d6a-9415-21d68eee27af)
render_functions.js:285 No test results found for 2SV
render_functions.js:291 Set color #e6c23a for valve 2SV
render_functions.js:257 Checking test status for valve: SV (dda5652d-3dd9-4602-b627-037ee1f45332)
render_functions.js:285 No test results found for SV
render_functions.js:291 Set color #e6c23a for valve SV
render_functions.js:257 Checking test status for valve: MWV (37c31fcb-6dba-4c4c-a3b0-3b850addc048)
render_functions.js:285 No test results found for MWV
render_functions.js:291 Set color #e6c23a for valve MWV
render_functions.js:257 Checking test status for valve: HWV (f3d31658-f4e8-443a-bd7c-86bccddc376f)
render_functions.js:285 No test results found for HWV
render_functions.js:291 Set color #e6c23a for valve HWV
render_functions.js:257 Checking test status for valve: HMV (16859638-e5b3-4f46-ad5b-d7001c1c22fe)
render_functions.js:285 No test results found for HMV
render_functions.js:291 Set color #e6c23a for valve HMV
render_functions.js:257 Checking test status for valve: MMV (fd977c5a-f37b-48cb-9fe3-17d3ddb341b4)
render_functions.js:285 No test results found for MMV
render_functions.js:291 Set color #e6c23a for valve MMV
render_functions.js:257 Checking test status for valve: SCSSV (4169ca77-9463-4df1-9393-9114ef664ae2)
render_functions.js:285 No test results found for SCSSV
render_functions.js:291 Set color #e6c23a for valve SCSSV
render_functions.js:257 Checking test status for valve: IDV (a1826e4d-1944-4bcf-b385-e62735114d5e)
render_functions.js:285 No test results found for IDV
render_functions.js:291 Set color #e6c23a for valve IDV
render_functions.js:257 Checking test status for valve: IFSV (30e0ecca-525c-4e5a-8bd9-36b2fdc4e565)
render_functions.js:285 No test results found for IFSV
render_functions.js:291 Set color #e6c23a for valve IFSV
render_functions.js:257 Checking test status for valve: IHDV (bea86a63-2596-4a3b-afba-463a8ff0e14a)
render_functions.js:285 No test results found for IHDV
render_functions.js:291 Set color #e6c23a for valve IHDV
render_functions.js:257 Checking test status for valve: PDV (ea9cbde3-3736-4952-ab5c-53cdb9b09ecb)
render_functions.js:285 No test results found for PDV
render_functions.js:291 Set color #e6c23a for valve PDV
render_functions.js:257 Checking test status for valve: Choke (418c4e02-81c1-4627-a1e8-b53decb1f79d)
render_functions.js:285 No test results found for Choke
render_functions.js:257 Checking test status for valve: PFSV (54ad2f19-fef7-4127-aa1a-d2c012b20daf)
render_functions.js:285 No test results found for PFSV
render_functions.js:291 Set color #e6c23a for valve PFSV
render_functions.js:257 Checking test status for valve: HBV (1eeba76c-9e76-4dd9-9b2a-2a41b245e0c6)
render_functions.js:285 No test results found for HBV
render_functions.js:291 Set color #e6c23a for valve HBV
render_functions.js:257 Checking test status for valve: Test Sep HDV (8c53d095-6dcb-4b47-b16a-10b7fc25a5b7)
render_functions.js:285 No test results found for Test Sep HDV
render_functions.js:291 Set color #e6c23a for valve Test Sep HDV
render_functions.js:257 Checking test status for valve: D Sep HDV (44dbc005-518b-436c-9ddf-ca28c9a7f2f8)
render_functions.js:285 No test results found for D Sep HDV
render_functions.js:291 Set color #e6c23a for valve D Sep HDV
render_functions.js:257 Checking test status for valve: B Sep HDV (5f6b7ed9-3054-4f3b-bb0f-2e0b78f8084e)
render_functions.js:285 No test results found for B Sep HDV
render_functions.js:291 Set color #e6c23a for valve B Sep HDV
render_functions.js:257 Checking test status for valve: FHDV (76ea7bf5-2071-4a8b-8366-02c4f72e3a2e)
render_functions.js:285 No test results found for FHDV
render_functions.js:245 Processing SVG elements for valve coloring
render_functions.js:257 Checking test status for valve: TC (4f58a31a-f017-4065-9d54-dda9b75061b4)
render_functions.js:285 No test results found for TC
render_functions.js:291 Set color #e6c23a for valve TC
render_functions.js:257 Checking test status for valve: 2SV (e78e3951-f2ad-4d6a-9415-21d68eee27af)
render_functions.js:285 No test results found for 2SV
render_functions.js:291 Set color #e6c23a for valve 2SV
render_functions.js:257 Checking test status for valve: SV (dda5652d-3dd9-4602-b627-037ee1f45332)
render_functions.js:285 No test results found for SV
render_functions.js:291 Set color #e6c23a for valve SV
render_functions.js:257 Checking test status for valve: MWV (37c31fcb-6dba-4c4c-a3b0-3b850addc048)
render_functions.js:285 No test results found for MWV
render_functions.js:291 Set color #e6c23a for valve MWV
render_functions.js:257 Checking test status for valve: HWV (f3d31658-f4e8-443a-bd7c-86bccddc376f)
render_functions.js:285 No test results found for HWV
render_functions.js:291 Set color #e6c23a for valve HWV
render_functions.js:257 Checking test status for valve: HMV (16859638-e5b3-4f46-ad5b-d7001c1c22fe)
render_functions.js:285 No test results found for HMV
render_functions.js:291 Set color #e6c23a for valve HMV
render_functions.js:257 Checking test status for valve: MMV (fd977c5a-f37b-48cb-9fe3-17d3ddb341b4)
render_functions.js:285 No test results found for MMV
render_functions.js:291 Set color #e6c23a for valve MMV
render_functions.js:257 Checking test status for valve: SCSSV (4169ca77-9463-4df1-9393-9114ef664ae2)
render_functions.js:285 No test results found for SCSSV
render_functions.js:291 Set color #e6c23a for valve SCSSV
render_functions.js:257 Checking test status for valve: IDV (a1826e4d-1944-4bcf-b385-e62735114d5e)
render_functions.js:285 No test results found for IDV
render_functions.js:291 Set color #e6c23a for valve IDV
render_functions.js:257 Checking test status for valve: IFSV (30e0ecca-525c-4e5a-8bd9-36b2fdc4e565)
render_functions.js:285 No test results found for IFSV
render_functions.js:291 Set color #e6c23a for valve IFSV
render_functions.js:257 Checking test status for valve: IHDV (bea86a63-2596-4a3b-afba-463a8ff0e14a)
render_functions.js:285 No test results found for IHDV
render_functions.js:291 Set color #e6c23a for valve IHDV
render_functions.js:257 Checking test status for valve: PDV (ea9cbde3-3736-4952-ab5c-53cdb9b09ecb)
render_functions.js:285 No test results found for PDV
render_functions.js:291 Set color #e6c23a for valve PDV
render_functions.js:257 Checking test status for valve: Choke (418c4e02-81c1-4627-a1e8-b53decb1f79d)
render_functions.js:285 No test results found for Choke
render_functions.js:257 Checking test status for valve: PFSV (54ad2f19-fef7-4127-aa1a-d2c012b20daf)
render_functions.js:285 No test results found for PFSV
render_functions.js:291 Set color #e6c23a for valve PFSV