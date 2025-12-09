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
    select: {
        padding: '10px 12px',
        border: '1px solid #d4d4d4',
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none',
        backgroundColor: 'white',
        minWidth: '200px',
    },
    tableCell: {
        border: '1px solid #d4d4d4',
        padding: '6px 8px',
        fontSize: '11px',
        verticalAlign: 'top',
        minWidth: '120px',
    },
    scheduleBlock: {
        backgroundColor: '#dbeafe',
        border: '1px solid #93c5fd',
        borderRadius: '4px',
        padding: '4px 6px',
        fontSize: '10px',
    },
};

// Sesiones de 55 minutos con receso de 10:40-11:10
const SESIONES = [
    { id: 1, inicio: '07:00', fin: '07:54' },
    { id: 2, inicio: '07:55', fin: '08:49' },
    { id: 3, inicio: '08:50', fin: '09:44' },
    { id: 4, inicio: '09:45', fin: '10:39' },
    { id: 'receso', inicio: '10:40', fin: '11:09', esReceso: true },
    { id: 5, inicio: '11:10', fin: '12:04' },
    { id: 6, inicio: '12:05', fin: '12:59' },
    { id: 7, inicio: '13:00', fin: '13:54' },
];

// Solo Lunes a Viernes (usar etiquetas del backend para evitar mismatch)
// El backend devuelve "Miercoles" sin acento; aquí normalizamos para comparar correctamente
const DIAS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'];
const DIAS_DISPLAY = { Lunes: 'Lunes', Martes: 'Martes', Miercoles: 'Miércoles', Jueves: 'Jueves', Viernes: 'Viernes' };

const Horarios = () => {
    const [horarios, setHorarios] = useState([]);
    const [grupos, setGrupos] = useState([]);
    const [selectedGrupo, setSelectedGrupo] = useState('');
    const [selectedHorario, setSelectedHorario] = useState(null);
    const [horarioDetalle, setHorarioDetalle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingDetalle, setLoadingDetalle] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [horariosData, gruposData] = await Promise.all([
                    api.getHorarios(),
                    api.getGrupos(),
                ]);
                setHorarios(horariosData);
                setGrupos(gruposData);
                if (gruposData.length > 0) {
                    setSelectedGrupo(gruposData[0].nombre);
                }
                // Intentar seleccionar el horario que corresponde al primer grupo
                if (horariosData.length > 0 && gruposData.length > 0) {
                    // Cargar el detalle de cada horario y elegir el que contiene al grupo
                    for (const h of horariosData) {
                        try {
                            const detalle = await api.getHorario(h.id);
                            const contieneGrupo = (detalle.asignaciones || []).some(a => a.grupo === gruposData[0].nombre);
                            if (contieneGrupo) {
                                setSelectedHorario(h.id);
                                break;
                            }
                        } catch (_) { /* ignorar errores individuales */ }
                    }
                    // Si no se encontró, usar el primero
                    if (!selectedHorario) setSelectedHorario(horariosData[0].id);
                }
            } catch (err) {
                setError('Error al cargar datos');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        const loadHorarioDetalle = async () => {
            if (!selectedHorario) {
                setHorarioDetalle(null);
                return;
            }
            try {
                setLoadingDetalle(true);
                const detalle = await api.getHorario(selectedHorario);
                setHorarioDetalle(detalle);
            } catch (err) {
                setError('Error al cargar detalle del horario');
            } finally {
                setLoadingDetalle(false);
            }
        };
        loadHorarioDetalle();
    }, [selectedHorario]);

    // Cuando cambia el grupo, seleccionar automáticamente el horario que lo contiene
    useEffect(() => {
        const seleccionarHorarioPorGrupo = async () => {
            if (!selectedGrupo || horarios.length === 0) return;
            for (const h of horarios) {
                try {
                    const detalle = await api.getHorario(h.id);
                    const contieneGrupo = (detalle.asignaciones || []).some(a => a.grupo === selectedGrupo);
                    if (contieneGrupo) {
                        setSelectedHorario(h.id);
                        setHorarioDetalle(detalle);
                        return;
                    }
                } catch (_) { /* ignorar errores individuales */ }
            }
            // Si ninguno contiene el grupo, limpiar detalle
            setHorarioDetalle(null);
        };
        seleccionarHorarioPorGrupo();
    }, [selectedGrupo, horarios]);

    // Filtrar asignaciones por grupo seleccionado
    const getAsignacionesFiltradas = () => {
        if (!horarioDetalle || !horarioDetalle.asignaciones) return [];
        if (!selectedGrupo) return horarioDetalle.asignaciones;
        return horarioDetalle.asignaciones.filter(a => a.grupo === selectedGrupo);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
            <div>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#171717' }}>HORARIO DE CLASES</h1>
                <p style={{ color: '#737373', marginTop: '4px' }}>Visualización de horarios por grupo</p>
            </div>

            {error && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px' }}>
                    {error}
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#737373' }}>Cargando...</div>
            ) : horarios.length === 0 ? (
                <div style={styles.card}>
                    <div style={{ textAlign: 'center', padding: '40px', color: '#737373' }}>
                        <p style={{ fontSize: '18px', marginBottom: '8px' }}>No hay horarios generados</p>
                        <p>Ve a "Generar Horarios" para crear nuevos horarios</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Filtros */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#404040', marginBottom: '6px' }}>
                                Grupo
                            </label>
                            <select
                                value={selectedGrupo}
                                onChange={(e) => setSelectedGrupo(e.target.value)}
                                style={styles.select}
                            >
                                {grupos.map(g => (
                                    <option key={g.id} value={g.nombre}>{g.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Tabla de Horario */}
                    {loadingDetalle ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#737373' }}>Cargando horario...</div>
                    ) : horarioDetalle ? (
                        <div style={{ ...styles.card, overflowX: 'auto', padding: '16px' }}>
                            {/* Header info */}
                            <div style={{ marginBottom: '16px', fontSize: '13px' }}>
                                <p><strong>Grupo:</strong> {selectedGrupo}</p>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#1e3a5f', color: 'white' }}>
                                        <th style={{ ...styles.tableCell, fontWeight: '600', backgroundColor: '#1e3a5f', color: 'white', width: '150px' }}>Materia</th>
                                        <th style={{ ...styles.tableCell, fontWeight: '600', backgroundColor: '#1e3a5f', color: 'white', width: '150px' }}>Profesor</th>
                                        {DIAS.map(d => (
                                            <th key={d} style={{ ...styles.tableCell, fontWeight: '600', backgroundColor: '#1e3a5f', color: 'white' }}>{DIAS_DISPLAY[d]}</th>
                                        ))}
                                        <th style={{ ...styles.tableCell, fontWeight: '600', backgroundColor: '#1e3a5f', color: 'white', width: '60px' }}>Créditos</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Agrupar por materia */}
                                    {(() => {
                                        const asignaciones = getAsignacionesFiltradas();
                                        const materias = [...new Set(asignaciones.map(a => a.materia))];

                                        return materias.map((materia, idx) => {
                                            const asigMateria = asignaciones.filter(a => a.materia === materia);
                                            // Mostrar todos los profesores únicos que dan esta materia
                                            const profesores = [...new Set(asigMateria.map(a => a.maestro))];
                                            const profesorDisplay = profesores.length === 1 ? profesores[0] : profesores.join(', ');

                                            const creditos = asigMateria.length;

                                            return (
                                                <tr key={materia} style={{ backgroundColor: idx % 2 === 0 ? '#f9fafb' : 'white' }}>
                                                    <td style={{ ...styles.tableCell, fontWeight: '500' }}>{materia}</td>
                                                    <td style={{ ...styles.tableCell, fontStyle: 'italic', color: '#525252', fontSize: '10px' }}>{profesorDisplay}</td>
                                                    {DIAS.map((dia, diaIdx) => {
                                                        const asigsDia = asigMateria.filter(a => a.dia === dia);
                                                        return (
                                                            <td key={dia} style={styles.tableCell}>
                                                                {asigsDia.map((asig, i) => (
                                                                    <div key={i} style={{ marginBottom: '4px', fontSize: '10px', padding: '2px 4px', backgroundColor: '#e0f2fe', borderRadius: '4px' }}>
                                                                        <div style={{ fontWeight: '600' }}>{asig.hora_inicio} - {asig.hora_fin}</div>
                                                                        <div style={{ fontSize: '9px', color: '#0369a1' }}>{asig.maestro}</div>
                                                                    </div>
                                                                ))}
                                                            </td>
                                                        );
                                                    })}
                                                    <td style={{ ...styles.tableCell, textAlign: 'center', fontWeight: '600' }}>{creditos}</td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>

                            {/* Total créditos */}
                            <div style={{ marginTop: '12px', textAlign: 'right', fontSize: '14px' }}>
                                <strong>Total de Sesiones:</strong> {getAsignacionesFiltradas().length}
                            </div>

                            {/* Info de sesiones */}
                            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px', fontSize: '12px' }}>
                                <p style={{ fontWeight: '600', marginBottom: '8px' }}>Sesiones (55 min c/u):</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                    {SESIONES.filter(s => !s.esReceso).map(s => (
                                        <span key={s.id}>Sesión {s.id}: {s.inicio} - {s.fin}</span>
                                    ))}
                                </div>
                                <p style={{ marginTop: '8px', color: '#92400e' }}>
                                    <strong>Receso:</strong> 10:40 - 11:10
                                </p>
                            </div>
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
};

export default Horarios;
