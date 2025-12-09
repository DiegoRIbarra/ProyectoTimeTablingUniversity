"""
Script para actualizar la disponibilidad horaria de los maestros
basado en las imágenes de horarios proporcionadas.

Ejecutar con: python actualizar_disponibilidad.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from database.connection import SessionLocal
from database.models import Maestro, DisponibilidadMaestro

# Definición de slots de tiempo
SLOTS = {
    0: (7, 8),  # 7:00-7:55
    1: (8, 9),  # 7:55-8:50
    2: (9, 10),  # 8:50-9:45
    3: (10, 11),  # 9:45-10:40
    4: (11, 12),  # 11:10-12:05
    5: (12, 13),  # 12:05-13:00
    6: (13, 14),  # 13:00-13:55
    7: (14, 15),  # 14:00-14:55
    8: (15, 16),  # 14:55-15:50
    9: (16, 17),  # 15:50-16:45
    10: (17, 18),  # 16:45-17:40
    11: (18, 19),  # 18:00-18:55
    12: (19, 20),  # 18:55-19:50
    13: (20, 21),  # 19:50-20:45
}

# Disponibilidad por maestro basada en las imágenes
# Formato: "nombre": {dia: [slots disponibles]}
# Días: 0=Lunes, 1=Martes, 2=Miércoles, 3=Jueves, 4=Viernes

DISPONIBILIDAD_MAESTROS = {
    # Imagen 1 - Fila 1
    "Myriam Ornelas": {
        0: [0, 1, 2, 3, 4],  # Lunes: 7:00-12:05
        1: [0, 1, 2, 3, 4],  # Martes
        2: [0, 1, 2, 3, 4],  # Miércoles
        3: [0, 1, 2, 3, 4],  # Jueves
        4: [0, 1, 2, 3, 4],  # Viernes
    },
    "Arturo Mascorro": {
        0: [0, 1, 2, 3, 10, 11, 12],  # Lunes: matutino + vespertino
        1: [0, 1, 2, 3, 10, 11, 12],
        2: [0, 1, 2, 3, 10, 11, 12],
        3: [0, 1, 2, 3, 10, 11, 12],
        4: [0, 1, 2, 3, 10, 11, 12],
    },
    "Carlos Orozco": {
        0: [0, 1, 2, 3, 7],  # Lunes
        1: [0, 1, 2, 3, 7],
        2: [0, 1, 2, 3, 7],
        3: [0, 1, 2, 3, 7],
        4: [0, 1, 2, 3, 7],
    },
    "Erendira Gutierrez": {
        0: [0, 1, 2, 3, 4, 5, 6],  # Matutino completo
        1: [0, 1, 2, 3, 4, 5, 6],
        2: [0, 1, 2, 3, 4, 5, 6],
        3: [0, 1, 2, 3, 4, 5, 6],
        4: [0, 1, 2, 3, 4, 5, 6],
    },
    "Luis Felipe": {
        0: [5, 6, 7, 8],  # Mediodía
        1: [5, 6, 7, 8],
        2: [5, 6, 7, 8],
        3: [5, 6, 7, 8],
        4: [5, 6, 7, 8],
    },
    "Fernando Requena": {
        0: [7, 8, 9],  # Vespertino temprano
        1: [7, 8, 9],
        2: [7, 8, 9],
        3: [7, 8, 9],
        4: [7, 8, 9],
    },
    "Adriana L. Trujillo": {
        0: [6, 7, 8, 9, 10, 11, 12, 13],  # Vespertino
        1: [6, 7, 8, 9, 10, 11, 12, 13],
        2: [6, 7, 8, 9, 10, 11, 12, 13],
        3: [6, 7, 8, 9, 10, 11, 12, 13],
        4: [6, 7, 8, 9, 10, 11, 12, 13],
    },
    "Alma Leticia": {
        0: [0, 1, 2, 3, 7, 8, 9],  # Matutino y algo vespertino
        1: [0, 1, 2, 3, 7, 8, 9],
        2: [0, 1, 2, 3, 7, 8, 9],
        3: [0, 1, 2, 3, 7, 8, 9],
        4: [0, 1, 2, 3, 7, 8, 9],
    },
    # Imagen 2 - Fila 2
    "Juan M. Ornelas": {
        0: [7, 8, 9, 10, 11],  # Vespertino
        1: [7, 8, 9, 10, 11],
        2: [7, 8, 9, 10],
        3: [7, 8, 9, 10, 11],
        4: [7, 8, 9, 10, 11],
    },
    "Manuel Ruiz M.": {
        0: [8, 9, 10, 11, 12, 13],  # Vespertino
        1: [8, 9, 10, 11, 12, 13],
        2: [8, 9, 10, 11, 12, 13],
        3: [8, 9, 10, 11, 12, 13],
        4: [8, 9, 10, 11, 12, 13],
    },
    "Hugo E. Trevino": {
        0: [9, 10, 11, 12],  # Vespertino
        1: [9, 10, 11, 12],
        2: [9, 10, 11, 12],
        3: [9, 10, 11, 12],
        4: [9, 10, 11, 12],
    },
    "Marina C. Flores": {
        0: [10, 11, 12],  # Vespertino tardío
        1: [10, 11, 12],
        2: [10, 11, 12],
        3: [10, 11, 12],
        4: [10, 11, 12],
    },
    "Carlos Castillo": {
        0: [4, 5, 6],  # Disponibilidad limitada
        1: [4, 5, 6],
        2: [4, 5, 6],
        3: [4, 5, 6],
        4: [4, 5, 6],
    },
    "Maribel A. Marin": {
        0: [4, 5, 6, 7, 8],  # Mediodía
        1: [4, 5, 6, 7, 8],
        2: [4, 5, 6, 7, 8],
        3: [4, 5, 6, 7, 8],
        4: [4, 5, 6, 7, 8],
    },
    "Luis R. Flores": {
        0: [10, 11, 12, 13],  # Vespertino tardío
        1: [10, 11, 12, 13],
        2: [10, 11, 12, 13],
        3: [10, 11, 12, 13],
        4: [10, 11, 12, 13],
    },
    "Israel Pulido P.": {
        0: [0, 1, 11, 12, 13],  # Mañana temprano y noche
        1: [0, 1, 11, 12, 13],
        2: [0, 1, 11, 12, 13],
        3: [0, 1, 11, 12, 13],
        4: [0, 1, 11, 12, 13],
    },
    # Imagen 3
    "Eduardo P. Gonzalez": {
        0: [0, 1, 2, 3],  # Matutino temprano
        1: [0, 1, 2, 3],
        2: [0, 1, 2, 3],
        3: [0, 1, 2, 3],
        4: [0, 1, 2, 3],
    },
    "Hugo O. Camargo": {
        0: [9, 10, 11, 12],  # Vespertino
        1: [9, 10, 11, 12],
        2: [9, 10, 11, 12],
        3: [9, 10, 11, 12],
        4: [9, 10, 11, 12],
    },
    # Imagen 4
    "Omar Jasso Luna": {
        0: [0, 1, 2, 3, 7, 8],  # Matutino y algo vespertino
        1: [0, 1, 2, 3, 7, 8],
        2: [0, 1, 2, 3, 7, 8],
        3: [0, 1, 2, 3, 7, 8],
        4: [0, 1, 2, 3, 7, 8],
    },
    "Karla E. Vazquez": {
        0: [0, 1, 2, 3, 5, 6],  # Matutino
        1: [0, 1, 2, 3, 5, 6],
        2: [0, 1, 2, 3, 5, 6],
        3: [0, 1, 2, 3, 5, 6],
        4: [0, 1, 2, 3, 5, 6],
    },
    "Alberto Garcia": {
        0: [8, 9, 10, 11],  # Vespertino
        1: [8, 9, 10, 11],
        2: [8, 9, 10, 11],
        3: [8, 9, 10, 11],
        4: [8, 9, 10, 11],
    },
    "Alma Delia Amaya": {
        0: [0, 1, 2, 3, 4, 5],  # Matutino
        1: [0, 1, 2, 3, 4, 5],
        2: [0, 1, 2, 3, 4, 5],
        3: [0, 1, 2, 3, 4, 5],
        4: [0, 1, 2, 3, 4, 5],
    },
    "Jorge A. Hernandez": {
        0: [0, 1, 2, 3, 4, 5, 6],  # Matutino completo
        1: [0, 1, 2, 3, 4, 5, 6],
        2: [0, 1, 2, 3, 4, 5, 6],
        3: [0, 1, 2, 3, 4, 5, 6],
        4: [0, 1, 2, 3, 4, 5, 6],
    },
    "Jose Fidencio": {
        0: [0, 1, 2, 3, 7, 8, 9],  # Matutino y vespertino temprano
        1: [0, 1, 2, 3, 7, 8, 9],
        2: [0, 1, 2, 3, 7, 8, 9],
        3: [0, 1, 2, 3, 7, 8, 9],
        4: [0, 1, 2, 3, 7, 8, 9],
    },
    "Jean-Michael Richer": {
        0: [0, 1, 2, 3],  # Solo matutino temprano
        1: [0, 1, 2, 3],
        2: [0, 1, 2, 3],
        3: [0, 1, 2, 3],
        4: [0, 1, 2, 3],
    },
    "Hiram Herrera R.": {
        0: [0, 1, 2, 3, 4, 5, 6],  # Matutino completo
        1: [0, 1, 2, 3, 4, 5, 6],
        2: [0, 1, 2, 3, 4, 5, 6],
        3: [0, 1, 2, 3, 4, 5, 6],
        4: [0, 1, 2, 3, 4, 5, 6],
    },
    # Imagen 5
    "Marco A. Nuno": {
        0: [0, 1, 2, 3, 4, 5, 6, 7],  # Matutino y algo más
        1: [0, 1, 2, 3, 4, 5, 6, 7],
        2: [0, 1, 2, 3, 4, 5, 6, 7],
        3: [0, 1, 2, 3, 4, 5, 6, 7],
        4: [0, 1, 2, 3, 4, 5, 6, 7],
    },
    "Mario H. Rodriguez": {
        0: [0, 1, 2, 3, 4, 5, 6],  # Matutino completo
        1: [0, 1, 2, 3, 4, 5, 6],
        2: [0, 1, 2, 3, 4, 5, 6],
        3: [0, 1, 2, 3, 4, 5, 6],
        4: [0, 1, 2, 3, 4, 5, 6],
    },
    "Raquel": {
        0: [0, 1, 2, 3, 4, 5, 6],  # Matutino completo
        1: [0, 1, 2, 3, 4, 5, 6],
        2: [0, 1, 2, 3, 4, 5, 6],
        3: [0, 1, 2, 3, 4, 5, 6],
        4: [0, 1, 2, 3, 4, 5, 6],
    },
    "Said P. Martagon": {
        0: [0, 1, 2, 3, 4, 5, 6, 7, 11],  # Matutino y vespertino parcial
        1: [0, 1, 2, 3, 4, 5, 6, 7, 11],
        2: [0, 1, 2, 3, 4, 5, 6, 7, 11],
        3: [0, 1, 2, 3, 4, 5, 6, 7, 11],
        4: [0, 1, 2, 3, 4, 5, 6, 7, 11],
    },
    # Maestros no en imágenes - Disponibilidad por defecto (matutino completo)
    "Ricardo Mendoza": {
        0: [0, 1, 2, 3, 4, 5, 6],
        1: [0, 1, 2, 3, 4, 5, 6],
        2: [0, 1, 2, 3, 4, 5, 6],
        3: [0, 1, 2, 3, 4, 5, 6],
        4: [0, 1, 2, 3, 4, 5, 6],
    },
    "Patricia Sanchez": {
        0: [0, 1, 2, 3, 4, 5, 6],
        1: [0, 1, 2, 3, 4, 5, 6],
        2: [0, 1, 2, 3, 4, 5, 6],
        3: [0, 1, 2, 3, 4, 5, 6],
        4: [0, 1, 2, 3, 4, 5, 6],
    },
    "Miguel A. Torres": {
        0: [0, 1, 2, 3, 4, 5, 6],
        1: [0, 1, 2, 3, 4, 5, 6],
        2: [0, 1, 2, 3, 4, 5, 6],
        3: [0, 1, 2, 3, 4, 5, 6],
        4: [0, 1, 2, 3, 4, 5, 6],
    },
    "Laura E. Ramirez": {
        0: [7, 8, 9, 10, 11, 12, 13],  # Vespertino
        1: [7, 8, 9, 10, 11, 12, 13],
        2: [7, 8, 9, 10, 11, 12, 13],
        3: [7, 8, 9, 10, 11, 12, 13],
        4: [7, 8, 9, 10, 11, 12, 13],
    },
    "Roberto Jimenez": {
        0: [7, 8, 9, 10, 11, 12, 13],  # Vespertino
        1: [7, 8, 9, 10, 11, 12, 13],
        2: [7, 8, 9, 10, 11, 12, 13],
        3: [7, 8, 9, 10, 11, 12, 13],
        4: [7, 8, 9, 10, 11, 12, 13],
    },
    "Sofia M. Delgado": {
        0: [0, 1, 2, 3, 4, 5, 6],  # Matutino
        1: [0, 1, 2, 3, 4, 5, 6],
        2: [0, 1, 2, 3, 4, 5, 6],
        3: [0, 1, 2, 3, 4, 5, 6],
        4: [0, 1, 2, 3, 4, 5, 6],
    },
    "Andres F. Lopez": {
        0: [7, 8, 9, 10, 11, 12, 13],  # Vespertino
        1: [7, 8, 9, 10, 11, 12, 13],
        2: [7, 8, 9, 10, 11, 12, 13],
        3: [7, 8, 9, 10, 11, 12, 13],
        4: [7, 8, 9, 10, 11, 12, 13],
    },
    "Diana R. Morales": {
        0: [0, 1, 2, 3, 4, 5, 6],  # Matutino
        1: [0, 1, 2, 3, 4, 5, 6],
        2: [0, 1, 2, 3, 4, 5, 6],
        3: [0, 1, 2, 3, 4, 5, 6],
        4: [0, 1, 2, 3, 4, 5, 6],
    },
    "Oscar G. Vargas": {
        0: [7, 8, 9, 10, 11, 12, 13],  # Vespertino
        1: [7, 8, 9, 10, 11, 12, 13],
        2: [7, 8, 9, 10, 11, 12, 13],
        3: [7, 8, 9, 10, 11, 12, 13],
        4: [7, 8, 9, 10, 11, 12, 13],
    },
    "Fernanda Castro": {
        0: [0, 1, 2, 3, 4, 5, 6],  # Matutino
        1: [0, 1, 2, 3, 4, 5, 6],
        2: [0, 1, 2, 3, 4, 5, 6],
        3: [0, 1, 2, 3, 4, 5, 6],
        4: [0, 1, 2, 3, 4, 5, 6],
    },
}


def actualizar_disponibilidad():
    """Actualiza la disponibilidad horaria de todos los maestros."""
    db = SessionLocal()

    try:
        # Obtener todos los maestros
        maestros = db.query(Maestro).all()

        for maestro in maestros:
            # Buscar disponibilidad en el diccionario
            disponibilidad = None
            for nombre_key, disp in DISPONIBILIDAD_MAESTROS.items():
                if (
                    nombre_key.lower() in maestro.nombre.lower()
                    or maestro.nombre.lower() in nombre_key.lower()
                ):
                    disponibilidad = disp
                    break

            if not disponibilidad:
                print(
                    f"[WARN] No se encontro disponibilidad para: {maestro.nombre}, usando por defecto (matutino)"
                )
                # Disponibilidad por defecto: matutino completo
                disponibilidad = {
                    0: [0, 1, 2, 3, 4, 5, 6],
                    1: [0, 1, 2, 3, 4, 5, 6],
                    2: [0, 1, 2, 3, 4, 5, 6],
                    3: [0, 1, 2, 3, 4, 5, 6],
                    4: [0, 1, 2, 3, 4, 5, 6],
                }

            # Eliminar disponibilidades anteriores
            db.query(DisponibilidadMaestro).filter(
                DisponibilidadMaestro.maestro_id == maestro.id
            ).delete()

            # Insertar nuevas disponibilidades
            count = 0
            for dia, slots in disponibilidad.items():
                for slot_id in slots:
                    hora_inicio, hora_fin = SLOTS[slot_id]
                    nueva_disp = DisponibilidadMaestro(
                        maestro_id=maestro.id,
                        dia_semana=dia,
                        slot_id=slot_id,
                        hora_inicio=hora_inicio,
                        hora_fin=hora_fin,
                    )
                    db.add(nueva_disp)
                    count += 1

            print(f"[OK] {maestro.nombre}: {count} slots de disponibilidad agregados")

        db.commit()
        print(
            "\n[EXITO] Disponibilidad actualizada exitosamente para todos los maestros!"
        )

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("ACTUALIZANDO DISPONIBILIDAD HORARIA DE MAESTROS")
    print("=" * 60)
    actualizar_disponibilidad()
