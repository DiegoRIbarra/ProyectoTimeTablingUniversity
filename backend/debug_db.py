import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

from database.connection import SessionLocal
from database.models import Asignacion, HorarioGenerado

def check_counts():
    db = SessionLocal()
    try:
        a_count = db.query(Asignacion).count()
        h_count = db.query(HorarioGenerado).count()
        print(f"Asignaciones: {a_count}")
        print(f"HorariosGenerados: {h_count}")
        
        if h_count > 0:
            print("Listing Horarios:")
            for h in db.query(HorarioGenerado).all():
                print(f" - ID: {h.id}, Estado: {h.estado}")
    finally:
        db.close()

if __name__ == "__main__":
    check_counts()
