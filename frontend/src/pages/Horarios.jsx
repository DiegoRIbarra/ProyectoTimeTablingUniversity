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
// Mapeadas al backend por hora_inicio entero (7..14). El receso se ubica entre 10 y 11.
const SESIONES = [
    { id: 1, label: '07:00 - 07:55', horaInicioInt: 7 },
    { id: 2, label: '07:55 - 08:50', horaInicioInt: 8 },
    { id: 3, label: '08:50 - 09:45', horaInicioInt: 9 },
    { id: 4, label: '09:45 - 10:40', horaInicioInt: 10 },
    { id: 'receso', label: '10:40 - 11:10 (Receso)', esReceso: true },
    { id: 5, label: '11:10 - 12:05', horaInicioInt: 11 },
    { id: 6, label: '12:05 - 13:00', horaInicioInt: 12 },
    { id: 7, label: '13:00 - 13:55', horaInicioInt: 13 },
    { id: 8, label: '14:00 - 14:55', horaInicioInt: 14 },
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

                    {/* Tabla de Horario + Créditos */}
                    {loadingDetalle ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#737373' }}>Cargando horario...</div>
                    ) : horarioDetalle ? (
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div style={{ ...styles.card, overflowX: 'auto', padding: '16px', flex: 1 }}>
                                {/* Header info */}
                                <div style={{ marginBottom: '16px', fontSize: '13px' }}>
                                    <p><strong>Grupo:</strong> {selectedGrupo}</p>
                                </div>

                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#1e3a5f', color: 'white' }}>
                                            <th style={{ ...styles.tableCell, fontWeight: '600', backgroundColor: '#1e3a5f', color: 'white', width: '140px' }}>Hora</th>
                                            {DIAS.map(d => (
                                                <th key={d} style={{ ...styles.tableCell, fontWeight: '600', backgroundColor: '#1e3a5f', color: 'white' }}>{DIAS_DISPLAY[d]}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const asignaciones = getAsignacionesFiltradas();
                                            // Construir índice por (dia, hora_inicio)
                                            const idx = {};
                                            for (const a of asignaciones) {
                                                const key = `${a.dia}|${a.hora_inicio}`;
                                                idx[key] = a;
                                            }

                                            return SESIONES.map((s) => {
                                                if (s.esReceso) {
                                                    return (
                                                        <tr key="receso" style={{ backgroundColor: '#f3f4f6' }}>
                                                            <td style={{ ...styles.tableCell, fontWeight: '600' }}>{s.label}</td>
                                                            {DIAS.map(d => (
                                                                <td key={d} style={{ ...styles.tableCell, textAlign: 'center', color: '#9CA3AF' }}>RECESO</td>
                                                            ))}
                                                        </tr>
                                                    );
                                                }
                                                return (
                                                    <tr key={s.id}>
                                                        <td style={{ ...styles.tableCell, fontWeight: '600' }}>{s.label}</td>
                                                        {DIAS.map(d => {
                                                            const a = idx[`${d}|${s.horaInicioInt}`];
                                                            return (
                                                                <td key={d} style={styles.tableCell}>
                                                                    {a ? (
                                                                        <div style={{ ...styles.scheduleBlock }}>
                                                                            <div style={{ fontWeight: '700', fontSize: '12px', color: '#0f172a' }}>{a.materia}</div>
                                                                            <div style={{ fontSize: '11px', color: '#334155' }}>{a.maestro}</div>
                                                                            <div style={{ fontSize: '10px', color: '#6b7280' }}>{a.grupo} · Aula: {a.aula}</div>
                                                                        </div>
                                                                    ) : (
                                                                        <span style={{ color: '#9CA3AF', fontSize: '11px' }}>—</span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                </table>

                                {/* Total sesiones */}
                                <div style={{ marginTop: '12px', textAlign: 'right', fontSize: '14px' }}>
                                    <strong>Total de Sesiones:</strong> {getAsignacionesFiltradas().length}
                                </div>

                                {/* Info de sesiones */}
                                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px', fontSize: '12px' }}>
                                    <p style={{ fontWeight: '600', marginBottom: '8px' }}>Sesiones (55 min c/u):</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                        {SESIONES.filter(s => !s.esReceso).map(s => (
                                            <span key={s.id}>Sesión {s.id}: {s.label}</span>
                                        ))}
                                    </div>
                                    <p style={{ marginTop: '8px', color: '#92400e' }}>
                                        <strong>Receso:</strong> 10:40 - 11:10
                                    </p>
                                </div>
                            </div>

                            {/* Sidebar de Créditos */}
                            <div style={{ ...styles.card, width: '160px', padding: '12px' }}>
                                <div style={{ fontWeight: '700', color: '#111827', marginBottom: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '6px' }}>Créditos</div>
                                {(() => {
                                    const asignaciones = getAsignacionesFiltradas();
                                    const countByMateria = {};
                                    for (const a of asignaciones) {
                                        countByMateria[a.materia] = (countByMateria[a.materia] || 0) + 1;
                                    }
                                    const lista = Object.entries(countByMateria).map(([materia, creditos]) => ({ materia, creditos }));
                                    lista.sort((a, b) => b.creditos - a.creditos);
                                    const total = lista.reduce((s, x) => s + x.creditos, 0);
                                    return (
                                        <div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {lista.map((item, idx) => (
                                                    <div key={`${item.materia}-${idx}`} style={{ border: '1px dashed #d1d5db', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                                                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>{item.creditos}</div>
                                                        {/*<div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>{item.materia}</div>*/}
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ marginTop: '10px', textAlign: 'right', color: '#111827' }}>
                                                <span style={{ fontWeight: 600 }}>= {total}</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
};

export default Horarios;
