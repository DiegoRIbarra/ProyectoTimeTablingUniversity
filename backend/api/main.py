from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import csv
import io
import sys
import os
from typing import Optional, List

# Agregar el directorio scheduler al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scheduler"))

from database.connection import get_db, engine, Base
from database.models import (
    Maestro,
    Materia,
    Grupo,
    HorarioGenerado,
    Asignacion,
    MaestroMateria,
    DisponibilidadMaestro,
    PlanEstudios,
    Aula,
)

# Crear tablas si no existen
Base.metadata.create_all(bind=engine)

# Inicializar FastAPI
app = FastAPI(title="Generador de Horarios Universitarios")

# Configurar CORS para permitir peticiones desde React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "API de Generador de Horarios Universitarios"}


@app.post("/api/maestros/upload-csv")
async def upload_maestros_csv(
    file: UploadFile = File(...), db: Session = Depends(get_db)
):
    """
    Carga maestros desde un archivo CSV
    Formato esperado: nombre,email,horas_max_semana,materias,dias_disponibles

    - horas_max_semana: máximo de horas que puede dar por semana (por defecto 15)
    - materias: lista separada por | de nombres de materias que puede impartir
    - dias_disponibles: numeros separados por | (0=Lun, 1=Mar, 2=Mie, 3=Jue, 4=Vie, 5=Sab)

    Ejemplo:
    nombre,email,horas_max_semana,materias,dias_disponibles
    Dr. Juan Perez,juan@upv.edu.mx,15,INGLES I|INGLES II|INGLES III,0|1|2|3|4|5
    """
    try:
        # Leer archivo CSV
        contents = await file.read()
        decoded_content = contents.decode("utf-8")
        csv_reader = csv.DictReader(io.StringIO(decoded_content))

        # Validar columnas requeridas
        required_columns = ["nombre", "email"]
        fieldnames = csv_reader.fieldnames

        if not fieldnames or not all(col in fieldnames for col in required_columns):
            raise HTTPException(
                status_code=400,
                detail=f"El CSV debe contener las columnas: {', '.join(required_columns)}",
            )

        maestros_creados = []
        errores = []

        # Insertar maestros en la base de datos
        for idx, row in enumerate(csv_reader, start=2):
            try:
                # Obtener horas_max_semana, usar 15 por defecto si no existe
                horas_max_semana = row.get("horas_max_semana", "15")
                try:
                    horas_max_semana = int(horas_max_semana)
                except ValueError:
                    horas_max_semana = 15

                maestro = Maestro(
                    nombre=row["nombre"].strip(),
                    email=row["email"].strip(),
                    numero=row.get("numero", "").strip(),
                    horas_max_semana=horas_max_semana,
                )
                db.add(maestro)
                db.flush()  # Para obtener el ID

                # Procesar materias (separadas por |)
                materias_str = row.get("materias", "")
                if materias_str:
                    nombres_materias = [
                        m.strip().upper() for m in materias_str.split("|") if m.strip()
                    ]
                    for nombre_materia in nombres_materias:
                        # Buscar materia por nombre (case insensitive)
                        materia = (
                            db.query(Materia)
                            .filter(Materia.nombre.ilike(f"%{nombre_materia}%"))
                            .first()
                        )
                        if materia:
                            maestro_materia = MaestroMateria(
                                maestro_id=maestro.id, materia_id=materia.id
                            )
                            db.add(maestro_materia)

                # Procesar dias disponibles (separados por |)
                dias_str = row.get("dias_disponibles", "0|1|2|3|4|5")
                if dias_str:
                    dias = []
                    for d in dias_str.split("|"):
                        try:
                            dia = int(d.strip())
                            if 0 <= dia <= 5:
                                dias.append(dia)
                        except ValueError:
                            pass

                    if not dias:
                        dias = [0, 1, 2, 3, 4, 5]  # Por defecto todos los dias

                    for dia in dias:
                        disponibilidad = DisponibilidadMaestro(
                            maestro_id=maestro.id,
                            dia_semana=dia,
                            hora_inicio=7,
                            hora_fin=22,
                        )
                        db.add(disponibilidad)

                maestros_creados.append(maestro.nombre)
            except Exception as e:
                errores.append(f"Fila {idx}: {str(e)}")

        db.commit()

        result = {
            "message": f"Se cargaron {len(maestros_creados)} maestros exitosamente",
            "maestros": maestros_creados,
        }

        if errores:
            result["errores"] = errores

        return result

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al procesar CSV: {str(e)}")


@app.get("/api/maestros")
def get_maestros(db: Session = Depends(get_db)):
    """Obtiene todos los maestros registrados"""
    maestros = db.query(Maestro).all()
    total = len(maestros)

    return {
        "total": total,
        "minimo_maestros": MINIMO_MAESTROS,
        "puede_eliminar": total > MINIMO_MAESTROS,
        "grupos_base_por_cuatrimestre": GRUPOS_BASE,
        "maestros_por_grupo_extra": MAESTROS_POR_GRUPO_EXTRA,  # 3 maestros por grupo extra
        "mensaje_grupos": f"Para agregar 1 grupo extra a cualquier cuatrimestre, necesitas aproximadamente {MAESTROS_POR_GRUPO_EXTRA} maestros adicionales.",
        "maestros": [
            {
                "id": m.id,
                "nombre": m.nombre,
                "email": m.email,
                "numero": m.numero if hasattr(m, "numero") else "",
                "horas_max_semana": m.horas_max_semana,
                "materias": (
                    [
                        {
                            "id": mm.materia_id,
                            "nombre": mm.materia.nombre,
                            "plan_estudios_id": mm.materia.plan_estudios_id,
                            "cuatrimestre": mm.materia.cuatrimestre,
                        }
                        for mm in m.materias
                    ]
                    if hasattr(m, "materias")
                    else []
                ),
                "disponibilidad_horaria": (
                    [
                        {
                            "dia_semana": d.dia_semana,
                            "slot_id": d.slot_id if hasattr(d, "slot_id") else 0,
                            "hora_inicio": d.hora_inicio,
                            "hora_fin": d.hora_fin,
                        }
                        for d in m.disponibilidades
                    ]
                    if hasattr(m, "disponibilidades")
                    else []
                ),
                # Mantener compatibilidad: extraer días únicos
                "dias_disponibles": (
                    list(set(d.dia_semana for d in m.disponibilidades))
                    if hasattr(m, "disponibilidades")
                    else []
                ),
            }
            for m in maestros
        ],
    }


from pydantic import BaseModel


# Modelo para Plan de Estudios
class MateriaEnPlan(BaseModel):
    nombre: str
    horas_semanales: int
    cuatrimestre: int


class PlanEstudiosCreate(BaseModel):
    nombre: str
    descripcion: str = ""
    total_cuatrimestres: int = 10
    materias: List[MateriaEnPlan] = []


class PlanEstudiosUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    total_cuatrimestres: Optional[int] = None


class AgregarMateriasPlan(BaseModel):
    materias: List[MateriaEnPlan]


# Modelo para disponibilidad horaria por slot
class DisponibilidadSlot(BaseModel):
    dia_semana: int  # 0=Lunes, 4=Viernes
    slot_id: int  # 0-13 (slots de tiempo)
    hora_inicio: int  # 7-20
    hora_fin: int  # 8-21


# Modelo para crear maestro
class MaestroCreate(BaseModel):
    nombre: str
    email: str
    numero: str = ""
    horas_max_semana: int = 15  # Máximo 15 horas por semana
    materia_ids: list[int] = []
    disponibilidad_horaria: list[DisponibilidadSlot] = []  # Lista de slots disponibles


# Modelo para crear materia
class MateriaCreate(BaseModel):
    nombre: str
    horas_semanales: int


@app.post("/api/maestros")
def crear_maestro(maestro_data: MaestroCreate, db: Session = Depends(get_db)):
    """Crea un nuevo maestro individualmente"""
    try:
        # Crear maestro
        maestro = Maestro(
            nombre=maestro_data.nombre.strip(),
            email=maestro_data.email.strip(),
            numero=maestro_data.numero.strip() if maestro_data.numero else "",
            horas_max_semana=maestro_data.horas_max_semana,
        )
        db.add(maestro)
        db.commit()
        db.refresh(maestro)

        # Agregar materias que puede impartir
        for materia_id in maestro_data.materia_ids:
            maestro_materia = MaestroMateria(
                maestro_id=maestro.id, materia_id=materia_id
            )
            db.add(maestro_materia)

        # Agregar disponibilidad horaria por slots
        for slot in maestro_data.disponibilidad_horaria:
            disponibilidad = DisponibilidadMaestro(
                maestro_id=maestro.id,
                dia_semana=slot.dia_semana,
                slot_id=slot.slot_id,
                hora_inicio=slot.hora_inicio,
                hora_fin=slot.hora_fin,
            )
            db.add(disponibilidad)

        db.commit()

        return {
            "message": "Maestro creado exitosamente",
            "maestro": {
                "id": maestro.id,
                "nombre": maestro.nombre,
                "email": maestro.email,
                "numero": maestro.numero,
                "horas_max_semana": maestro.horas_max_semana,
                "materias": maestro_data.materia_ids,
                "disponibilidad_horaria": [
                    {
                        "dia_semana": s.dia_semana,
                        "slot_id": s.slot_id,
                        "hora_inicio": s.hora_inicio,
                        "hora_fin": s.hora_fin,
                    }
                    for s in maestro_data.disponibilidad_horaria
                ],
            },
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear maestro: {str(e)}")


@app.put("/api/maestros/{maestro_id}")
def actualizar_maestro(
    maestro_id: int, maestro_data: MaestroCreate, db: Session = Depends(get_db)
):
    """Actualiza un maestro existente"""
    try:
        maestro = db.query(Maestro).filter(Maestro.id == maestro_id).first()
        if not maestro:
            raise HTTPException(status_code=404, detail="Maestro no encontrado")

        # Actualizar datos básicos
        maestro.nombre = maestro_data.nombre.strip()
        maestro.email = maestro_data.email.strip()
        maestro.numero = maestro_data.numero.strip() if maestro_data.numero else ""
        maestro.horas_max_semana = maestro_data.horas_max_semana

        # Eliminar materias anteriores
        db.query(MaestroMateria).filter(
            MaestroMateria.maestro_id == maestro_id
        ).delete()

        # Agregar nuevas materias
        for materia_id in maestro_data.materia_ids:
            maestro_materia = MaestroMateria(
                maestro_id=maestro_id, materia_id=materia_id
            )
            db.add(maestro_materia)

        # Eliminar disponibilidades anteriores
        db.query(DisponibilidadMaestro).filter(
            DisponibilidadMaestro.maestro_id == maestro_id
        ).delete()

        # Agregar nuevas disponibilidades por slots
        for slot in maestro_data.disponibilidad_horaria:
            disponibilidad = DisponibilidadMaestro(
                maestro_id=maestro_id,
                dia_semana=slot.dia_semana,
                slot_id=slot.slot_id,
                hora_inicio=slot.hora_inicio,
                hora_fin=slot.hora_fin,
            )
            db.add(disponibilidad)

        db.commit()
        db.refresh(maestro)

        return {
            "message": "Maestro actualizado exitosamente",
            "maestro": {
                "id": maestro.id,
                "nombre": maestro.nombre,
                "email": maestro.email,
                "numero": maestro.numero,
                "horas_max_semana": maestro.horas_max_semana,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar maestro: {str(e)}"
        )


# Constantes para cálculo de maestros
MINIMO_MAESTROS = 40  # Mínimo para 2 grupos por cuatrimestre
GRUPOS_BASE = 2  # Grupos por cuatrimestre en configuración base
CUATRIMESTRES_ACTIVOS = 8  # Cuatrimestres que no son estadía (1-5, 7-9)
HORAS_PROMEDIO_GRUPO = 35  # Horas semanales promedio por grupo
HORAS_MAX_MAESTRO = 15  # Horas máximas por semana por maestro
MAESTROS_POR_GRUPO_EXTRA = 3  # Maestros adicionales necesarios por cada grupo extra


@app.delete("/api/maestros/{maestro_id}")
def eliminar_maestro(maestro_id: int, db: Session = Depends(get_db)):
    """Elimina un maestro (no permite si hay menos de 40 maestros)"""
    try:
        # Verificar cantidad mínima de maestros
        total_maestros = db.query(Maestro).count()
        if total_maestros <= MINIMO_MAESTROS:
            raise HTTPException(
                status_code=400,
                detail=f"No se puede eliminar. Se requiere un mínimo de {MINIMO_MAESTROS} maestros para cubrir todos los horarios. Actualmente hay {total_maestros} maestros.",
            )

        maestro = db.query(Maestro).filter(Maestro.id == maestro_id).first()
        if not maestro:
            raise HTTPException(status_code=404, detail="Maestro no encontrado")

        db.delete(maestro)
        db.commit()

        return {"message": f"Maestro {maestro.nombre} eliminado exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar maestro: {str(e)}"
        )


# ==================== ENDPOINTS DE PLAN DE ESTUDIOS ====================


@app.post("/api/planes-estudios")
def crear_plan_estudios(plan_data: PlanEstudiosCreate, db: Session = Depends(get_db)):
    """Crea un nuevo plan de estudios con sus materias"""
    try:
        # Crear el plan de estudios
        plan = PlanEstudios(
            nombre=plan_data.nombre.strip(),
            descripcion=plan_data.descripcion.strip() if plan_data.descripcion else "",
            total_cuatrimestres=plan_data.total_cuatrimestres,
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)

        # Agregar las materias del plan
        materias_creadas = []
        for mat_data in plan_data.materias:
            materia = Materia(
                nombre=mat_data.nombre.strip(),
                horas_semanales=mat_data.horas_semanales,
                cuatrimestre=mat_data.cuatrimestre,
                plan_estudios_id=plan.id,
            )
            db.add(materia)
            materias_creadas.append(
                {
                    "nombre": materia.nombre,
                    "horas_semanales": materia.horas_semanales,
                    "cuatrimestre": materia.cuatrimestre,
                }
            )

        db.commit()

        return {
            "message": f"Plan de estudios '{plan.nombre}' creado exitosamente con {len(materias_creadas)} materias",
            "plan": {
                "id": plan.id,
                "nombre": plan.nombre,
                "descripcion": plan.descripcion,
                "total_cuatrimestres": plan.total_cuatrimestres,
                "materias": materias_creadas,
            },
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al crear plan de estudios: {str(e)}"
        )


@app.get("/api/planes-estudios")
def get_planes_estudios(db: Session = Depends(get_db)):
    """Obtiene todos los planes de estudio con sus materias"""
    planes = db.query(PlanEstudios).all()

    result = []
    for plan in planes:
        materias_por_cuatrimestre = {}
        for materia in plan.materias:
            cuatri = materia.cuatrimestre
            if cuatri not in materias_por_cuatrimestre:
                materias_por_cuatrimestre[cuatri] = []
            materias_por_cuatrimestre[cuatri].append(
                {
                    "id": materia.id,
                    "nombre": materia.nombre,
                    "horas_semanales": materia.horas_semanales,
                }
            )

        result.append(
            {
                "id": plan.id,
                "nombre": plan.nombre,
                "descripcion": plan.descripcion,
                "total_cuatrimestres": plan.total_cuatrimestres,
                "total_materias": len(plan.materias),
                "materias_por_cuatrimestre": materias_por_cuatrimestre,
            }
        )

    return {
        "total": len(planes),
        "planes": result,
    }


@app.get("/api/planes-estudios/{plan_id}")
def get_plan_estudios(plan_id: int, db: Session = Depends(get_db)):
    """Obtiene un plan de estudios especifico con sus materias"""
    plan = db.query(PlanEstudios).filter(PlanEstudios.id == plan_id).first()

    if not plan:
        raise HTTPException(status_code=404, detail="Plan de estudios no encontrado")

    materias_por_cuatrimestre = {}
    for materia in plan.materias:
        cuatri = materia.cuatrimestre
        if cuatri not in materias_por_cuatrimestre:
            materias_por_cuatrimestre[cuatri] = []
        materias_por_cuatrimestre[cuatri].append(
            {
                "id": materia.id,
                "nombre": materia.nombre,
                "horas_semanales": materia.horas_semanales,
            }
        )

    return {
        "id": plan.id,
        "nombre": plan.nombre,
        "descripcion": plan.descripcion,
        "total_cuatrimestres": plan.total_cuatrimestres,
        "total_materias": len(plan.materias),
        "materias_por_cuatrimestre": materias_por_cuatrimestre,
    }


@app.get("/api/planes-estudios/{plan_id}/cuatrimestre/{cuatrimestre}")
def get_materias_cuatrimestre(
    plan_id: int, cuatrimestre: int, db: Session = Depends(get_db)
):
    """Obtiene las materias de un cuatrimestre especifico de un plan"""
    plan = db.query(PlanEstudios).filter(PlanEstudios.id == plan_id).first()

    if not plan:
        raise HTTPException(status_code=404, detail="Plan de estudios no encontrado")

    materias = (
        db.query(Materia)
        .filter(
            Materia.plan_estudios_id == plan_id, Materia.cuatrimestre == cuatrimestre
        )
        .all()
    )

    return {
        "plan": plan.nombre,
        "cuatrimestre": cuatrimestre,
        "materias": [
            {
                "id": m.id,
                "nombre": m.nombre,
                "horas_semanales": m.horas_semanales,
            }
            for m in materias
        ],
    }


@app.delete("/api/planes-estudios/{plan_id}")
def eliminar_plan_estudios(plan_id: int, db: Session = Depends(get_db)):
    """Elimina un plan de estudios y todas sus materias"""
    try:
        plan = db.query(PlanEstudios).filter(PlanEstudios.id == plan_id).first()
        if not plan:
            raise HTTPException(
                status_code=404, detail="Plan de estudios no encontrado"
            )

        db.delete(plan)
        db.commit()

        return {"message": f"Plan de estudios '{plan.nombre}' eliminado exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar plan de estudios: {str(e)}"
        )


@app.put("/api/planes-estudios/{plan_id}")
def actualizar_plan_estudios(
    plan_id: int, plan_data: PlanEstudiosUpdate, db: Session = Depends(get_db)
):
    """Actualiza un plan de estudios existente"""
    try:
        plan = db.query(PlanEstudios).filter(PlanEstudios.id == plan_id).first()
        if not plan:
            raise HTTPException(
                status_code=404, detail="Plan de estudios no encontrado"
            )

        if plan_data.nombre is not None:
            plan.nombre = plan_data.nombre.strip()
        if plan_data.descripcion is not None:
            plan.descripcion = plan_data.descripcion.strip()
        if plan_data.total_cuatrimestres is not None:
            plan.total_cuatrimestres = plan_data.total_cuatrimestres

        db.commit()
        db.refresh(plan)

        return {
            "message": f"Plan de estudios '{plan.nombre}' actualizado exitosamente",
            "plan": {
                "id": plan.id,
                "nombre": plan.nombre,
                "descripcion": plan.descripcion,
                "total_cuatrimestres": plan.total_cuatrimestres,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar plan de estudios: {str(e)}"
        )


@app.post("/api/planes-estudios/{plan_id}/materias")
def agregar_materias_plan(
    plan_id: int, materias_data: AgregarMateriasPlan, db: Session = Depends(get_db)
):
    """Agrega materias a un plan de estudios existente"""
    try:
        plan = db.query(PlanEstudios).filter(PlanEstudios.id == plan_id).first()
        if not plan:
            raise HTTPException(
                status_code=404, detail="Plan de estudios no encontrado"
            )

        materias_creadas = []
        for mat_data in materias_data.materias:
            materia = Materia(
                nombre=mat_data.nombre.strip(),
                horas_semanales=mat_data.horas_semanales,
                cuatrimestre=mat_data.cuatrimestre,
                plan_estudios_id=plan.id,
            )
            db.add(materia)
            materias_creadas.append(
                {
                    "nombre": materia.nombre,
                    "horas_semanales": materia.horas_semanales,
                    "cuatrimestre": materia.cuatrimestre,
                }
            )

        db.commit()

        return {
            "message": f"Se agregaron {len(materias_creadas)} materias al plan '{plan.nombre}'",
            "materias_agregadas": materias_creadas,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al agregar materias: {str(e)}"
        )


@app.delete("/api/planes-estudios/{plan_id}/materias/{materia_id}")
def eliminar_materia_plan(plan_id: int, materia_id: int, db: Session = Depends(get_db)):
    """Elimina una materia de un plan de estudios"""
    try:
        materia = (
            db.query(Materia)
            .filter(Materia.id == materia_id, Materia.plan_estudios_id == plan_id)
            .first()
        )
        if not materia:
            raise HTTPException(
                status_code=404, detail="Materia no encontrada en este plan"
            )

        nombre = materia.nombre
        db.delete(materia)
        db.commit()

        return {"message": f"Materia '{nombre}' eliminada exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar materia: {str(e)}"
        )


# ==================== ENDPOINTS DE MATERIAS ====================


@app.post("/api/materias")
def crear_materia(materia_data: MateriaCreate, db: Session = Depends(get_db)):
    """Crea una nueva materia"""
    try:
        materia = Materia(
            nombre=materia_data.nombre.strip(),
            horas_semanales=materia_data.horas_semanales,
        )
        db.add(materia)
        db.commit()
        db.refresh(materia)
        return {
            "message": "Materia creada exitosamente",
            "materia": {
                "id": materia.id,
                "nombre": materia.nombre,
                "horas_semanales": materia.horas_semanales,
            },
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear materia: {str(e)}")


@app.get("/api/materias")
def get_materias(db: Session = Depends(get_db)):
    """Obtiene todas las materias"""
    materias = db.query(Materia).all()
    return {
        "total": len(materias),
        "materias": [
            {
                "id": m.id,
                "nombre": m.nombre,
                "horas_semanales": m.horas_semanales,
                "cuatrimestre": m.cuatrimestre,
                "plan_estudios_id": m.plan_estudios_id,
            }
            for m in materias
        ],
    }


@app.put("/api/materias/{materia_id}")
def actualizar_materia(
    materia_id: int, materia_data: MateriaCreate, db: Session = Depends(get_db)
):
    """Actualiza una materia existente"""
    try:
        materia = db.query(Materia).filter(Materia.id == materia_id).first()
        if not materia:
            raise HTTPException(status_code=404, detail="Materia no encontrada")

        materia.nombre = materia_data.nombre.strip()
        materia.horas_semanales = materia_data.horas_semanales

        db.commit()
        db.refresh(materia)

        return {
            "message": "Materia actualizada exitosamente",
            "materia": {
                "id": materia.id,
                "nombre": materia.nombre,
                "horas_semanales": materia.horas_semanales,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar materia: {str(e)}"
        )


@app.delete("/api/materias/{materia_id}")
def eliminar_materia(materia_id: int, db: Session = Depends(get_db)):
    """Elimina una materia"""
    try:
        materia = db.query(Materia).filter(Materia.id == materia_id).first()
        if not materia:
            raise HTTPException(status_code=404, detail="Materia no encontrada")

        db.delete(materia)
        db.commit()

        return {"message": f"Materia {materia.nombre} eliminada exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar materia: {str(e)}"
        )


@app.post("/api/grupos")
def crear_grupo(nombre: str, semestre: int, db: Session = Depends(get_db)):
    """Crea un nuevo grupo"""
    grupo = Grupo(nombre=nombre, semestre=semestre)
    db.add(grupo)
    db.commit()
    db.refresh(grupo)
    return {"id": grupo.id, "nombre": grupo.nombre, "semestre": grupo.semestre}


@app.get("/api/grupos")
def get_grupos(db: Session = Depends(get_db)):
    """Obtiene todos los grupos"""
    grupos = db.query(Grupo).all()
    return {
        "total": len(grupos),
        "grupos": [
            {"id": g.id, "nombre": g.nombre, "semestre": g.semestre} for g in grupos
        ],
    }


# Modelo para generar horario (opcional, pero útil para documentación)
# Aunque usaremos dict en el endpoint para flexibilidad
# Cuatrimestres de estadía (no tienen horario de clases)
CUATRIMESTRES_ESTADIA = [6, 10]


@app.post("/api/generar-horario")
def generar_horario(request: dict, db: Session = Depends(get_db)):
    """
    Genera horarios con validaciones estrictas:
    - Suficiencia de aulas
    - Disponibilidad de docentes
    - Cuatrimestres válidos
    Reporta errores y advertencias.
    """
    try:
        # Importar scheduler (versión Python pura para evitar problemas de compilación)
        try:
            from scheduler import scheduler_pure as scheduler
        except ImportError:
            sys.path.append(os.path.join(os.path.dirname(__file__), "..", "scheduler"))
            import scheduler_pure as scheduler

        plan_id = request.get("plan_id")
        maestro_ids = request.get("maestro_ids", [])
        cuatrimestres_seleccionados = request.get("cuatrimestres_seleccionados", [])
        grupos_por_cuatrimestre = request.get("grupos_por_cuatrimestre", {})
        turno = request.get("turno", "matutino")
        
        errores_criticos = []
        advertencias = []

        # --- VALIDACIONES PREVIAS ---

        # 1. Validar Cuatrimestres (Estadías)
        for c in cuatrimestres_seleccionados:
            if int(c) in CUATRIMESTRES_ESTADIA:
                errores_criticos.append(f"Cuatrimestre inválido: {c}º es de estadía. Por favor deselecciónelo.")
        
        if errores_criticos:
             raise HTTPException(status_code=400, detail="\n".join(errores_criticos))

        # 2. Validar Disponibilidad de Profesores
        maestros_query = db.query(Maestro).filter(Maestro.id.in_(maestro_ids)).all()
        if not maestros_query:
            raise HTTPException(status_code=400, detail="Debe seleccionar al menos un docente.")

        maestros_data = []
        for m in maestros_query:
            # Construir dispo
            dispo = {}
            slots_count = 0
            for d in m.disponibilidades:
                 # Scheduler espera (dia, hora_inicio). 
                 # Nota: en Maestros.jsx ya guardamos hora_inicio alineada.
                 dispo[(d.dia_semana, d.hora_inicio)] = True
                 slots_count += (d.hora_fin - d.hora_inicio)
            
            if slots_count == 0:
                errores_criticos.append(f"Profesor sin disponibilidad: {m.nombre} no tiene horarios habilitados.")
            
            maestros_data.append({
                "id": m.id,
                "nombre": m.nombre,
                "materias_ids": [mm.materia_id for mm in m.materias],
                "disponibilidad_horaria": dispo,
                "horas_max_semana": m.horas_max_semana
            })

        if errores_criticos:
             raise HTTPException(status_code=400, detail="\n".join(errores_criticos))

        # 3. Validación de aulas deshabilitada en este modelo (no existe 'Aula')
        
        # --- PREPARACIÓN DE DATOS ---
        
        plan = db.query(PlanEstudios).get(plan_id)
        nombre_carrera = plan.nombre if plan else "Ingeniería"
        
        all_materias_data = []
        all_grupos_data = []
        cuatrimestres_generados = []
        grupos_creados_db = {}
        seen_materia_ids = set()

        # Limpiar anterior
        db.query(Asignacion).delete()
        db.query(HorarioGenerado).delete()
        db.query(Grupo).delete()
        db.commit()

        for c_str in cuatrimestres_seleccionados:
            cuatrimestre = int(c_str)
            cuatrimestres_generados.append(cuatrimestre)
            
            # Materias
            materias = db.query(Materia).filter(
                Materia.plan_estudios_id == plan_id,
                Materia.cuatrimestre == cuatrimestre
            ).all()

            # Verificar cobertura docente para este cuateimestre
            for mat in materias:
                if mat.id not in seen_materia_ids:
                    # Check if any teacher can teach this
                    can_teach = any(mat.id in m['materias_ids'] for m in maestros_data)
                    if not can_teach:
                        advertencias.append(f"Materia sin docente: {mat.nombre} ({cuatrimestre}º) no tiene ningún profesor asignado que pueda impartirla.")
                    
                    all_materias_data.append({
                        "id": mat.id, 
                        "nombre": mat.nombre, 
                        "horas_semanales": mat.horas_semanales,
                        "cuatrimestre": mat.cuatrimestre
                    })
                    seen_materia_ids.add(mat.id)
            
            # Grupos
            num_grupos = int(grupos_por_cuatrimestre.get(str(cuatrimestre)) or grupos_por_cuatrimestre.get(cuatrimestre) or 1)
            letras = "ABCDEFGHIJKLMNO"
            
            for g_idx in range(num_grupos):
                letra = letras[g_idx] if g_idx < len(letras) else str(g_idx + 1)
                nombre_grupo = f"{cuatrimestre}{letra}"
                
                grupo = Grupo(
                    nombre=nombre_grupo,
                    semestre=cuatrimestre,
                )
                db.add(grupo)
                db.commit()
                db.refresh(grupo)
                
                grupos_creados_db[grupo.id] = grupo
                all_grupos_data.append({
                    "id": grupo.id,
                    "cuatrimestre": cuatrimestre,
                    "nombre": nombre_grupo,
                    # Sin aula_id en este modelo
                })

        # --- EJECUCIÓN SCHEDULER ---

        engine = scheduler.SchedulerEngine(
            maestros=len(maestros_data),
            materias=len(all_materias_data),
            grupos=len(all_grupos_data),
            hora_min=7,
            hora_max=15
        )
        
        asignaciones_generadas = engine.generar_horario(
            maestros_data, 
            all_materias_data, 
            all_grupos_data
        )

        # --- VALIDACIONES POSTERIORES Y GUARDADO ---
        
        total_asignaciones = 0
        horarios_por_grupo = {}
        
        for grupo_id in grupos_creados_db:
             h = HorarioGenerado(estado="generado", turno=turno)
             db.add(h)
             db.commit()
             db.refresh(h)
             horarios_por_grupo[grupo_id] = h.id

        # Preparar asignación de aulas
        aulas = db.query(Aula).filter(Aula.disponible == True).all()
        aulas_por_capacidad = sorted(aulas, key=lambda a: a.capacidad_maxima, reverse=True)
        # Ocupación por aula y slot: (aula_id, dia, hora) -> True
        ocupacion_aula_slot = {}
        # Regla: un maestro no puede impartir dos materias distintas en la misma aula (en todo el horario)
        maestro_aula_materias = {}

        # Guardar
        for asig in asignaciones_generadas:
            grupo_id = asig['grupo_id']
            # Validacion receso (defensiva, el scheduler ya lo hace)
            if asig.get('slot_id') == 4:
                continue
            # Seleccionar aula disponible para este slot
            aula_id_seleccionada = None
            dia = asig['dia_semana']
            hora = asig['hora_inicio']
            maestro_id = asig['maestro_id']
            materia_id = asig['materia_id']

            for aula in aulas_por_capacidad:
                key_slot = (aula.id, dia, hora)
                if ocupacion_aula_slot.get(key_slot):
                    continue
                # Verificar regla de maestro: no dos materias distintas en la misma aula (cualquier día)
                if maestro_id not in maestro_aula_materias:
                    maestro_aula_materias[maestro_id] = {}
                materias_en_aula = maestro_aula_materias[maestro_id].get(aula.id, set())
                if len(materias_en_aula) > 0 and (materia_id not in materias_en_aula):
                    # Ya tiene otra materia ese día en la misma aula
                    continue
                # Asignar
                aula_id_seleccionada = aula.id
                ocupacion_aula_slot[key_slot] = True
                materias_en_aula.add(materia_id)
                maestro_aula_materias[maestro_id][aula.id] = materias_en_aula
                break

            nueva_asignacion = Asignacion(
                horario_id=horarios_por_grupo[grupo_id],
                maestro_id=asig['maestro_id'],
                materia_id=asig['materia_id'],
                grupo_id=grupo_id,
                dia_semana=asig['dia_semana'],
                hora_inicio=asig['hora_inicio'],
                hora_fin=asig['hora_fin'],
                aula_id=aula_id_seleccionada
            )
            db.add(nueva_asignacion)
            total_asignaciones += 1
        
        db.commit()

        # Análisis de Huecos y Completitud
        horarios_creados = []
        for grupo_id, horario_id in horarios_por_grupo.items():
            grupo = grupos_creados_db[grupo_id]
            # Materias del grupo
            materias_grupo = [m for m in all_materias_data if m['cuatrimestre'] == grupo.semestre]
            horas_totales_requeridas = sum(m['horas_semanales'] for m in materias_grupo)
            
            asignaciones_grupo = db.query(Asignacion).filter(Asignacion.horario_id == horario_id).all()
            horas_asignadas = len(asignaciones_grupo)
            
            if horas_asignadas < horas_totales_requeridas:
                 diff = horas_totales_requeridas - horas_asignadas
                 advertencias.append(f"Incompleto: Grupo {grupo.nombre} tiene {horas_asignadas}/{horas_totales_requeridas} horas asignadas. Faltan {diff} sesiones.")
            
            # Detectar huecos simples (ej: clase 7-8, hueco 8-9, clase 9-10)
            # Mapa dia -> slots
            slots_por_dia = {d: [] for d in range(5)}
            for a in asignaciones_grupo:
                if a.dia_semana < 5:
                    slots_por_dia[a.dia_semana].append(a.hora_inicio) # Usamos hora inicio como proxy de orden
            
            for d, horas in slots_por_dia.items():
                horas.sort()
                for i in range(len(horas)-1):
                    # Si la diferencia es > 1 hora y NO es el receso (que está entre 10 y 11 aprox, hora 10->11)
                    # Hora 7, 8, 9, 10, 11(post-receso), 12, 13
                    # Si tengo 9 y 12 -> huecos en 10 y 11.
                    if horas[i+1] - horas[i] > 1:
                        # Checar si el hueco es solo el receso
                        # Receso suele estar entre hora start 10 (termina 10:40) y hora start 11 (inicia 11:10)
                        # Si h[i]=10 y h[i+1]=11, diff=1. No hueco.
                        # Si h[i]=9 y h[i+1]=11 -> Hueco en 10.
                        hueco_size = horas[i+1] - horas[i] - 1
                        if hueco_size > 0:
                             dias_str = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]
                             advertencias.append(f"Hueco: Grupo {grupo.nombre} tiene hueco de {hueco_size} hora(s) el {dias_str[d]}.")

            horarios_creados.append({
                "horario_id": horario_id,
                "grupo": grupo.nombre,
                "asignaciones": horas_asignadas
            })

        return {
            "message": "Proceso finalizado.",
            "status": "success" if not advertencias else "warning",
            "advertencias": advertencias,
            "total_asignaciones": total_asignaciones,
            "horarios": horarios_creados
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/aulas")
def get_aulas(db: Session = Depends(get_db)):
    """Endpoint placeholder: modelo de Aulas no disponible en este esquema"""
    return {"aulas": []}


@app.get("/api/horarios")
def get_horarios(db: Session = Depends(get_db)):
    """Obtiene todos los horarios generados"""
    horarios = (
        db.query(HorarioGenerado)
        .order_by(HorarioGenerado.fecha_generacion.desc())
        .all()
    )

    result = []
    for h in horarios:
        # Obtener grupo asociado
        asignacion = db.query(Asignacion).filter(Asignacion.horario_id == h.id).first()
        grupo_nombre = "Desconocido"
        if asignacion and asignacion.grupo:
            grupo_nombre = asignacion.grupo.nombre
            
        result.append({
            "id": h.id,
            "fecha_generacion": h.fecha_generacion,
            "estado": h.estado,
            "grupo": grupo_nombre,
            "total_asignaciones": len(h.asignaciones),
        })
    
    return {"total": len(result), "horarios": result}


@app.delete("/api/horarios")
def eliminar_todos_horarios(db: Session = Depends(get_db)):
    """Elimina todos los horarios generados y limpia grupos generados"""
    try:
        # Eliminar asignaciones
        db.query(Asignacion).delete()
        # Eliminar horarios
        db.query(HorarioGenerado).delete()
        # Eliminar grupos creados dinámicamente (opcional)
        db.commit()
        return {"message": "Horarios eliminados correctamente"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/horarios/{horario_id}")
def get_horario(horario_id: int, db: Session = Depends(get_db)):
    """Obtiene detalle de un horario"""
    horario = db.query(HorarioGenerado).get(horario_id)
    if not horario:
        raise HTTPException(status_code=404, detail="Horario no encontrado")

    asignaciones = db.query(Asignacion).filter(Asignacion.horario_id == horario_id).all()
    dias = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"]

    return {
        "id": horario.id,
        "asignaciones": [
            {
                "id": a.id,
                "maestro": a.maestro.nombre,
                "materia": a.materia.nombre,
                "grupo": a.grupo.nombre,
                "aula": a.aula.nombre if a.aula else "N/A",
                "dia": dias[a.dia_semana],
                "hora_inicio": a.hora_inicio, 
                "hora_fin": a.hora_fin,
                "slot_id": a.slot_id
            }
            for a in asignaciones
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
