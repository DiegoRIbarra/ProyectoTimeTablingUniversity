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
};

const Grupos = () => {
    const [grupos, setGrupos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadGrupos = async () => {
            try {
                setLoading(true);
                const data = await api.getGrupos();
                setGrupos(data);
                setError(null);
            } catch (err) {
                setError('Error al cargar grupos');
            } finally {
                setLoading(false);
            }
        };
        loadGrupos();
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
            <div>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#171717' }}>Grupos</h1>
                <p style={{ color: '#737373', marginTop: '4px' }}>Grupos generados para los horarios</p>
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
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: '#525252', fontSize: '14px' }}>Semestre/Cuatrimestre</th>
                            </tr>
                        </thead>
                        <tbody>
                            {grupos.map((g) => (
                                <tr key={g.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                    <td style={{ padding: '12px 16px', color: '#737373', fontSize: '14px' }}>{g.id}</td>
                                    <td style={{ padding: '12px 16px', fontWeight: '500', color: '#171717' }}>{g.nombre}</td>
                                    <td style={{ padding: '12px 16px', color: '#525252' }}>{g.semestre}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {grupos.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#737373' }}>
                            No hay grupos. Genere horarios para crear grupos automaticamente.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Grupos;
