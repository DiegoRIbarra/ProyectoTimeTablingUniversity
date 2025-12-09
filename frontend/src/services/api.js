const API_BASE = 'http://localhost:8000/api';

export const api = {
    // Maestros
    async getMaestros() {
        const res = await fetch(`${API_BASE}/maestros`);
        if (!res.ok) throw new Error('Error al cargar maestros');
        const data = await res.json();
        return data.maestros || [];
    },

    async createMaestro(data) {
        const res = await fetch(`${API_BASE}/maestros`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Error al crear maestro');
        return res.json();
    },

    async updateMaestro(id, data) {
        const res = await fetch(`${API_BASE}/maestros/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Error al actualizar maestro');
        return res.json();
    },

    async deleteMaestro(id) {
        const res = await fetch(`${API_BASE}/maestros/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar maestro');
        return res.json();
    },

    // Materias
    async getMaterias() {
        const res = await fetch(`${API_BASE}/materias`);
        if (!res.ok) throw new Error('Error al cargar materias');
        const data = await res.json();
        return data.materias || [];
    },

    async createMateria(data) {
        const res = await fetch(`${API_BASE}/materias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Error al crear materia');
        return res.json();
    },

    async updateMateria(id, data) {
        const res = await fetch(`${API_BASE}/materias/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Error al actualizar materia');
        return res.json();
    },

    async deleteMateria(id) {
        const res = await fetch(`${API_BASE}/materias/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar materia');
        return res.json();
    },

    // Grupos
    async getGrupos() {
        const res = await fetch(`${API_BASE}/grupos`);
        if (!res.ok) throw new Error('Error al cargar grupos');
        const data = await res.json();
        return data.grupos || [];
    },

    // Planes de Estudio
    async getPlanesEstudios() {
        const res = await fetch(`${API_BASE}/planes-estudios`);
        if (!res.ok) throw new Error('Error al cargar planes');
        const data = await res.json();
        return data.planes || [];
    },

    async getPlanEstudios(id) {
        const res = await fetch(`${API_BASE}/planes-estudios/${id}`);
        if (!res.ok) throw new Error('Error al cargar plan');
        return res.json();
    },

    async createPlanEstudios(data) {
        const res = await fetch(`${API_BASE}/planes-estudios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Error al crear plan');
        return res.json();
    },

    async deletePlanEstudios(id) {
        const res = await fetch(`${API_BASE}/planes-estudios/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar plan');
        return res.json();
    },

    // Horarios
    async getHorarios() {
        const res = await fetch(`${API_BASE}/horarios`);
        if (!res.ok) throw new Error('Error al cargar horarios');
        const data = await res.json();
        return data.horarios || [];
    },

    async getHorario(id) {
        const res = await fetch(`${API_BASE}/horarios/${id}`);
        if (!res.ok) throw new Error('Error al cargar horario');
        return res.json();
    },

    async generarHorario(data) {
        const res = await fetch(`${API_BASE}/generar-horario`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Error al generar horario');
        return res.json();
    },

    async eliminarTodosHorarios() {
        const res = await fetch(`${API_BASE}/horarios`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar horarios');
        return res.json();
    },

    // Aulas
    async getAulas() {
        const res = await fetch(`${API_BASE}/aulas`);
        if (!res.ok) throw new Error('Error al cargar aulas');
        const data = await res.json();
        return data.aulas || [];
    },
};
