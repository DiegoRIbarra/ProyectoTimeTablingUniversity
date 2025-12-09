# scheduler_pure.py - Versión Python pura del motor de generación de horarios
# Este archivo se usa como fallback cuando Cython no está disponible

import random

# Constantes
DIAS_SEMANA = 5

# Configuración de slots
SLOTS_CONFIG = [
    {"id": 0, "hora_inicio": 7, "hora_fin": 8, "es_receso": False},
    {"id": 1, "hora_inicio": 8, "hora_fin": 9, "es_receso": False},
    {"id": 2, "hora_inicio": 9, "hora_fin": 10, "es_receso": False},
    {"id": 3, "hora_inicio": 10, "hora_fin": 11, "es_receso": False},
    {"id": 4, "hora_inicio": 11, "hora_fin": 11, "es_receso": True},  # RECESO
    {"id": 5, "hora_inicio": 11, "hora_fin": 12, "es_receso": False},
    {"id": 6, "hora_inicio": 12, "hora_fin": 13, "es_receso": False},
    {"id": 7, "hora_inicio": 13, "hora_fin": 14, "es_receso": False},
    {"id": 8, "hora_inicio": 14, "hora_fin": 15, "es_receso": False},
]

CUATRIMESTRES_ESTADIA = {6, 10}
MAX_SESIONES_PROFESOR_DIA = 2
MAX_SESIONES_MATERIA_DIA = 2


class SchedulerEngine:
    def __init__(self, maestros, materias, grupos, hora_min=7, hora_max=15, capacidad_aula=35):
        self.hora_min = hora_min
        self.hora_max = hora_max
        self.capacidad_aula = capacidad_aula
    
    def generar_horario(self, maestros_data, materias_data, grupos_data):
        """Genera horarios respetando todas las restricciones"""
        asignaciones = []
        
        print(f"[SCHEDULER] Iniciando generación con {len(maestros_data)} maestros, {len(materias_data)} materias, {len(grupos_data)} grupos")
        
        # Mapa de disponibilidad - con fallback a disponibilidad completa
        teacher_availability = {}
        for m in maestros_data:
            disp = m.get('disponibilidad_horaria', {})
            if disp:
                teacher_availability[m['id']] = set(disp.keys())
                print(f"[SCHEDULER] Maestro {m['nombre']} tiene {len(disp)} slots de disponibilidad")
            else:
                # Fallback: disponibilidad completa si no está configurada
                all_slots = set()
                for d in range(DIAS_SEMANA):
                    for slot in SLOTS_CONFIG:
                        if not slot["es_receso"]:
                            all_slots.add((d, slot["hora_inicio"]))
                teacher_availability[m['id']] = all_slots
                print(f"[SCHEDULER] Maestro {m['nombre']} sin disponibilidad - usando TODOS los slots ({len(all_slots)})")
        
        # Ocupación global
        global_occupied = {}
        for m in maestros_data:
            global_occupied[m['id']] = set()
        
        # Contador de sesiones: por profesor en el mismo grupo por día
        # sesiones_profesor_grupo[mid][grupo_id][dia] = count
        sesiones_profesor_grupo = {}

        # Contador de sesiones por materia: sesiones_materia_grupo[grupo_id][materia_id][dia] = count
        sesiones_materia_grupo = {}
        
        # Restricción: Un profesor no puede impartir dos materias distintas en el mismo cuatrimestre
        # maestro_cuatri_materias[mid][cuatrimestre] = set(materia_id)
        maestro_cuatri_materias = {}

        # Índice de maestros por materia
        maestros_por_materia = {}
        for maestro in maestros_data:
            for materia_id in maestro.get('materias_ids', []):
                if materia_id not in maestros_por_materia:
                    maestros_por_materia[materia_id] = []
                maestros_por_materia[materia_id].append(maestro)
        
        # Slots válidos (sin receso)
        slots_validos = [s["id"] for s in SLOTS_CONFIG if not s["es_receso"]]
        
        # Procesar grupos
        for grupo in grupos_data:
            grupo_id = grupo['id']
            cuatrimestre = grupo.get('cuatrimestre', 1)
            
            print(f"[SCHEDULER] Procesando grupo {grupo_id} cuatrimestre {cuatrimestre}")
            
            if cuatrimestre in CUATRIMESTRES_ESTADIA:
                print(f"[SCHEDULER] Saltando grupo {grupo_id} - es período de estadías")
                continue
            
            materias_grupo = [m for m in materias_data if m.get('cuatrimestre') == cuatrimestre]
            print(f"[SCHEDULER] Grupo {grupo_id} tiene {len(materias_grupo)} materias")
            
            if not materias_grupo:
                print(f"[SCHEDULER] No hay materias para cuatrimestre {cuatrimestre}")
                continue
            
            grupo_slots_occupied = set()
            
            # NUEVO: Primero asignar UN profesor a cada materia del grupo
            profesor_por_materia = {}  # materia_id -> maestro
            for materia in materias_grupo:
                materia_id = materia['id']
                candidatos = maestros_por_materia.get(materia_id, [])
                
                # FALLBACK: si no hay candidatos, usar todos los maestros
                if not candidatos:
                    candidatos = maestros_data[:]
                
                # Elegir el profesor con más disponibilidad restante
                mejor_candidato = None
                mejor_disponibilidad = -1
                
                for maestro in candidatos:
                    mid = maestro['id']
                    # Restringir: si el maestro ya tiene otra materia distinta en este cuatrimestre, no permitir
                    materias_en_cuatri = set()
                    if mid in maestro_cuatri_materias and cuatrimestre in maestro_cuatri_materias[mid]:
                        materias_en_cuatri = maestro_cuatri_materias[mid][cuatrimestre]
                        if len(materias_en_cuatri) > 0 and (materia_id not in materias_en_cuatri):
                            continue
                    slots_disponibles = len(teacher_availability.get(mid, set())) - len(global_occupied.get(mid, set()))
                    if slots_disponibles > mejor_disponibilidad:
                        mejor_disponibilidad = slots_disponibles
                        mejor_candidato = maestro
                
                if mejor_candidato:
                    profesor_por_materia[materia_id] = mejor_candidato
                    # Reservar materia para este maestro en el cuatrimestre
                    mid_sel = mejor_candidato['id']
                    if mid_sel not in maestro_cuatri_materias:
                        maestro_cuatri_materias[mid_sel] = {}
                    if cuatrimestre not in maestro_cuatri_materias[mid_sel]:
                        maestro_cuatri_materias[mid_sel][cuatrimestre] = set()
                    maestro_cuatri_materias[mid_sel][cuatrimestre].add(materia_id)
                    print(f"[SCHEDULER] Materia {materia['nombre']} asignada a {mejor_candidato['nombre']}")
            
            # Slots ordenados - aleatorizar para variedad
            slots_ordenados = []
            for slot in slots_validos:
                for dia in range(DIAS_SEMANA):
                    slots_ordenados.append((dia, slot))
            random.shuffle(slots_ordenados)
            
            # Ahora asignar sesiones usando el profesor pre-asignado
            sesiones_asignadas = 0
            for materia in materias_grupo:
                materia_id = materia['id']
                horas = materia.get('horas_semanales', 5)
                
                # Obtener el profesor asignado a esta materia
                maestro = profesor_por_materia.get(materia_id)
                if not maestro:
                    print(f"[SCHEDULER] No hay profesor para {materia['nombre']}")
                    continue
                
                mid = maestro['id']
                horas_asignadas = 0
                
                for (dia, slot) in slots_ordenados:
                    if horas_asignadas >= horas:
                        break
                        
                    if (dia, slot) in grupo_slots_occupied:
                        continue
                    
                    slot_info = SLOTS_CONFIG[slot]
                    hora = slot_info["hora_inicio"]
                    
                    # Verificar disponibilidad del profesor
                    if (dia, hora) not in teacher_availability.get(mid, set()):
                        continue
                    
                    # Verificar ocupación
                    if mid not in global_occupied:
                        global_occupied[mid] = set()
                    if (dia, slot) in global_occupied[mid]:
                        continue
                    
                    # Verificar máximo 2 sesiones/día del PROFESOR en el MISMO GRUPO
                    if mid not in sesiones_profesor_grupo:
                        sesiones_profesor_grupo[mid] = {}
                    if grupo_id not in sesiones_profesor_grupo[mid]:
                        sesiones_profesor_grupo[mid][grupo_id] = {}
                    if dia not in sesiones_profesor_grupo[mid][grupo_id]:
                        sesiones_profesor_grupo[mid][grupo_id][dia] = 0

                    if sesiones_profesor_grupo[mid][grupo_id][dia] >= MAX_SESIONES_PROFESOR_DIA:
                        continue

                    # Verificar máximo 2 sesiones/día por MATERIA para el GRUPO
                    if grupo_id not in sesiones_materia_grupo:
                        sesiones_materia_grupo[grupo_id] = {}
                    if materia_id not in sesiones_materia_grupo[grupo_id]:
                        sesiones_materia_grupo[grupo_id][materia_id] = {}
                    if dia not in sesiones_materia_grupo[grupo_id][materia_id]:
                        sesiones_materia_grupo[grupo_id][materia_id][dia] = 0
                    
                    if sesiones_materia_grupo[grupo_id][materia_id][dia] >= MAX_SESIONES_MATERIA_DIA:
                        continue
                    
                    # ASIGNAR
                    asignaciones.append({
                        'maestro_id': mid,
                        'materia_id': materia_id,
                        'grupo_id': grupo_id,
                        'dia_semana': dia,
                        'hora_inicio': hora,
                        'hora_fin': hora + 1,
                        'slot_id': slot
                    })
                    
                    global_occupied[mid].add((dia, slot))
                    grupo_slots_occupied.add((dia, slot))
                    sesiones_profesor_grupo[mid][grupo_id][dia] += 1
                    sesiones_materia_grupo[grupo_id][materia_id][dia] += 1
                    horas_asignadas += 1
                    sesiones_asignadas += 1
                
                if horas_asignadas < horas:
                    print(f"[SCHEDULER] ADVERTENCIA: Solo se asignaron {horas_asignadas}/{horas} horas para {materia['nombre']} con {maestro['nombre']}")
            
            print(f"[SCHEDULER] Grupo {grupo_id} - asignadas {sesiones_asignadas} sesiones")
        
        print(f"[SCHEDULER] Total asignaciones generadas: {len(asignaciones)}")
        return asignaciones
    
    def validar_horario(self, asignaciones):
        """Valida el horario generado"""
        errores = []
        advertencias = []
        
        # Detectar conflictos
        slots_ocupados = {}
        for a in asignaciones:
            key = (a['maestro_id'], a['dia_semana'], a['hora_inicio'])
            if key in slots_ocupados:
                errores.append(f"Conflicto docente: {key}")
            slots_ocupados[key] = True
        
        return {"errores": errores, "advertencias": advertencias}
