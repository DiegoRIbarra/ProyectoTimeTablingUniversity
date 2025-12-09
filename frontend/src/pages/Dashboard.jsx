import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

const styles = {
    card: {
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e5e5',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    cardDark: {
        backgroundColor: '#0f172a',
        borderRadius: '12px',
        border: '1px solid #1e293b',
        padding: '24px',
    },
    btnSecondary: {
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '12px 16px',
        backgroundColor: 'white',
        color: '#404040',
        fontWeight: '500',
        fontSize: '14px',
        borderRadius: '8px',
        border: '1px solid #e5e5e5',
        cursor: 'pointer',
        textDecoration: 'none',
        marginBottom: '8px',
    },
    btnPrimary: {
        display: 'block',
        width: '100%',
        textAlign: 'center',
        padding: '14px 16px',
        backgroundColor: '#2563eb',
        color: 'white',
        fontWeight: '600',
        fontSize: '14px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        textDecoration: 'none',
        marginBottom: '8px',
    },
};

const Dashboard = () => {
    const [stats, setStats] = useState({
        maestros: 0,
        materias: 0,
        grupos: 0,
        horarios: 0,
        planes: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const [maestros, materias, grupos, horarios, planes] = await Promise.all([
                    api.getMaestros(),
                    api.getMaterias(),
                    api.getGrupos(),
                    api.getHorarios(),
                    api.getPlanesEstudios(),
                ]);
                setStats({
                    maestros: maestros.length,
                    materias: materias.length,
                    grupos: grupos.length,
                    horarios: horarios.length,
                    planes: planes.length,
                });
            } catch (err) {
                console.error('Error loading stats:', err);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);

    const statCards = [
        { label: 'Total Maestros', value: stats.maestros, color: '#2563eb' },
        { label: 'Materias Activas', value: stats.materias, color: '#16a34a' },
        { label: 'Grupos', value: stats.grupos, color: '#9333ea' },
        { label: 'Horarios Generados', value: stats.horarios, color: '#ea580c' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-fade-in">
            <div>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#171717' }}>Dashboard</h1>
                <p style={{ color: '#737373', marginTop: '4px' }}>Sistema de generacion automatica de horarios universitarios</p>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
                {statCards.map((stat, index) => (
                    <div key={index} style={styles.card}>
                        <p style={{ fontSize: '14px', fontWeight: '500', color: '#737373' }}>{stat.label}</p>
                        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '8px' }}>
                            <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#171717' }}>
                                {loading ? '-' : stat.value}
                            </span>
                        </div>
                        <div style={{ marginTop: '12px', height: '4px', backgroundColor: '#f5f5f5', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: '60%', backgroundColor: stat.color, borderRadius: '2px' }}></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* System Status */}
                <div style={styles.cardDark}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '16px' }}>Estado del Sistema</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8', fontSize: '14px' }}>Backend API</span>
                            <span style={{ color: '#4ade80', fontWeight: '500', fontSize: '14px' }}>Conectado</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8', fontSize: '14px' }}>Base de Datos</span>
                            <span style={{ color: '#4ade80', fontWeight: '500', fontSize: '14px' }}>Activa</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8', fontSize: '14px' }}>Planes de Estudios</span>
                            <span style={{ color: 'white', fontWeight: '500', fontSize: '14px' }}>{loading ? '-' : stats.planes}</span>
                        </div>
                        <div style={{ paddingTop: '16px', borderTop: '1px solid #1e293b' }}>
                            <Link to="/generar" style={{ ...styles.btnPrimary, backgroundColor: '#22c55e' }}>
                                Generar Nuevos Horarios
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Quick Access */}
                <div style={styles.card}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#171717', marginBottom: '16px' }}>Accesos Rapidos</h3>
                    <Link to="/maestros" style={styles.btnSecondary}>Gestionar Maestros</Link>
                    <Link to="/materias" style={styles.btnSecondary}>Gestionar Materias</Link>
                    <Link to="/planes" style={styles.btnSecondary}>Planes de Estudios</Link>
                    <Link to="/grupos" style={styles.btnSecondary}>Ver Grupos</Link>
                    <Link to="/horarios" style={styles.btnSecondary}>Ver Horarios</Link>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
