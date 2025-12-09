import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const TIME_SLOTS = [
    { id: 0, label: "07:00 - 07:55" },
    { id: 1, label: "07:55 - 08:50" },
    { id: 2, label: "08:50 - 09:45" },
    { id: 3, label: "09:45 - 10:40" },
    { id: 4, label: "10:40 - 11:10 (Receso)", isRecess: true },
    { id: 5, label: "11:10 - 12:05" },
    { id: 6, label: "12:05 - 13:00" },
    { id: 7, label: "13:00 - 13:55" },
    { id: 8, label: "13:55 - 14:50" }
];

const DAYS = [
    { id: 0, label: "Lunes" },
    { id: 1, label: "Martes" },
    { id: 2, label: "Miércoles" },
    { id: 3, label: "Jueves" },
    { id: 4, label: "Viernes" },
    { id: 5, label: "Sábado" }
];

const styles = {
    card: {
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e5e5',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
    },
    btnPrimary: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '10px 16px',
        backgroundColor: '#2563eb',
        color: 'white',
        fontWeight: '500',
        fontSize: '14px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    btnSecondary: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '10px 16px',
        backgroundColor: 'white',
        color: '#404040',
        fontWeight: '500',
        fontSize: '14px',
        borderRadius: '8px',
        border: '1px solid #d4d4d4',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    btnDanger: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '8px',
        backgroundColor: 'transparent',
        color: '#dc2626',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
    },
    input: {
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #d4d4d4',
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none',
        transition: 'all 0.2s',
    },
    checkbox: {
        width: '16px',
        height: '16px',
        cursor: 'pointer',
    },
    tabButton: (active) => ({
        padding: '10px 16px',
        backgroundColor: active ? '#eff6ff' : 'transparent',
        color: active ? '#2563eb' : '#525252',
        border: 'none',
        borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s'
    })
};

const PlusIcon = () => (
    <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const TrashIcon = () => (
    <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const EditIcon = () => (
    <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

const Maestros = () => {
    const [maestros, setMaestros] = useState([]);
    const [materias, setMaterias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState('info'); // info, materias, horario
    const [editId, setEditId] = useState(null);
    const [viewModal, setViewModal] = useState(false);
    const [viewMaestro, setViewMaestro] = useState(null);

    // Form Data
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        numero: '',
        horas_max_semana: 15,
        materia_ids: [],
        disponibilidad_horaria: [] // Array de { dia_semana, slot_id, hora_inicio, hora_fin }
    });

    const loadData = async () => {
        try {
            setLoading(true);
            const [maestrosData, materiasData] = await Promise.all([
                api.getMaestros(),
                api.getMaterias()
            ]);
            setMaestros(maestrosData || []);
            setMaterias(materiasData || []);
            setError(null);
        } catch (err) {
            console.error(err);
            setError('Error al cargar datos. Verifique conexión.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const toggleMateria = (materiaId) => {
        const current = formData.materia_ids;
        if (current.includes(materiaId)) {
            setFormData({ ...formData, materia_ids: current.filter(id => id !== materiaId) });
        } else {
            setFormData({ ...formData, materia_ids: [...current, materiaId] });
        }
    };

    // Mapeo exacto con scheduler.pyx
    const SLOT_HOURS = {
        0: 7, 1: 8, 2: 9, 3: 10, 4: 11, 5: 11, 6: 12, 7: 13, 8: 14
    };

    const toggleSlot = (diaId, slotId, horaInicio, horaFin) => {
        const slotExists = formData.disponibilidad_horaria.some(
            s => s.dia_semana === diaId && s.slot_id === slotId
        );

        let newDispo;
        if (slotExists) {
            newDispo = formData.disponibilidad_horaria.filter(
                s => !(s.dia_semana === diaId && s.slot_id === slotId)
            );
        } else {
            const horaReal = SLOT_HOURS[slotId] ?? (7 + slotId);
            newDispo = [...formData.disponibilidad_horaria, {
                dia_semana: diaId,
                slot_id: slotId,
                hora_inicio: horaReal,
                hora_fin: horaReal + 1
            }];
        }
        setFormData({ ...formData, disponibilidad_horaria: newDispo });
    };

    // Helper para marcar fila completa (día)
    const toggleDay = (diaId) => {
        const allSelected = TIME_SLOTS.every(slot =>
            slot.isRecess || formData.disponibilidad_horaria.some(s => s.dia_semana === diaId && s.slot_id === slot.id)
        );

        let newDispo = [...formData.disponibilidad_horaria];

        if (allSelected) {
            // Desmarcar todo el día
            newDispo = newDispo.filter(s => s.dia_semana !== diaId);
        } else {
            // Marcar todo el día (excepto receso)
            TIME_SLOTS.forEach(slot => {
                if (!slot.isRecess && !newDispo.some(s => s.dia_semana === diaId && s.slot_id === slot.id)) {
                    const horaReal = SLOT_HOURS[slot.id] ?? (7 + slot.id);
                    newDispo.push({
                        dia_semana: diaId,
                        slot_id: slot.id,
                        hora_inicio: horaReal,
                        hora_fin: horaReal + 1
                    });
                }
            });
        }
        setFormData({ ...formData, disponibilidad_horaria: newDispo });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Preparar payload para evitar problemas
            const payload = {
                ...formData,
                materia_ids: formData.materia_ids.map(Number),
                disponibilidad_horaria: formData.disponibilidad_horaria.map(s => {
                    const h = SLOT_HOURS[s.slot_id] ?? (7 + s.slot_id);
                    return {
                        ...s,
                        hora_inicio: h,
                        hora_fin: h + 1
                    };
                })
            };

            if (editId) {
                await api.updateMaestro(editId, payload);
            } else {
                await api.createMaestro(payload);
            }
            setShowModal(false);
            setEditId(null);
            loadData();
        } catch (err) {
            alert(err.message || "Error al guardar");
        }
    };

    const handleEdit = (maestro) => {
        // Mapear materia objects a IDs
        const matIds = maestro.materias ? maestro.materias.map(m => m.id) : [];

        // Mapear disponibilidad
        let dispo = [];
        if (maestro.disponibilidad_horaria && Array.isArray(maestro.disponibilidad_horaria)) {
            dispo = maestro.disponibilidad_horaria;
        } else if (maestro.dias_disponibles) {
            // Compatibilidad legacy: llenar slots según días
            maestro.dias_disponibles.forEach(dia => {
                TIME_SLOTS.forEach(slot => {
                    if (!slot.isRecess) {
                        const h = SLOT_HOURS[slot.id] ?? (7 + slot.id);
                        dispo.push({
                            dia_semana: dia,
                            slot_id: slot.id,
                            hora_inicio: h,
                            hora_fin: h + 1
                        });
                    }
                });
            });
        }

        setFormData({
            nombre: maestro.nombre,
            email: maestro.email,
            numero: maestro.numero || '',
            horas_max_semana: maestro.horas_max_semana,
            materia_ids: matIds,
            disponibilidad_horaria: dispo,
        });
        setEditId(maestro.id);
        setActiveTab('info');
        setShowModal(true);
    };

    const isSlotSelected = (diaId, slotId) => {
        return formData.disponibilidad_horaria.some(
            s => s.dia_semana === diaId && s.slot_id === slotId
        );
    };

    const openNewModal = () => {
        setShowModal(true);
        setEditId(null);
        setActiveTab('info');
        setFormData({
            nombre: '',
            email: '',
            numero: '',
            horas_max_semana: 15,
            materia_ids: [],
            disponibilidad_horaria: []
        });
    };

    const openView = (maestro) => {
        setViewMaestro(maestro);
        setViewModal(true);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#171717' }}>Maestros</h1>
                    <p style={{ color: '#737373', marginTop: '4px' }}>Gestion de profesores y su disponibilidad</p>
                </div>
                <button onClick={openNewModal} style={styles.btnPrimary}>
                    <PlusIcon /> Nuevo Maestro
                </button>
            </div>

            {/* Loading/Error */}
            {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#737373' }}>Cargando datos...</div>}

            {!loading && !error && (
                <div style={styles.card}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e5e5e5' }}>
                                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: '#525252' }}>Nombre</th>
                                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: '#525252' }}>Materias</th>
                                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: '#525252' }}>Horas Max</th>
                                    <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: '600', color: '#525252' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {maestros.map((m) => (
                                    <tr key={m.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                        <td style={{ padding: '12px 16px', fontWeight: '500', color: '#171717' }}>
                                            {m.nombre}
                                            <div style={{ fontSize: '12px', color: '#737373' }}>{m.email}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px', color: '#525252' }}>
                                            {m.materias && m.materias.length > 0
                                                ? `${m.materias.length} materias asignadas`
                                                : 'Sin materias'}
                                        </td>
                                        <td style={{ padding: '12px 16px', color: '#525252' }}>{m.horas_max_semana}h</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                            <button onClick={() => openView(m)} style={{ ...styles.btnSecondary, marginRight: '8px' }}>
                                                Ver disponibilidad
                                            </button>
                                            <button onClick={() => handleEdit(m)} style={{ ...styles.btnDanger, color: '#2563eb', marginRight: '4px' }}>
                                                <EditIcon />
                                            </button>
                                            <button onClick={() => { if (confirm('Borrar maestro?')) handleDelete(m.id) }} style={styles.btnDanger}>
                                                <TrashIcon />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
                }}>
                    <div style={{ ...styles.card, width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
                            {editId ? 'Editar' : 'Nuevo'} Maestro
                        </h2>

                        {/* Tabs */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #e5e5e5', marginBottom: '20px' }}>
                            <button onClick={() => setActiveTab('info')} style={styles.tabButton(activeTab === 'info')}>
                                Información Básica
                            </button>
                            <button onClick={() => setActiveTab('materias')} style={styles.tabButton(activeTab === 'materias')}>
                                Materias ({formData.materia_ids.length})
                            </button>
                            <button onClick={() => setActiveTab('horario')} style={styles.tabButton(activeTab === 'horario')}>
                                Disponibilidad
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* Tab Info */}
                            {activeTab === 'info' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Nombre</label>
                                        <input type="text" required value={formData.nombre}
                                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                            style={styles.input} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Email</label>
                                        <input type="email" required value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            style={styles.input} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Teléfono</label>
                                        <input type="text" value={formData.numero}
                                            onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                                            style={styles.input} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Horas Máximas</label>
                                        <input type="number" required min="1" max="50" value={formData.horas_max_semana}
                                            onChange={(e) => setFormData({ ...formData, horas_max_semana: parseInt(e.target.value) })}
                                            style={styles.input} />
                                    </div>
                                </div>
                            )}

                            {/* Tab Materias */}
                            {activeTab === 'materias' && (
                                <div>
                                    <div style={{ marginBottom: '12px', color: '#737373', fontSize: '14px' }}>
                                        Seleccione las materias que este profesor puede impartir:
                                    </div>
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px',
                                        maxHeight: '400px', overflowY: 'auto', padding: '4px'
                                    }}>
                                        {materias.map(m => (
                                            <div key={m.id} onClick={() => toggleMateria(m.id)}
                                                style={{
                                                    padding: '10px',
                                                    border: formData.materia_ids.includes(m.id) ? '1px solid #2563eb' : '1px solid #e5e5e5',
                                                    backgroundColor: formData.materia_ids.includes(m.id) ? '#eff6ff' : 'white',
                                                    borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                                                }}>
                                                <input type="checkbox" checked={formData.materia_ids.includes(m.id)} readOnly style={styles.checkbox} />
                                                <span style={{ fontSize: '14px' }}>{m.nombre}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tab Horario */}
                            {activeTab === 'horario' && (
                                <div>
                                    <div style={{ marginBottom: '12px', color: '#737373', fontSize: '14px' }}>
                                        Haga clic en las casillas para marcar disponibilidad. Clic en el nombre del día para seleccionar todo el día.
                                    </div>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ padding: '8px' }}>Hora / Día</th>
                                                    {DAYS.map(day => (
                                                        <th key={day.id}
                                                            onClick={() => toggleDay(day.id)}
                                                            style={{ padding: '8px', cursor: 'pointer', backgroundColor: '#f9fafb', minWidth: '80px' }}
                                                        >
                                                            {day.label}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {TIME_SLOTS.map(slot => (
                                                    <tr key={slot.id} style={{ backgroundColor: slot.isRecess ? '#f3f4f6' : 'white' }}>
                                                        <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: '500', color: slot.isRecess ? '#9ca3af' : '#171717' }}>
                                                            {slot.label}
                                                        </td>
                                                        {DAYS.map(day => (
                                                            <td key={`${day.id}-${slot.id}`} style={{ padding: '4px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                                                                {!slot.isRecess && (
                                                                    <div
                                                                        onClick={() => toggleSlot(day.id, slot.id, 7 + slot.id, 8 + slot.id)}
                                                                        style={{
                                                                            height: '30px',
                                                                            borderRadius: '4px',
                                                                            cursor: 'pointer',
                                                                            backgroundColor: isSlotSelected(day.id, slot.id) ? '#4ade80' : '#e5e7eb',
                                                                            border: isSlotSelected(day.id, slot.id) ? '1px solid #22c55e' : '1px solid #d1d5db',
                                                                            transition: 'all 0.1s'
                                                                        }}
                                                                    />
                                                                )}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e5e5' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ ...styles.btnSecondary, flex: 1 }}>Cancelar</button>
                                <button type="submit" style={{ ...styles.btnPrimary, flex: 1 }}>Guardar Maestro</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Ver Disponibilidad (solo lectura) */}
            {viewModal && viewMaestro && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ ...styles.card, width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Disponibilidad de {viewMaestro.nombre}</h2>
                            <button onClick={() => setViewModal(false)} style={styles.btnSecondary}>Cerrar</button>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '8px' }}>Hora / Día</th>
                                        {DAYS.map(day => (
                                            <th key={day.id} style={{ padding: '8px', backgroundColor: '#f9fafb', minWidth: '80px' }}>{day.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {TIME_SLOTS.map(slot => (
                                        <tr key={slot.id} style={{ backgroundColor: slot.isRecess ? '#f3f4f6' : 'white' }}>
                                            <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: '500', color: slot.isRecess ? '#9ca3af' : '#171717' }}>
                                                {slot.label}
                                            </td>
                                            {DAYS.map(day => {
                                                const selected = !slot.isRecess && (viewMaestro.disponibilidad_horaria || []).some(s => s.dia_semana === day.id && s.slot_id === slot.id);
                                                return (
                                                    <td key={`${day.id}-${slot.id}`} style={{ padding: '4px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                                                        {!slot.isRecess && (
                                                            <div style={{ height: '24px', borderRadius: '4px', backgroundColor: selected ? '#4ade80' : '#e5e7eb', border: selected ? '1px solid #22c55e' : '1px solid #d1d5db' }} />
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Maestros;
