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
