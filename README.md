# Proyecto: Sistema de Generación de Horarios Universitarios (TimeTabling University)

Este proyecto busca ofrecer una solucion al problema Timetabling University, el cual consiste en optimizar la asignacion de horarios.Se usa una arquitectura basada en Cython como backend para asi poder optimizar e rendimiento de C++ como motor de calculo.

## Explicacion del Proyecto

### 1. Resumen General
La aplicación se divide en dos componentes principales:
*   **Frontend**: La interfaz esta construida con **Vite** y **TailwindCSS**. Permitiendo la administración de profesores, asignaturas, grupos y la visualización interactiva de los horarios generados.
*   **Backend**: Se hace uso de API RESTful de alto rendimiento desarrollada con **FastAPI**. el cual actua como comunicador entre la base de datos y el motor de cálculo.

### 2.Backend
El núcleo del sistema reside en el módulo `scheduler`, el cual ha sido optimizado para resolver el problema de asignación de horarios (Time Tabling Problem) de manera eficiente.

#### Arquitectura del Backend
*   **Lenguaje**:La lógica principal de iteración y validación está escrita en **Cython** (`.pyx`), lo que permite compilar el código a **C** nativo, obteniendo velocidades de ejecución cercanas a C/C++ puro.
*   **Integración**: Se expone como una extensión compilada (`.pyd`) que Python importa directamente.

#### Estructuras de Datos
El sistema utiliza estructuras optimizadas para búsquedas y validaciones de tiempo constante $O(1)$ o lineal $O(n)$:

1.  **Mapas de Hash (Diccionarios)**:
    *   `teacher_availability`:El mapa `{id_profesor: Set<Slots>}`nos permite verificar si un profesor puede dar clase en un momento dado instantáneamente.
    *   `global_occupied`: El mapa `{id_profesor: Set<(dia, slot)>}`nos permite rastrear en tiempo real qué espacios ya fueron asignados a un profesor en cualquier otro grupo para evitar choques.
    *   `sesiones_profesor` & `sesiones_materia_grupo`: Estas dos estructuras actuan como diccionarios anidados para conteo rápido. En estos se encuentran las reglas de negocio complejas como "Máximo 2 horas seguidas" o "Máximo X horas por día".

2.  **Conjuntos o (Sets)**:
    *   Se usan para representar los *slots* de tiempo. Permiten operaciones matemáticas de conjuntos (unión, intersección, diferencia) muy rápidas para detectar coincidencia de horarios libres.

3.  **Listas o (Arrays)**:
    *   Se usan para las colecciones ordenadas que requieren aleatorización o (shuffle), como la lista de slots candidatos o la lista de profesores elegibles.

#### ¿Cómo se hacen los horarios?
El sistema implementa un algoritmo **Constructivo Voraz Aleatorizado (Randomized Greedy Construction)**. A diferencia de un algoritmo de fuerza bruta puro o backtracking simple, este enfoque construye una solución válida paso a paso:

1.  **Inicialización**: Se cargan las restricciones (disponibilidad, aulas, materias por cuatrimestre).
2.  **Procesamiento por Grupo**: El algoritmo itera grupo por grupo.
3.  **Aleatorización (Stochasticity)**:
    *   Para cada materia a programar, se **barajan (shuffle)** aleatoriamente los posibles slots de tiempo.
    *   Se **barajan** también los profesores candidatos.
    *   *¿Por qué?* Esto evita que el algoritmo "se atasque" siempre en el mismo conflicto y genera horarios variados en cada ejecución.
4.  **Asignación Voraz (Greedy)**:
    *   Intenta asignar la primera combinación válida de (Día, Hora, Profesor) encontrada.
    *   **Validación Estricta**: Antes de asignar, verifica en $O(1)$:
        *   ¿El profesor está disponible según su horario deseado?
        *   ¿El profesor YA tiene clase en ese slot con otro grupo?
        *   ¿El grupo YA tiene una clase en ese slot?
        *   ¿Se respetan los límites de carga académica diaria?
5.  **Fallback**: Si el profesor titular no está disponible, el sistema busca en la bolsa global de profesores para encontrar un sustituto válido.

Esta aproximación garantiza que, si existe una solución viable fácil, se encuentre rápidamente, respetando todas las "restricciones duras" (Hard Constraints) del problema.
