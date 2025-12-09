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
        
        # NUEVA RESTRICCIÓN: Un profesor solo puede impartir UNA materia por grupo
        # profesor_materia_en_grupo[mid][grupo_id] = materia_id (la única materia que puede dar en ese grupo)
        profesor_materia_en_grupo = {}

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
                    slots_disponibles = len(teacher_availability.get(mid, set())) - len(global_occupied.get(mid, set()))
                    if slots_disponibles > mejor_disponibilidad:
                        mejor_disponibilidad = slots_disponibles
                        mejor_candidato = maestro
                
                if mejor_candidato:
                    profesor_por_materia[materia_id] = mejor_candidato
                    print(f"[SCHEDULER] Materia {materia['nombre']} asignada a {mejor_candidato['nombre']}")
            
            # Slots ordenados cronológicamente por día y por mañana primero (sin receso)
            slots_ordenados = []
            for dia in range(DIAS_SEMANA):
                for slot in sorted(slots_validos):
                    slots_ordenados.append((dia, slot))

            # Mapa de horas restantes por materia del grupo
            horas_restantes = {m['id']: m.get('horas_semanales', 5) for m in materias_grupo}

            sesiones_asignadas = 0

            # Intentar asignar por slot para evitar huecos (llenado temprano primero)
            for (dia, slot) in slots_ordenados:
                if sum(horas_restantes.values()) <= 0:
                    break

                if (dia, slot) in grupo_slots_occupied:
                    continue

                slot_info = SLOTS_CONFIG[slot]
                hora = slot_info["hora_inicio"]

                # Ordenar materias por horas restantes (mayor primero) para avanzar las más pesadas
                materias_candidatas = [m for m in materias_grupo if horas_restantes.get(m['id'], 0) > 0]
                materias_candidatas.sort(key=lambda m: horas_restantes[m['id']], reverse=True)

                asignado_en_slot = False

                for materia in materias_candidatas:
                    materia_id = materia['id']

                    # Limite por materia en el día
                    if grupo_id not in sesiones_materia_grupo:
                        sesiones_materia_grupo[grupo_id] = {}
                    if materia_id not in sesiones_materia_grupo[grupo_id]:
                        sesiones_materia_grupo[grupo_id][materia_id] = {}
                    if dia not in sesiones_materia_grupo[grupo_id][materia_id]:
                        sesiones_materia_grupo[grupo_id][materia_id][dia] = 0
                    if sesiones_materia_grupo[grupo_id][materia_id][dia] >= MAX_SESIONES_MATERIA_DIA:
                        continue

                    # Probar profesor preferido, luego alternos, luego emergencia
                    candidatos = []
                    prof_pref = profesor_por_materia.get(materia_id)
                    if prof_pref:
                        candidatos.append(prof_pref)
                    for alt in maestros_por_materia.get(materia_id, []):
                        if not prof_pref or alt['id'] != prof_pref['id']:
                            candidatos.append(alt)

                    # Añadir emergencia: todos los maestros como última opción
                    candidatos_emergencia = [mm for mm in maestros_data if (not prof_pref) or mm['id'] != prof_pref['id']]

                    def intentar_asignar_con(maestro_sel):
                        mid = maestro_sel['id']
                        # Verificar disponibilidad del profesor en este (dia, hora)
                        if (dia, hora) not in teacher_availability.get(mid, set()):
                            return False
                        # Evitar receso (defensivo): slot 4 ya está excluido de slots_validos
                        # Verificar ocupación del profe
                        if mid not in global_occupied:
                            global_occupied[mid] = set()
                        if (dia, slot) in global_occupied[mid]:
                            return False
                        
                        # NUEVA RESTRICCIÓN: Un profesor solo puede impartir UNA materia por grupo
                        if mid not in profesor_materia_en_grupo:
                            profesor_materia_en_grupo[mid] = {}
                        if grupo_id in profesor_materia_en_grupo[mid]:
                            # El profesor ya tiene una materia asignada en este grupo
                            materia_ya_asignada = profesor_materia_en_grupo[mid][grupo_id]
                            if materia_ya_asignada != materia_id:
                                # No puede impartir otra materia diferente en el mismo grupo
                                return False
                        
                        # Regla: máximo 2 sesiones/día del mismo profesor en el mismo grupo
                        if mid not in sesiones_profesor_grupo:
                            sesiones_profesor_grupo[mid] = {}
                        if grupo_id not in sesiones_profesor_grupo[mid]:
                            sesiones_profesor_grupo[mid][grupo_id] = {}
                        if dia not in sesiones_profesor_grupo[mid][grupo_id]:
                            sesiones_profesor_grupo[mid][grupo_id][dia] = 0
                        if sesiones_profesor_grupo[mid][grupo_id][dia] >= MAX_SESIONES_PROFESOR_DIA:
                            return False

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
                        horas_restantes[materia_id] -= 1
                        
                        # Registrar que este profesor ya tiene esta materia en este grupo
                        profesor_materia_en_grupo[mid][grupo_id] = materia_id
                        
                        return True

                    # Intentar con preferido y alternos
                    exito = False
                    for maestro_sel in candidatos:
                        if intentar_asignar_con(maestro_sel):
                            exito = True
                            asignado_en_slot = True
                            sesiones_asignadas += 1
                            break
                    # Emergencia: cualquier maestro disponible
                    if not exito:
                        for maestro_sel in candidatos_emergencia:
                            if intentar_asignar_con(maestro_sel):
                                exito = True
                                asignado_en_slot = True
                                sesiones_asignadas += 1
                                break

                    if asignado_en_slot:
                        break

            print(f"[SCHEDULER] Grupo {grupo_id} - asignadas {sesiones_asignadas} sesiones")
        
        print(f"[SCHEDULER] Total asignaciones generadas: {len(asignaciones)}")
        # Post-proceso: compactar días por grupo para evitar huecos aislados y limitar huecos a <= 2
        try:
            # Reconstruir ocupación por profesor (dia, slot)
            prof_ocupado = {}
            for a in asignaciones:
                mid = a['maestro_id']
                if mid not in prof_ocupado:
                    prof_ocupado[mid] = set()
                prof_ocupado[mid].add((a['dia_semana'], a['slot_id']))

            # Índice por grupo y día
            by_group_day = {}
            for idx, a in enumerate(asignaciones):
                key = (a['grupo_id'], a['dia_semana'])
                if key not in by_group_day:
                    by_group_day[key] = []
                by_group_day[key].append(idx)  # guardamos índice para mutar

            valid_slots = [s['id'] for s in SLOTS_CONFIG if not s['es_receso']]
            slot_to_hora = {s['id']: s['hora_inicio'] for s in SLOTS_CONFIG}

            def contar_huecos(slots_asignados):
                if not slots_asignados:
                    return 0
                sset = set(slots_asignados)
                ordered = sorted([s for s in valid_slots if s in sset])
                if not ordered:
                    return 0
                start = min(ordered)
                end = max(ordered)
                huecos = 0
                for s in valid_slots:
                    if s < start or s > end:
                        continue
                    if s not in sset:
                        huecos += 1
                return huecos

            def puede_mover(idx_asig, nuevo_slot):
                a = asignaciones[idx_asig]
                d = a['dia_semana']
                mid = a['maestro_id']
                # Disponibilidad docente
                h = slot_to_hora[nuevo_slot]
                if (d, h) not in teacher_availability.get(mid, set()):
                    return False
                # Conflicto docente
                if (d, nuevo_slot) in prof_ocupado.get(mid, set()):
                    return False
                return True

            # Compacción estricta por día: intentar hacer el bloque continuo empezando en el primer slot posible
            for (gid, dia), indices in by_group_day.items():
                indices_sorted = sorted(indices, key=lambda i: asignaciones[i]['slot_id'])
                current_slots = [asignaciones[i]['slot_id'] for i in indices_sorted if asignaciones[i]['slot_id'] in valid_slots]
                if not current_slots:
                    continue
                earliest = min(current_slots)
                target_slots = [s for s in valid_slots if s >= earliest][:len(current_slots)]

                # Pasar por cada objetivo y asignación correspondiente; si hay hueco, mover la clase más cercana
                for t_idx, t_slot in enumerate(target_slots):
                    if t_slot in current_slots:
                        continue  # ya ocupado por el grupo
                    # Elegir candidato a mover: el más próximo por distancia de slot
                    best_i = None
                    best_dist = 999
                    for i in indices_sorted:
                        s = asignaciones[i]['slot_id']
                        if s not in valid_slots:
                            continue
                        # evitar mover si ya está en posición objetivo previa
                        if s in target_slots[:t_idx]:
                            continue
                        dist = abs(s - t_slot)
                        if dist < best_dist and puede_mover(i, t_slot):
                            best_dist = dist
                            best_i = i
                    if best_i is not None:
                        a = asignaciones[best_i]
                        mid = a['maestro_id']
                        d = a['dia_semana']
                        # liberar ocupación anterior y marcar nueva
                        prof_ocupado[mid].discard((d, a['slot_id']))
                        prof_ocupado[mid].add((d, t_slot))
                        a['slot_id'] = t_slot
                        a['hora_inicio'] = slot_to_hora[t_slot]
                        a['hora_fin'] = a['hora_inicio'] + 1
                        # refrescar current_slots
                        current_slots = [asignaciones[i]['slot_id'] for i in indices_sorted if asignaciones[i]['slot_id'] in valid_slots]
                # Si aún quedan huecos > 2, intentar introducir desplazamientos adicionales hacia el bloque
                for _ in range(3):
                    slots_actuales = sorted([asignaciones[i]['slot_id'] for i in indices_sorted if asignaciones[i]['slot_id'] in valid_slots])
                    if contar_huecos(slots_actuales) <= 2:
                        break
                    # Mover el más lejano hacia el interior si posible
                    inner_range = (min(slots_actuales), max(slots_actuales))
                    # Buscar hueco interno
                    inner_hole = None
                    sset = set(slots_actuales)
                    for s in valid_slots:
                        if s < inner_range[0] or s > inner_range[1]:
                            continue
                        if s not in sset:
                            inner_hole = s
                            break
                    if inner_hole is None:
                        break
                    # Elegir clase de extremo para mover
                    cand_i = None
                    cand_slot = None
                    # extremo superior
                    for i in reversed(indices_sorted):
                        sl = asignaciones[i]['slot_id']
                        if sl == max(slots_actuales):
                            cand_i = i; cand_slot = sl; break
                    # Intentar mover
                    if cand_i is not None and puede_mover(cand_i, inner_hole):
                        a = asignaciones[cand_i]
                        mid = a['maestro_id']
                        d = a['dia_semana']
                        prof_ocupado[mid].discard((d, cand_slot))
                        prof_ocupado[mid].add((d, inner_hole))
                        a['slot_id'] = inner_hole
                        a['hora_inicio'] = slot_to_hora[inner_hole]
                        a['hora_fin'] = a['hora_inicio'] + 1
        except Exception as e:
            print(f"[SCHEDULER] Postprocesado de huecos falló: {e}")

        # Balanceo inter-día: mover sesiones entre días del mismo grupo para reducir huecos
        try:
            # Reindexar por grupo y día
            by_group_day = {}
            for i, a in enumerate(asignaciones):
                key = (a['grupo_id'], a['dia_semana'])
                by_group_day.setdefault(key, []).append(i)

            valid_slots = [s['id'] for s in SLOTS_CONFIG if not s['es_receso']]
            slot_to_hora = {s['id']: s['hora_inicio'] for s in SLOTS_CONFIG}

            def huecos_en_dia(indices):
                slots = sorted([asignaciones[i]['slot_id'] for i in indices if asignaciones[i]['slot_id'] in valid_slots])
                if not slots:
                    return 0
                sset = set(slots)
                start, end = min(slots), max(slots)
                count = 0
                for s in valid_slots:
                    if s < start or s > end:
                        continue
                    if s not in sset:
                        count += 1
                return count

            def puede_mover_inter(i_asig, nuevo_dia, nuevo_slot):
                a = asignaciones[i_asig]
                mid = a['maestro_id']
                # Disponibilidad
                h = slot_to_hora[nuevo_slot]
                if (nuevo_dia, h) not in teacher_availability.get(mid, set()):
                    return False
                # Conflicto docente
                if mid not in prof_ocupado:
                    prof_ocupado[mid] = set()
                if (nuevo_dia, nuevo_slot) in prof_ocupado[mid]:
                    return False
                # Límite por profesor en el mismo grupo por día
                gid = a['grupo_id']
                if mid not in sesiones_profesor_grupo:
                    sesiones_profesor_grupo[mid] = {}
                if gid not in sesiones_profesor_grupo[mid]:
                    sesiones_profesor_grupo[mid][gid] = {}
                if sesiones_profesor_grupo[mid][gid].get(nuevo_dia, 0) >= MAX_SESIONES_PROFESOR_DIA:
                    return False
                return True

            # Para cada grupo, buscar días con huecos altos y días más compactos para transferir una sesión
            from collections import defaultdict
            dias_por_grupo = defaultdict(list)
            for (gid, dia), indices in by_group_day.items():
                dias_por_grupo[gid].append((dia, indices))

            for gid, dias_list in dias_por_grupo.items():
                # ordenar por cantidad de huecos desc
                dias_list_sorted = sorted(dias_list, key=lambda x: huecos_en_dia(x[1]), reverse=True)
                # intentar algunas iteraciones de balanceo
                for _ in range(3):
                    dias_list_sorted = sorted(dias_list_sorted, key=lambda x: huecos_en_dia(x[1]), reverse=True)
                    if len(dias_list_sorted) < 2:
                        break
                    dia_mas_huecos, idxs_mas = dias_list_sorted[0]
                    dia_menos_huecos, idxs_menos = dias_list_sorted[-1]
                    if huecos_en_dia(idxs_mas) <= 2:
                        break
                    # Buscar hueco interno en día con más huecos
                    slots_mas = sorted([asignaciones[i]['slot_id'] for i in idxs_mas if asignaciones[i]['slot_id'] in valid_slots])
                    sset = set(slots_mas)
                    start, end = (min(slots_mas), max(slots_mas)) if slots_mas else (None, None)
                    inner_hole = None
                    if start is not None:
                        for s in valid_slots:
                            if s < start or s > end:
                                continue
                            if s not in sset:
                                inner_hole = s
                                break
                    if inner_hole is None:
                        break

                    # Intentar mover desde el día más compacto una sesión hacia ese hueco
                    moved = False
                    for i in list(idxs_menos):
                        sl = asignaciones[i]['slot_id']
                        # Evitar receso y respetar límites por materia/día
                        if sl not in valid_slots:
                            continue
                        mat_id = asignaciones[i]['materia_id']
                        # Limite por materia para el nuevo día
                        if gid not in sesiones_materia_grupo:
                            sesiones_materia_grupo[gid] = {}
                        if mat_id not in sesiones_materia_grupo[gid]:
                            sesiones_materia_grupo[gid][mat_id] = {}
                        if sesiones_materia_grupo[gid][mat_id].get(dia_mas_huecos, 0) >= MAX_SESIONES_MATERIA_DIA:
                            continue
                        if puede_mover_inter(i, dia_mas_huecos, inner_hole):
                            a = asignaciones[i]
                            mid = a['maestro_id']
                            # actualizar contadores de profesor/grupo por día
                            sesiones_profesor_grupo[mid][gid][dia_menos_huecos] = max(0, sesiones_profesor_grupo[mid][gid].get(dia_menos_huecos, 0) - 1)
                            sesiones_profesor_grupo[mid][gid][dia_mas_huecos] = sesiones_profesor_grupo[mid][gid].get(dia_mas_huecos, 0) + 1
                            # actualizar materia por día
                            sesiones_materia_grupo[gid][mat_id][dia_menos_huecos] = max(0, sesiones_materia_grupo[gid][mat_id].get(dia_menos_huecos, 0) - 1)
                            sesiones_materia_grupo[gid][mat_id][dia_mas_huecos] = sesiones_materia_grupo[gid][mat_id].get(dia_mas_huecos, 0) + 1

                            # actualizar ocupación docente
                            prof_ocupado[mid].discard((dia_menos_huecos, sl))
                            prof_ocupado[mid].add((dia_mas_huecos, inner_hole))
                            # mutar asignación
                            a['dia_semana'] = dia_mas_huecos
                            a['slot_id'] = inner_hole
                            a['hora_inicio'] = slot_to_hora[inner_hole]
                            a['hora_fin'] = a['hora_inicio'] + 1
                            # actualizar índices de días
                            idxs_menos.remove(i)
                            idxs_mas.append(i)
                            moved = True
                            break
                    if not moved:
                        break
        except Exception as e:
            print(f"[SCHEDULER] Balanceo inter-día falló: {e}")

        # Balanceo semanal: distribuir sesiones uniformemente entre los 5 días por grupo
        try:
            valid_slots = [s['id'] for s in SLOTS_CONFIG if not s['es_receso']]
            slot_to_hora = {s['id']: s['hora_inicio'] for s in SLOTS_CONFIG}

            # Reconstruir ocupación por grupo y día
            from collections import defaultdict
            group_day_slots = defaultdict(lambda: defaultdict(set))  # gid -> dia -> set(slots)
            indices_por_grupo_dia = defaultdict(lambda: defaultdict(list))
            for i, a in enumerate(asignaciones):
                if a['slot_id'] in valid_slots:
                    group_day_slots[a['grupo_id']][a['dia_semana']].add(a['slot_id'])
                indices_por_grupo_dia[a['grupo_id']][a['dia_semana']].append(i)

            for gid in list(group_day_slots.keys()):
                # Contadores por día
                counts = [len(group_day_slots[gid].get(d, set())) for d in range(DIAS_SEMANA)]
                total = sum(counts)
                if total == 0:
                    continue

                # Objetivo: que la diferencia max-min sea <= 1
                def diff_counts(cs):
                    return max(cs) - min(cs)

                # Iterar moviendo de día con más a día con menos
                for _ in range(60):
                    d_max = max(range(DIAS_SEMANA), key=lambda d: counts[d])
                    d_min = min(range(DIAS_SEMANA), key=lambda d: counts[d])
                    if counts[d_max] - counts[d_min] <= 1:
                        break

                    # Buscar una asignación del d_max movible al d_min
                    moved = False
                    # Construir huecos disponibles en d_min
                    libres_dmin = [s for s in valid_slots if s not in group_day_slots[gid].get(d_min, set())]
                    if not libres_dmin:
                        # no hay espacio en d_min, intentar siguiente menor
                        tmp = sorted(range(DIAS_SEMANA), key=lambda d: counts[d])
                        found = False
                        for cand_min in tmp:
                            if counts[d_max] - counts[cand_min] <= 1:
                                continue
                            libres = [s for s in valid_slots if s not in group_day_slots[gid].get(cand_min, set())]
                            if libres:
                                d_min = cand_min
                                libres_dmin = libres
                                found = True
                                break
                        if not found:
                            break

                    # Intentar cada asignación del día sobrecargado
                    for i in list(indices_por_grupo_dia[gid].get(d_max, [])):
                        a = asignaciones[i]
                        if a['slot_id'] not in valid_slots:
                            continue
                        mid = a['maestro_id']
                        mat_id = a['materia_id']
                        # Probar slots libres en el día objetivo, priorizar temprano
                        for s_obj in libres_dmin:
                            h_obj = slot_to_hora[s_obj]
                            # Disponibilidad y conflictos docentes
                            if (d_min, h_obj) not in teacher_availability.get(mid, set()):
                                continue
                            if (d_min, s_obj) in prof_ocupado.get(mid, set()):
                                continue
                            # Límite por profesor en el mismo grupo y día
                            if mid not in sesiones_profesor_grupo:
                                sesiones_profesor_grupo[mid] = {}
                            if gid not in sesiones_profesor_grupo[mid]:
                                sesiones_profesor_grupo[mid][gid] = {}
                            if sesiones_profesor_grupo[mid][gid].get(d_min, 0) >= MAX_SESIONES_PROFESOR_DIA:
                                continue
                            # Límite por materia y día
                            if gid not in sesiones_materia_grupo:
                                sesiones_materia_grupo[gid] = {}
                            if mat_id not in sesiones_materia_grupo[gid]:
                                sesiones_materia_grupo[gid][mat_id] = {}
                            if sesiones_materia_grupo[gid][mat_id].get(d_min, 0) >= MAX_SESIONES_MATERIA_DIA:
                                continue

                            # Mover
                            # Actualizar estructuras ocupación docente
                            prof_ocupado.setdefault(mid, set())
                            prof_ocupado[mid].discard((a['dia_semana'], a['slot_id']))
                            prof_ocupado[mid].add((d_min, s_obj))

                            # Actualizar contadores por profesor/grupo/día
                            sesiones_profesor_grupo[mid][gid][a['dia_semana']] = max(0, sesiones_profesor_grupo[mid][gid].get(a['dia_semana'], 0) - 1)
                            sesiones_profesor_grupo[mid][gid][d_min] = sesiones_profesor_grupo[mid][gid].get(d_min, 0) + 1

                            # Actualizar contadores por materia/grupo/día
                            sesiones_materia_grupo[gid][mat_id][a['dia_semana']] = max(0, sesiones_materia_grupo[gid][mat_id].get(a['dia_semana'], 0) - 1)
                            sesiones_materia_grupo[gid][mat_id][d_min] = sesiones_materia_grupo[gid][mat_id].get(d_min, 0) + 1

                            # Actualizar asignación
                            # Liberar slot de grupo en día origen
                            group_day_slots[gid][a['dia_semana']].discard(a['slot_id'])
                            a['dia_semana'] = d_min
                            a['slot_id'] = s_obj
                            a['hora_inicio'] = h_obj
                            a['hora_fin'] = h_obj + 1
                            # Ocupar slot en día destino
                            group_day_slots[gid][d_min].add(s_obj)

                            # Actualizar índices
                            indices_por_grupo_dia[gid][d_max].remove(i)
                            indices_por_grupo_dia[gid][d_min].append(i)

                            # Actualizar contadores de carga
                            counts[d_max] -= 1
                            counts[d_min] += 1
                            moved = True
                            break
                        if moved:
                            break
                    if not moved:
                        # No se pudo mover nada razonablemente
                        break
        except Exception as e:
            print(f"[SCHEDULER] Balanceo semanal falló: {e}")

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
