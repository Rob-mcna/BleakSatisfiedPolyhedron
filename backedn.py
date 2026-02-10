import dateutil
from scipy.optimize import fsolve
import numpy as np
import logging
from sqlalchemy.sql import func

from app.models import db, Well, Valve, CavityVolume, InegrityTestResult, IntegrityTestFailure, IntegrityTestFailureAction

logger = logging.getLogger(__name__)

def blocking_valve(well_id, valve_id):
    try:
        # testing_valve = Valve.query.filter(Valve.name == valve_id).first()
        cavity_volume_record = CavityVolume.query.options(
            db.joinedload(CavityVolume.blocking_valve)
        ).filter(
            CavityVolume.well_id == well_id,
            CavityVolume.testing_valve_id == valve_id,
        ).all()

        if not cavity_volume_record:
            return {"Error": "Valve not found"}, 404
        
        result = []

        for valve in cavity_volume_record:
            result.append({
                "id": valve.blocking_valve.id,
                "name": valve.blocking_valve.name
            })

        return result
    except Exception as e:
        db.session.rollback()
        return {"Error": str(e)}
    
def psig_to_psia(psig):
    return float(psig) + 14.7

def degF_to_degR(temp_F):
    return float(temp_F) + 459.67

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

def validate_input_data(data):
    """Valida los datos de entrada requeridos"""
    required_fields = [
        'well', 'testValve', 'blockingValve', 'monitoringTime', 'criticalRate',
        'sithp', 'pressureUpstreamPFSV', 'liquidYield',
        'finalPressure', 'initialTemperature', 'finalTemperature', 'gasSG'
    ]
    
    missing_fields = [field for field in required_fields if not data.get(field)]
    if missing_fields:
        return False, f"Campos requeridos faltantes: {', '.join(missing_fields)}"
    
    # Validar que los valores numéricos sean válidos
    numeric_fields = [
        'monitoringTime', 'criticalRate', 'sithp', 'pressureUpstreamPFSV', 
        'liquidYield', 'initialPressure', 'finalPressure', 'initialTemperature', 
        'finalTemperature', 'gasSG'
    ]
    
    for field in numeric_fields:
        try:
            value = float(data.get(field))
            if field in ['criticalRate', 'monitoringTime', 'gasSG'] and value <= 0:
                return False, f"El campo {field} debe ser mayor que 0"
            if field in ['liquidYield', 'initialPressure', 'finalPressure'] and value < 0:
                return False, f"El campo {field} debe ser mayor o igual que 0"
        except (ValueError, TypeError):
            return False, f"El campo {field} debe ser un número válido"
    
    return True, None

def get_database_records(well_id, test_valve_id, blocking_valve_id):
    """Obtiene los registros necesarios de la base de datos"""
    try:
        # Obtener registro del volumen de cavidad
        cavity_volume_record = CavityVolume.query.options(
            db.joinedload(CavityVolume.blocking_valve)
        ).filter(
            CavityVolume.well_id == well_id,
            CavityVolume.testing_valve_id == test_valve_id,
            CavityVolume.blocking_valve_id == blocking_valve_id
        ).first()

        if not cavity_volume_record:
            return None, None, None

        # Obtener datos del pozo y válvula
        test_well = Well.query.filter(Well.id == well_id).first()
        test_valve = Valve.query.filter(Valve.id == test_valve_id).first()

        if not test_well or not test_valve:
            return None, None, None

        return cavity_volume_record, test_well, test_valve
    
    except Exception as e:
        logger.error(f"Error obteniendo datos de la base de datos: {str(e)}")
        return None, None, None

def calculate_z_factors(initial_pressure, final_pressure, initial_temperature, final_temperature, gas_specific_gravity):
    """Calcula los factores Z usando DAK"""
    initial_pressure_psia = psig_to_psia(initial_pressure)
    final_pressure_psia = psig_to_psia(final_pressure)
    
    Z1 = dranchuk_abou_kassem_z(initial_pressure_psia, initial_temperature, gas_specific_gravity)
    Z2 = dranchuk_abou_kassem_z(final_pressure_psia, final_temperature, gas_specific_gravity)
    
    return Z1, Z2

def calculate_volumes(cavity_volume_value, liquid_yield):
    """Calcula los volúmenes relevantes"""
    Rgl = 1000000 / liquid_yield if liquid_yield != 0 else 0
    Vlq = cavity_volume_value / Rgl if Rgl != 0 else 0
    V1 = cavity_volume_value - Vlq  # Volumen de gas
    
    return Rgl, Vlq, V1

def calculate_moles(initial_pressure, final_pressure, initial_temperature, final_temperature, 
                   V1, Z1, Z2, critical_rate, monitoring_time):
    """Calcula las moles iniciales, de fuga y totales"""
    R = 1545.0  # ft-lbf / (lb-mol * °R)
    P_STD = 14.696  # psia
    
    initial_pressure_psia = psig_to_psia(initial_pressure)
    initial_temperature_deg = degF_to_degR(initial_temperature)
    final_temperature_deg = degF_to_degR(final_temperature)
    
    # Moles iniciales en la cavidad de prueba
    denominator = Z1 * R * initial_temperature_deg
    n1 = (144 * initial_pressure_psia * V1) / denominator if denominator != 0 else 0
    
    # Volumen estándar total de gas filtrado durante la prueba
    V2 = critical_rate * monitoring_time
    
    # Moles máximas permitidas de fuga
    denominator = Z1 * R * final_temperature_deg
    n2 = (144 * P_STD * V2) / denominator if denominator != 0 else 0
    
    nt = n1 + n2  # Moles totales permitidas al final de la prueba
    
    return n1, n2, nt, V2

def calculate_critical_pressure(valve_name, sithp, pressure_upstream_pfsv, k):
    """Calcula la presión crítica según el tipo de válvula"""
    if valve_name == "SCSSV":
        # MODIFIED: Now uses 0.547 * (sithp + 14.7)
        return 0.547 * (sithp + 14.7)
    else:
        xc = (2 / (k + 1)) ** (k / (k - 1)) if (k + 1) != 0 and (k - 1) != 0 else 0
        # MODIFIED: Now uses sithp * xc
        return sithp * xc

def calculate_allowable_pressures(valve_name, initial_pressure, final_pressure, 
                                initial_temperature, final_temperature, V1, Z1, Z2, 
                                n1, nt, critical_rate, monitoring_time):
    """Calcula las presiones permitidas Pa y Pf"""
    R = 1545.0  # ft-lbf / (lb-mol * °R)
    
    initial_pressure_psia = psig_to_psia(initial_pressure)
    initial_temperature_deg = degF_to_degR(initial_temperature)
    final_temperature_deg = degF_to_degR(final_temperature)
    
    # Pa: presión máxima permitida al inicio
    Pa = (Z1 * nt * R * initial_temperature_deg) / (144 * V1) if V1 != 0 else 0
    
    # Pf: presión permitida al final de la prueba
    if valve_name == "SCSSV":
        term1 = (critical_rate * monitoring_time * initial_temperature_deg) / (28.45 * V1) if V1 != 0 else 0
        term2 = (initial_pressure_psia / Z1) if Z1 != 0 else 0
        Pf = (term1 + term2) * Z2
    else:
        Pf = (Z2 * nt * R * final_temperature_deg) / (144 * V1) if V1 != 0 else 0
    
    return Pa, Pf

def calculate_actual_leak_rate(valve_name, initial_pressure, final_pressure, 
                             initial_temperature, final_temperature, V1, Z1, Z2, monitoring_time):
    """Calcula la tasa de fuga real"""
    T_STD_R = 520.0  # °R
    P_STD = 14.696   # psia
    
    initial_pressure_psia = psig_to_psia(initial_pressure)
    final_pressure_psia = psig_to_psia(final_pressure)
    initial_temperature_deg = degF_to_degR(initial_temperature)
    final_temperature_deg = degF_to_degR(final_temperature)
    
    try:
        if valve_name == "SCSSV":
            numerator = 28.45 * ((final_pressure_psia / Z2 - initial_pressure_psia / Z1) * V1)
            denominator = monitoring_time * final_temperature_deg
            return numerator / denominator if denominator != 0 else 0
        else:
            factor = (T_STD_R * V1) / (P_STD * monitoring_time)
            term1 = (Z1 * final_pressure_psia) / (Z2 * final_temperature_deg) if Z2 * final_temperature_deg != 0 else 0
            term2 = initial_pressure_psia / initial_temperature_deg if initial_temperature_deg != 0 else 0
            return factor * (term1 - term2)
    except ZeroDivisionError:
        logger.warning("División por cero en cálculo de tasa de fuga")
        return 0

def integrity_test(data):
    """
    Realiza el test de integridad para válvulas de subsuelo
    
    Args:
        data: Diccionario con los parámetros del test
        
    Returns:
        Diccionario con los resultados del test para serializar a JSON
    """
    try:
        # Validar datos de entrada
        is_valid, error_message = validate_input_data(data)
        if not is_valid:
            return {"Error": error_message}, 400
        
        # Extraer parámetros
        well_id = data.get('well')
        test_valve_id = data.get('testValve')
        blocking_valve_id = data.get('blockingValve')
        monitoring_time = float(data.get('monitoringTime'))
        critical_rate = float(data.get('criticalRate'))
        sithp = float(data.get("sithp"))
        pressure_upstream_pfsv = float(data.get("pressureUpstreamPFSV"))
        liquid_yield = float(data.get("liquidYield"))
        specific_heat_ratio = float(data.get("k"))
        initial_pressure = float(data.get('initialPressure'))
        final_pressure = float(data.get('finalPressure'))
        initial_temperature = float(data.get('initialTemperature'))
        final_temperature = float(data.get('finalTemperature'))
        gas_specific_gravity = float(data.get('gasSG'))
        
        # Obtener datos de la base de datos
        cavity_volume_record, test_well, test_valve = get_database_records(
            well_id, test_valve_id, blocking_valve_id
        )
        
        if not cavity_volume_record or not test_well or not test_valve:
            return {"Error": "Datos de pozo, válvula o volumen de cavidad no encontrados"}, 404
        
        # Datos del pozo para el resultado
        well_data = {
            "id": test_well.id,
            "name": test_well.name,
            "valve": {
                "id": test_valve.id,
                "name": test_valve.name
            }
        }
        
        # Realizar cálculos principales
        initial_dimensionless, final_dimensionless = calculate_z_factors(initial_pressure, final_pressure, initial_temperature, 
                                   final_temperature, gas_specific_gravity)
        
        gas_liquid_ratio_scf, liquid_volume_ft3, initial_gas_volume = calculate_volumes(cavity_volume_record.blocking_valve_value, liquid_yield)
        
        inicial_mole_number, maximun_allowable_moles, test_maximun_allowable_moles, maximun_allowed_leak = calculate_moles(initial_pressure, final_pressure, initial_temperature, 
                                        final_temperature, initial_gas_volume, initial_dimensionless, final_dimensionless, critical_rate, monitoring_time)
        
        valve_name = test_valve.name
        critical_pressure_cavity = calculate_critical_pressure(valve_name, sithp, pressure_upstream_pfsv, specific_heat_ratio)
        
        allowable_test_starting, pressure_final_condition = calculate_allowable_pressures(valve_name, initial_pressure, final_pressure,
                                             initial_temperature, final_temperature, initial_gas_volume, initial_dimensionless, final_dimensionless,
                                             inicial_mole_number, test_maximun_allowable_moles, critical_rate, monitoring_time)
        
        computed_leakage = calculate_actual_leak_rate(valve_name, initial_pressure, final_pressure,
                                         initial_temperature, final_temperature, initial_gas_volume, initial_dimensionless, final_dimensionless, monitoring_time)
        
        # Evaluaciones del test
        test_valid = allowable_test_starting <= critical_pressure_cavity
        final_pressure_psia = psig_to_psia(final_pressure)
        pass_fail = final_pressure_psia <= pressure_final_condition
        leak_rate_pass = computed_leakage <= critical_rate
        
        # Determinar razones de falla
        failure_reasons = []
        if not test_valid:
            failure_reasons.append("Configuración de prueba inválida (Pa > Pc)")
        if not pass_fail:
            failure_reasons.append("Falla de fuga interna (P2 > Pf)")
        if not leak_rate_pass:
            failure_reasons.append("Tasa de fuga excede el máximo permitido (Q_act > critical_rate)")
        
        # Calcular xc para el resultado
        critical_pressure_ratio = (2 / (specific_heat_ratio + 1)) ** (specific_heat_ratio / (specific_heat_ratio - 1)) if (specific_heat_ratio + 1) != 0 and (specific_heat_ratio - 1) != 0 else 0
        
        # Determinar el status del test
        if test_valid and pass_fail and leak_rate_pass:
            status = 'pass'
        else:
            status = 'fail'
        
        # Crear el registro en la base de datos
        try:
            # Verificar si ya existe un registro para esta combinación
            existing_record = InegrityTestResult.query.filter_by(
                test_well_id=well_id,
                test_valve_id=test_valve_id,
                blocking_valve_id=blocking_valve_id
            ).first()
            
            if existing_record:
                # Actualizar el registro existente
                existing_record.monitoring_time = int(monitoring_time)
                existing_record.critical_rate = critical_rate
                existing_record.sithp = sithp
                existing_record.pressure_upstream_pfsv = pressure_upstream_pfsv
                existing_record.liquid_yield = liquid_yield
                existing_record.specific_heat_ratio = specific_heat_ratio
                existing_record.initial_pressure = initial_pressure
                existing_record.final_pressure = final_pressure
                existing_record.initial_temperature = initial_temperature
                existing_record.final_temperature = final_temperature
                existing_record.gas_specific_gravity = gas_specific_gravity
                existing_record.leak_rate = computed_leakage
                existing_record.pressure_final_condition = pressure_final_condition
                existing_record.allowable_test_starting = allowable_test_starting
                existing_record.critical_pressure_cavity = critical_pressure_cavity
                existing_record.critical_pressure_ratio = critical_pressure_ratio
                existing_record.cavity_volume = cavity_volume_record.blocking_valve_value
                existing_record.gas_liquid_ratio_scf = gas_liquid_ratio_scf
                existing_record.liquid_volume = liquid_volume_ft3
                existing_record.maximun_allowed_leak = maximun_allowed_leak
                existing_record.status = status
                existing_record.updated_at = func.current_timestamp()
                
                db_record = existing_record
            else:
                # Crear nuevo registro
                db_record = InegrityTestResult(
                    test_well_id=well_id,
                    test_valve_id=test_valve_id,
                    blocking_valve_id=blocking_valve_id,
                    monitoring_time=int(monitoring_time),
                    critical_rate=critical_rate,
                    sithp=sithp,
                    pressure_upstream_pfsv=pressure_upstream_pfsv,
                    liquid_yield=liquid_yield,
                    specific_heat_ratio=specific_heat_ratio,
                    initial_pressure=initial_pressure,
                    final_pressure=final_pressure,
                    initial_temperature=initial_temperature,
                    final_temperature=final_temperature,
                    gas_specific_gravity=gas_specific_gravity,
                    leak_rate=computed_leakage,
                    pressure_final_condition=pressure_final_condition,
                    allowable_test_starting=allowable_test_starting,
                    critical_pressure_cavity=critical_pressure_cavity,
                    critical_pressure_ratio=critical_pressure_ratio,
                    cavity_volume=cavity_volume_record.blocking_valve_value,
                    gas_liquid_ratio_scf=gas_liquid_ratio_scf,
                    liquid_volume=liquid_volume_ft3,
                    maximun_allowed_leak=maximun_allowed_leak,
                    status=status
                )
                db.session.add(db_record)
            
            # Confirmar la transacción
            db.session.commit()
            
            logger.info(f"Resultado del test de integridad guardado para well_id: {well_id}, test_valve_id: {test_valve_id}, status: {status}")
            
        except Exception as db_error:
            logger.error(f"Error al guardar en la base de datos: {str(db_error)}")
            db.session.rollback()
            # Continuar con la respuesta aunque falle el guardado
            logger.warning("Continuando con la respuesta a pesar del error de base de datos")
        
        # Construir resultado para JSON
        result = {
            "leak_rate_scfm": computed_leakage,
            "pass": pass_fail,
            "test_valid": test_valid,
            "leak_rate_pass": leak_rate_pass,
            "failure_reasons": failure_reasons,
            "limits": {
                "monitoring_time_min": monitoring_time,
                "critical_rate_scfm": critical_rate
            },
            "thresholds": {
                "Pf": pressure_final_condition,
                "P2": final_pressure_psia,
                "Pa": allowable_test_starting,
                "Pc": critical_pressure_cavity,
                "xc": critical_pressure_ratio
            },
            "inputs": {
                "Well": well_data["name"],
                "ValveType": valve_name,
                "BlockingValve": cavity_volume_record.blocking_valve.name if cavity_volume_record.blocking_valve else "N/A",
                "InitialPressure_psig": initial_pressure,
                "FinalPressure_psig": final_pressure,
                "InitialTemperature_F": initial_temperature,
                "FinalTemperature_F": final_temperature,
                "CavityVolume_ft3": cavity_volume_record.blocking_valve_value,
                "GasVoidVolume_ft3": initial_gas_volume,
                "MonitoringTime_min": monitoring_time,
                "Z1": initial_dimensionless,
                "Z2": final_dimensionless,
                "LiquidYield": liquid_yield,
                "SITHP_psig": sithp,
                "PressureUpstreamPFSV_psig": pressure_upstream_pfsv,
                "specificHeatRatio": specific_heat_ratio,
                "GasSG": gas_specific_gravity
            },
            "intermediate": {
                "GasLiquidRatio_scf_per_STB": gas_liquid_ratio_scf,
                "LiquidVolume_ft3": liquid_volume_ft3,
                "n1": inicial_mole_number,
                "n2": maximun_allowable_moles,
                "nt": test_maximun_allowable_moles,
                "V2": maximun_allowed_leak
            },
            "constants": {
                "standardPresurePSIA": 14.696,
                "T_STD_F": 60.0,
                "T_STD_R": 520.0,
                "GasConstant_R": 1545.0
            }
        }

        return result

    except ValueError as e:
        logger.error(f"Error de validación en integrity_test: {str(e)}")
        return {"Error": f"Error de validación: {str(e)}"}, 400
    except Exception as e:
        logger.error(f"Error inesperado en integrity_test: {str(e)}")
        db.session.rollback()
        return {"Error": f"Error interno del servidor"}, 500
    
def give_integrity_test(well_id, valve_id):
    inegrity_test_result = InegrityTestResult.query.filter(
            InegrityTestResult.test_well_id == well_id,
            InegrityTestResult.test_valve_id == valve_id,
    ).first()

    if not inegrity_test_result:
        return {"Error": "Test not found"}, 404
        
    result = {
        "monitoringTime": inegrity_test_result.monitoring_time,
        "criticalRate": inegrity_test_result.critical_rate,
        "Pf": inegrity_test_result.pressure_final_condition,
        "P2": inegrity_test_result.final_pressure,
        "Pa": inegrity_test_result.allowable_test_starting,
        "Pc": inegrity_test_result.critical_pressure_cavity,
        "leakRate": inegrity_test_result.leak_rate,
        "status": inegrity_test_result.status
    }
        
    return result

def give_integrity_test_failure(well_id, valve_id):
    inegrity_test_failure = IntegrityTestFailure.query.options(
        db.joinedload(IntegrityTestFailure.test_well),
        db.joinedload(IntegrityTestFailure.test_valve)
    ).filter(
        IntegrityTestFailure.test_well_id == well_id,
        IntegrityTestFailure.test_valve_id == valve_id,
    ).first()

    if not inegrity_test_failure:
        return {"Error": "Test not found"}, 404
        
    result = {
        "id": inegrity_test_failure.id,
        "well": inegrity_test_failure.test_well.name,
        "valve": inegrity_test_failure.test_valve.name,
        "code": inegrity_test_failure.code,
        "matrixCategory": inegrity_test_failure.matrix_category,
        "description": inegrity_test_failure.description,
        "requiredAction": inegrity_test_failure.required_action,
        "createdAt": inegrity_test_failure.created_at
    }
        
    return result

def save_test_failure(well_id, valve_id, data):
    try:
        failure_code = data.get("failureCode")
        matrix_category = data.get("matrixCategory")
        failure_description = data.get("failureDescription")
        required_action = data.get("requiredAction")
        
        if not failure_code or not matrix_category or not failure_description or not required_action or not well_id or not valve_id:
             return {"Error": "Required data"}, 400

        existing_record = IntegrityTestFailure.query.filter_by(
                test_well_id=well_id,
                test_valve_id=valve_id
        ).first()
            
        if existing_record:
            # Actualizar el registro existente
            existing_record.code = failure_code
            existing_record.matrix_category = matrix_category
            existing_record.description = failure_description
            existing_record.required_action = required_action
            existing_record.updated_at = func.current_timestamp()
            
            db_record = existing_record
        else:
            # Crear nuevo registro
            db_record = IntegrityTestFailure(
                test_well_id=well_id,
                test_valve_id=valve_id,
                code=failure_code,
                matrix_category=matrix_category,
                description=failure_description,
                required_action=required_action
            )
            db.session.add(db_record)
        db.session.commit()
        return {"message": "Integrity test failure saved successfully", "id": db_record.id}
    except Exception as e:
        print(e)
        db.session.rollback()
        return {"Error": str(e)}
    
def update_test_failure(well_id, valve_id, data):
    try:
        status = data.get("status")
        
        if not status or not well_id or not valve_id:
             return {"Error": "Required data"}, 400

        existing_record = IntegrityTestFailure.query.filter_by(
                test_well_id=well_id,
                test_valve_id=valve_id
        ).first()
            
        if existing_record:
            # Actualizar el registro existente
            existing_record.status = status
            existing_record.updated_at = func.current_timestamp()
            
            db.session.add(existing_record)
        db.session.commit()
        return {"message": "Integrity test failure saved successfully", "id": existing_record.id}
    except Exception as e:
        print(e)
        db.session.rollback()
        return {"Error": str(e)}

def save_test_failure_action(failure_id, data):
    try:
        description = data.get("description")
        justification = data.get("justification")
        expiry_date = data.get("expiryDate")
        status = data.get("status")

        # Validate inputs
        if not all([description, expiry_date, failure_id]):
            return {"Error": "Required data"}, 400

        # Convert expiry_date to datetime if it's a string
        if isinstance(expiry_date, str):
            try:
                expiry_date = dateutil.parser.parse(expiry_date)
            except ValueError:
                return {"Error": "Invalid expiry_date format"}, 400

        existing_record = IntegrityTestFailure.query.filter((IntegrityTestFailure.id == failure_id)).first()
        if not existing_record:
            return {"Error": "Integrity test failure not found"}, 404

        db_record = IntegrityTestFailureAction(
            failure_id=failure_id,
            description=description,
            justification=justification,
            expiry_date=expiry_date,
            status=status
        )
        db.session.add(db_record)
        db.session.commit()
        return {"message": "Integrity test failure action saved successfully", "id": db_record.id}
    except Exception as e:
        print(e)
        db.session.rollback()
        return {"Error": str(e)}, 500
    
def update_test_failure_action(id, data):
    try:
        status = data.get("status")

        # Validate inputs
        if not status:
            return {"Error": "Required data"}, 400

        existing_record = IntegrityTestFailureAction.query.filter((IntegrityTestFailureAction.id == id)).first()
        if not existing_record:
            return {"Error": "Integrity test failure not found"}, 404

        existing_record.status = status
        db.session.add(existing_record)
        db.session.commit()
        return {"message": "Integrity test failure action updated successfully", "id": existing_record.id}
    except Exception as e:
        print(e)
        db.session.rollback()
        return {"Error": str(e)}, 500
    
def give_test_failure_action(id):
    try:
        action = IntegrityTestFailureAction.query.filter((IntegrityTestFailureAction.id == id)).first()
        result = {
            "id": action.id,
            "description": action.description,
            "justification": action.justification,
            "expiry_date": action.expiry_date,
            "status": action.status
        }
        return result
    except Exception as e:
        print(e)
        db.session.rollback()
        return {"Error": str(e)}
