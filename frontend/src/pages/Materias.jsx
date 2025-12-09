import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const styles = {
    card: {
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e5e5',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
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
    },
    input: {
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #d4d4d4',
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none',
    },
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

const Materias = () => {
    const [materias, setMaterias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ nombre: '', horas_semanales: 4 });
    const [editId, setEditId] = useState(null);

    const loadMaterias = async () => {
        try {
            setLoading(true);
            const data = await api.getMaterias();
            setMaterias(data);
            setError(null);
        } catch (err) {
            setError('Error al cargar materias. Verifique que el servidor backend este activo.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMaterias();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editId) {
                await api.updateMateria(editId, formData);
            } else {
                await api.createMateria(formData);
            }
            setShowModal(false);
            setFormData({ nombre: '', horas_semanales: 4 });
            setEditId(null);
            loadMaterias();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleEdit = (materia) => {
        setFormData({ nombre: materia.nombre, horas_semanales: materia.horas_semanales });
        setEditId(materia.id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Esta seguro de eliminar esta materia?')) return;
        try {
            await api.deleteMateria(id);
            loadMaterias();
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#171717' }}>Materias</h1>
                    <p style={{ color: '#737373', marginTop: '4px' }}>Gestion de materias del sistema</p>
                </div>
                <button onClick={() => { setShowModal(true); setEditId(null); setFormData({ nombre: '', horas_semanales: 4 }); }} style={styles.btnPrimary}>
                    <PlusIcon /> Nueva Materia
                </button>
            </div>

            {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#737373' }}>Cargando...</div>}

            {error && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px' }}>
                    {error}
                </div>
            )}

            {!loading && !error && (
                <div style={styles.card}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e5e5e5' }}>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: '#525252', fontSize: '14px' }}>ID</th>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: '#525252', fontSize: '14px' }}>Nombre</th>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: '#525252', fontSize: '14px' }}>Horas Semanales</th>
                                <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: '600', color: '#525252', fontSize: '14px' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {materias.map((m) => (
                                <tr key={m.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                    <td style={{ padding: '12px 16px', color: '#737373', fontSize: '14px' }}>{m.id}</td>
                                    <td style={{ padding: '12px 16px', fontWeight: '500', color: '#171717' }}>{m.nombre}</td>
                                    <td style={{ padding: '12px 16px', color: '#525252' }}>{m.horas_semanales}h</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                        <button onClick={() => handleEdit(m)} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', marginRight: '4px' }}>
                                            <EditIcon />
                                        </button>
                                        <button onClick={() => handleDelete(m.id)} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer' }}>
                                            <TrashIcon />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {materias.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#737373' }}>No hay materias registradas</div>
                    )}
                </div>
            )}

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ ...styles.card, width: '100%', maxWidth: '400px' }} className="animate-fade-in">
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#171717', marginBottom: '16px' }}>{editId ? 'Editar' : 'Nueva'} Materia</h2>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#404040', marginBottom: '4px' }}>Nombre</label>
                                <input type="text" required value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} style={styles.input} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#404040', marginBottom: '4px' }}>Horas Semanales</label>
                                <input type="number" min="1" max="20" required value={formData.horas_semanales} onChange={(e) => setFormData({ ...formData, horas_semanales: parseInt(e.target.value) })} style={styles.input} />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ ...styles.btnSecondary, flex: 1 }}>Cancelar</button>
                                <button type="submit" style={{ ...styles.btnPrimary, flex: 1 }}>{editId ? 'Guardar' : 'Crear'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Materias;
