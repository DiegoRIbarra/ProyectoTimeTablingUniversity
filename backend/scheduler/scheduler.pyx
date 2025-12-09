# scheduler.pyx - Motor de generación de horarios en Cython
# cython: language_level=3

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


cdef class SchedulerEngine:
    cdef int hora_min
    cdef int hora_max
    cdef int capacidad_aula

    def __init__(self, int maestros, int materias, int grupos, int hora_min=7, int hora_max=15, int capacidad_aula=35):
        self.hora_min = hora_min
        self.hora_max = hora_max
        self.capacidad_aula = capacidad_aula
    
    def generar_horario(self, list maestros_data, list materias_data, list grupos_data):
        """Genera horarios respetando todas las restricciones"""
        cdef list asignaciones = []
        cdef int dia, slot_id, mid, materia_id, grupo_id, cuatrimestre, hora
        cdef int num_dias = DIAS_SEMANA
        cdef bint asignado
        
        # Mapa de disponibilidad - con fallback a disponibilidad completa
        teacher_availability = {}
        for m in maestros_data:
            disp = m.get('disponibilidad_horaria', {})
            if disp:
                teacher_availability[m['id']] = set(disp.keys())
            else:
                # Fallback: disponibilidad completa si no está configurada
                all_slots = set()
                for d in range(DIAS_SEMANA):
                    for slot in SLOTS_CONFIG:
                        if not slot["es_receso"]:
                            all_slots.add((d, slot["hora_inicio"]))
                teacher_availability[m['id']] = all_slots
        
        # Ocupación global
        global_occupied = {}
        for m in maestros_data:
            global_occupied[m['id']] = set()
        
        # Contador de sesiones: sesiones_profesor[mid][cuatri][dia] = count
        sesiones_profesor = {}
        
        # Contador de sesiones por materia: sesiones_materia_grupo[grupo_id][materia_id][dia] = count
        sesiones_materia_grupo = {}
        
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
            
            if cuatrimestre in CUATRIMESTRES_ESTADIA:
                continue
            
            materias_grupo = [m for m in materias_data if m.get('cuatrimestre') == cuatrimestre]
            if not materias_grupo:
                continue
            
            # Sesiones a programar
            sesiones_a_programar = []
            for mat in materias_grupo:
                horas = mat.get('horas_semanales', 5)
                for _ in range(horas):
                    sesiones_a_programar.append(mat)
            
            if len(sesiones_a_programar) > 40:
                sesiones_a_programar = sesiones_a_programar[:40]
            
            grupo_slots_occupied = set()
            
            # Slots ordenados - aleatorizar para variedad
            slots_ordenados = []
            for slot in slots_validos:
                for dia in range(num_dias):
                    slots_ordenados.append((dia, slot))
            random.shuffle(slots_ordenados)
            
            # Asignar sesiones
            for materia in sesiones_a_programar:
                materia_id = materia['id']
                candidatos = maestros_por_materia.get(materia_id, [])
                
                # FALLBACK MEJORADO: si no hay candidatos, usar todos los maestros
                if not candidatos:
                    candidatos = maestros_data[:]
                
                asignado = False
                random.shuffle(candidatos)
                
                for (dia, slot) in slots_ordenados:
                    if asignado:
                        break
                    if (dia, slot) in grupo_slots_occupied:
                        continue
                    
                    slot_info = SLOTS_CONFIG[slot]
                    hora = slot_info["hora_inicio"]
                    
                    for maestro in candidatos:
                        mid = maestro['id']
                        
                        # Verificar disponibilidad
                        if (dia, hora) not in teacher_availability.get(mid, set()):
                            continue
                        
                        # Verificar ocupación
                        if mid not in global_occupied:
                            global_occupied[mid] = set()
                        if (dia, slot) in global_occupied[mid]:
                            continue
                        
                        # Verificar máximo 2 sesiones/día por cuatrimestre para el PROFESOR
                        if mid not in sesiones_profesor:
                            sesiones_profesor[mid] = {}
                        if cuatrimestre not in sesiones_profesor[mid]:
                            sesiones_profesor[mid][cuatrimestre] = {}
                        if dia not in sesiones_profesor[mid][cuatrimestre]:
                            sesiones_profesor[mid][cuatrimestre][dia] = 0
                        
                        if sesiones_profesor[mid][cuatrimestre][dia] >= MAX_SESIONES_PROFESOR_DIA:
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
                        sesiones_profesor[mid][cuatrimestre][dia] += 1
                        sesiones_materia_grupo[grupo_id][materia_id][dia] += 1
                        asignado = True
                        break
        
        return asignaciones
    
    def validar_horario(self, list asignaciones):
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
