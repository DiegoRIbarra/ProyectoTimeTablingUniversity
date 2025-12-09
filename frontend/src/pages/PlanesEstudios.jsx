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

const PlanesEstudios = () => {
    const [planes, setPlanes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ nombre: '', descripcion: '', total_cuatrimestres: 10 });

    const loadPlanes = async () => {
        try {
            setLoading(true);
            const data = await api.getPlanesEstudios();
            setPlanes(data);
            setError(null);
        } catch (err) {
            setError('Error al cargar planes de estudios');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPlanes();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.createPlanEstudios(formData);
            setShowModal(false);
            setFormData({ nombre: '', descripcion: '', total_cuatrimestres: 10 });
            loadPlanes();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Esta seguro de eliminar este plan de estudios?')) return;
        try {
            await api.deletePlanEstudios(id);
            loadPlanes();
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#171717' }}>Planes de Estudios</h1>
                    <p style={{ color: '#737373', marginTop: '4px' }}>Gestion de planes de estudios y sus materias</p>
                </div>
                <button onClick={() => setShowModal(true)} style={styles.btnPrimary}>
                    <PlusIcon /> Nuevo Plan
                </button>
            </div>

            {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#737373' }}>Cargando...</div>}

            {error && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px' }}>
                    {error}
                </div>
            )}

            {!loading && !error && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {planes.map((plan) => (
                        <div key={plan.id} style={styles.card}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#171717' }}>{plan.nombre}</h3>
                                <button
                                    onClick={() => handleDelete(plan.id)}
                                    style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                            <p style={{ color: '#737373', fontSize: '14px', marginBottom: '12px' }}>
                                {plan.descripcion || 'Sin descripcion'}
                            </p>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                                <div>
                                    <span style={{ color: '#737373' }}>Cuatrimestres: </span>
                                    <span style={{ fontWeight: '600', color: '#171717' }}>{plan.total_cuatrimestres}</span>
                                </div>
                                <div>
                                    <span style={{ color: '#737373' }}>Materias: </span>
                                    <span style={{ fontWeight: '600', color: '#171717' }}>{plan.total_materias || 0}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {planes.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#737373', gridColumn: '1 / -1' }}>
                            No hay planes de estudios registrados
                        </div>
                    )}
                </div>
            )}

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ ...styles.card, width: '100%', maxWidth: '400px' }} className="animate-fade-in">
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#171717', marginBottom: '16px' }}>Nuevo Plan de Estudios</h2>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#404040', marginBottom: '4px' }}>Nombre</label>
                                <input type="text" required value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} style={styles.input} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#404040', marginBottom: '4px' }}>Descripcion</label>
                                <input type="text" value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} style={styles.input} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#404040', marginBottom: '4px' }}>Total Cuatrimestres</label>
                                <input type="number" min="1" max="12" required value={formData.total_cuatrimestres} onChange={(e) => setFormData({ ...formData, total_cuatrimestres: parseInt(e.target.value) })} style={styles.input} />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ ...styles.btnSecondary, flex: 1 }}>Cancelar</button>
                                <button type="submit" style={{ ...styles.btnPrimary, flex: 1 }}>Crear</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlanesEstudios;
