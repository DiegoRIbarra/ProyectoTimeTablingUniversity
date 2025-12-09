from sqlalchemy import Column, Integer, String, ForeignKey, Enum, TIMESTAMP, Text, Boolean, Time
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .connection import Base


class PlanEstudios(Base):
    __tablename__ = "planes_estudios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text, nullable=True)
    total_cuatrimestres = Column(Integer, default=10)
    creado_en = Column(TIMESTAMP, server_default=func.now())

    materias = relationship(
        "Materia", back_populates="plan_estudios", cascade="all, delete-orphan"
    )


class Maestro(Base):
    __tablename__ = "maestros"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    numero = Column(String(50), nullable=True)
    horas_max_semana = Column(Integer, default=15)
    creado_en = Column(TIMESTAMP, server_default=func.now())

    disponibilidades = relationship(
        "DisponibilidadMaestro", back_populates="maestro", cascade="all, delete-orphan"
    )
    materias = relationship(
        "MaestroMateria", back_populates="maestro", cascade="all, delete-orphan"
    )
    asignaciones = relationship("Asignacion", back_populates="maestro")


class Materia(Base):
    __tablename__ = "materias"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    horas_semanales = Column(Integer, nullable=False)
    cuatrimestre = Column(Integer, nullable=False, default=1)
    plan_estudios_id = Column(
        Integer, ForeignKey("planes_estudios.id", ondelete="CASCADE"), nullable=True
    )
    creado_en = Column(TIMESTAMP, server_default=func.now())

    plan_estudios = relationship("PlanEstudios", back_populates="materias")
    maestros = relationship(
        "MaestroMateria", back_populates="materia", cascade="all, delete-orphan"
    )
    asignaciones = relationship("Asignacion", back_populates="materia")


class Grupo(Base):
    __tablename__ = "grupos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), nullable=False)
    semestre = Column(Integer, nullable=False)
    cuatrimestre_pertenece = Column(Integer, nullable=True)
    cantidad_alumnos = Column(Integer, default=0)
    aula_id = Column(Integer, ForeignKey("aulas.id", ondelete="SET NULL"), nullable=True)
    turno = Column(String(20), default="matutino")
    plan_estudios_id = Column(Integer, ForeignKey("planes_estudios.id", ondelete="SET NULL"), nullable=True)
    creado_en = Column(TIMESTAMP, server_default=func.now())

    asignaciones = relationship("Asignacion", back_populates="grupo")
    aula = relationship("Aula", back_populates="grupos")


class MaestroMateria(Base):
    __tablename__ = "maestro_materias"

    id = Column(Integer, primary_key=True, index=True)
    maestro_id = Column(
        Integer, ForeignKey("maestros.id", ondelete="CASCADE"), nullable=False
    )
    materia_id = Column(
        Integer, ForeignKey("materias.id", ondelete="CASCADE"), nullable=False
    )
    creado_en = Column(TIMESTAMP, server_default=func.now())

    maestro = relationship("Maestro", back_populates="materias")
    materia = relationship("Materia", back_populates="maestros")


class DisponibilidadMaestro(Base):
    __tablename__ = "disponibilidad_maestros"

    id = Column(Integer, primary_key=True, index=True)
    maestro_id = Column(
        Integer, ForeignKey("maestros.id", ondelete="CASCADE"), nullable=False
    )
    dia_semana = Column(Integer, nullable=False)  # 0=Lunes, 4=Viernes
    slot_id = Column(Integer, nullable=False, default=0)
    hora_inicio = Column(Integer, nullable=False)
    hora_fin = Column(Integer, nullable=False)

    maestro = relationship("Maestro", back_populates="disponibilidades")


class HorarioGenerado(Base):
    __tablename__ = "horarios_generados"

    id = Column(Integer, primary_key=True, index=True)
    fecha_generacion = Column(TIMESTAMP, server_default=func.now())
    estado = Column(Enum("generado", "activo", "archivado"), default="generado")
    turno = Column(String(20), default="matutino")

    asignaciones = relationship(
        "Asignacion", back_populates="horario", cascade="all, delete-orphan"
    )


class Asignacion(Base):
    __tablename__ = "asignaciones"

    id = Column(Integer, primary_key=True, index=True)
    horario_id = Column(
        Integer, ForeignKey("horarios_generados.id", ondelete="CASCADE"), nullable=False
    )
    maestro_id = Column(
        Integer, ForeignKey("maestros.id", ondelete="CASCADE"), nullable=False
    )
    materia_id = Column(
        Integer, ForeignKey("materias.id", ondelete="CASCADE"), nullable=False
    )
    grupo_id = Column(
        Integer, ForeignKey("grupos.id", ondelete="CASCADE"), nullable=False
    )
    aula_id = Column(Integer, ForeignKey("aulas.id", ondelete="SET NULL"), nullable=True)
    slot_id = Column(Integer, ForeignKey("horarios_config.id", ondelete="SET NULL"), nullable=True)
    dia_semana = Column(Integer, nullable=False)
    hora_inicio = Column(Integer, nullable=False)
    hora_fin = Column(Integer, nullable=False)

    horario = relationship("HorarioGenerado", back_populates="asignaciones")
    maestro = relationship("Maestro", back_populates="asignaciones")
    materia = relationship("Materia", back_populates="asignaciones")
    grupo = relationship("Grupo", back_populates="asignaciones")
    aula = relationship("Aula", back_populates="asignaciones")


# ========== NUEVAS TABLAS ==========

class HorariosConfig(Base):
    """Configuración de franjas horarias con receso"""
    __tablename__ = "horarios_config"

    id = Column(Integer, primary_key=True, index=True)
    hora_inicio = Column(Time, nullable=False)
    hora_fin = Column(Time, nullable=False)
    es_receso = Column(Boolean, default=False)
    nombre_bloque = Column(String(50), nullable=False)
    duracion_minutos = Column(Integer, default=55)
    orden = Column(Integer, nullable=False)


class Aula(Base):
    """Aulas físicas con capacidad"""
    __tablename__ = "aulas"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), nullable=False, unique=True)
    capacidad_maxima = Column(Integer, default=35)
    disponible = Column(Boolean, default=True)
    creado_en = Column(TIMESTAMP, server_default=func.now())

    grupos = relationship("Grupo", back_populates="aula")
    asignaciones = relationship("Asignacion", back_populates="aula")
