import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const CUATRIMESTRES_VALIDOS = [1, 2, 3, 4, 5, 7, 8, 9];
const CAPACIDAD_AULA = 35;

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
    },
    title: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#171717',
        margin: 0,
    },
    subtitle: {
        fontSize: '14px',
        color: '#737373',
        marginTop: '4px',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e5e5',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden',
    },
    cardHeader: {
        backgroundColor: '#1e3a5f',
        padding: '16px 20px',
        color: 'white',
        fontWeight: '600',
        fontSize: '16px',
    },
    cardBody: {
        padding: '20px',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
    },
    gridLg: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px',
    },
    label: {
        display: 'block',
        fontSize: '14px',
        fontWeight: '500',
        color: '#404040',
        marginBottom: '8px',
    },
    select: {
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #d4d4d4',
        borderRadius: '8px',
        fontSize: '14px',
        backgroundColor: '#fafafa',
    },
    checkbox: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        borderRadius: '10px',
        border: '2px solid #e5e5e5',
        cursor: 'pointer',
        transition: 'all 0.2s',
        backgroundColor: 'white',
    },
    checkboxSelected: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        borderRadius: '10px',
        border: '2px solid #2563eb',
        cursor: 'pointer',
        transition: 'all 0.2s',
        backgroundColor: '#eff6ff',
    },
    input: {
        width: '70px',
        padding: '8px 10px',
        border: '1px solid #d4d4d4',
        borderRadius: '6px',
        fontSize: '14px',
        textAlign: 'center',
    },
    btnPrimary: {
        width: '100%',
        padding: '14px 20px',
        backgroundColor: '#2563eb',
        color: 'white',
        fontWeight: '600',
        fontSize: '15px',
        borderRadius: '10px',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    btnPrimaryDisabled: {
        width: '100%',
        padding: '14px 20px',
        backgroundColor: '#93c5fd',
        color: 'white',
        fontWeight: '600',
        fontSize: '15px',
        borderRadius: '10px',
        border: 'none',
        cursor: 'not-allowed',
    },
    btnDanger: {
        padding: '10px 16px',
        backgroundColor: '#dc2626',
        color: 'white',
        fontWeight: '500',
        fontSize: '14px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
    },
    alertError: {
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        padding: '14px 16px',
        color: '#dc2626',
        fontSize: '14px',
    },
    alertSuccess: {
        backgroundColor: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '8px',
        padding: '14px 16px',
        color: '#16a34a',
        fontSize: '14px',
    },
    alertWarning: {
        backgroundColor: '#fffbeb',
        border: '1px solid #fde68a',
        borderRadius: '8px',
        padding: '14px 16px',
        color: '#d97706',
        fontSize: '14px',
    },
    infoBox: {
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        padding: '14px 16px',
        fontSize: '13px',
        color: '#525252',
    },
    summaryBox: {
        backgroundColor: '#1e3a5f',
        borderRadius: '10px',
        padding: '18px',
        color: 'white',
    },
    summaryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
    },
    summaryItem: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: '8px',
        padding: '12px',
    },
    summaryLabel: {
        fontSize: '12px',
        color: 'rgba(255,255,255,0.7)',
        marginBottom: '4px',
    },
    summaryValue: {
        fontSize: '20px',
        fontWeight: '700',
    },
    cuatriItem: {
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e5e5',
        borderRadius: '10px',
        padding: '16px',
        marginBottom: '12px',
    },
    cuatriHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
    },
    cuatriName: {
        fontWeight: '600',
        color: '#171717',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    cuatriDot: {
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        backgroundColor: '#2563eb',
    },
    cuatriDetail: {
        fontSize: '13px',
        color: '#525252',
        paddingLeft: '18px',
    },
    loading: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '300px',
        color: '#737373',
    },
    emptyState: {
        textAlign: 'center',
        padding: '40px',
        color: '#a3a3a3',
    },
};

const GenerarHorarios = () => {
    const [planes, setPlanes] = useState([]);
    const [maestros, setMaestros] = useState([]);
    const [aulas, setAulas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [warnings, setWarnings] = useState([]);

    const [selectedPlan, setSelectedPlan] = useState('');
    const [cuatrimestresSeleccionados, setCuatrimestresSeleccionados] = useState([]);
    const [alumnosPorCuatrimestre, setAlumnosPorCuatrimestre] = useState({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [planesRes, maestrosRes, aulasRes] = await Promise.allSettled([
                api.getPlanesEstudios(),
                api.getMaestros(),
                api.getAulas()
            ]);

            if (planesRes.status === 'fulfilled') setPlanes(planesRes.value || []);
            if (maestrosRes.status === 'fulfilled') setMaestros(maestrosRes.value || []);
            if (aulasRes.status === 'fulfilled') setAulas(aulasRes.value || []);

            if (planesRes.status === 'fulfilled' && planesRes.value?.length > 0) {
                setSelectedPlan(planesRes.value[0].id.toString());
            }
        } catch (err) {
            setError('Error al cargar datos iniciales');
        } finally {
            setLoading(false);
        }
    };

    const toggleCuatrimestre = (cuatri) => {
        if (cuatrimestresSeleccionados.includes(cuatri)) {
            setCuatrimestresSeleccionados(prev => prev.filter(c => c !== cuatri));
            const newAlumnos = { ...alumnosPorCuatrimestre };
            delete newAlumnos[cuatri];
            setAlumnosPorCuatrimestre(newAlumnos);
        } else {
            // Limitar a máximo 4 cuatrimestres seleccionados
            setCuatrimestresSeleccionados(prev => {
                if (prev.length >= 4) {
                    setError('Solo puedes seleccionar hasta 4 cuatrimestres');
                    return prev;
                }
                setError(null);
                return [...prev, cuatri].sort((a, b) => a - b);
            });
            setAlumnosPorCuatrimestre(prev => ({ ...prev, [cuatri]: 35 }));
        }
    };

    const calcularGrupos = (alumnos) => Math.ceil(alumnos / CAPACIDAD_AULA) || 1;

    const totalGrupos = Object.values(alumnosPorCuatrimestre).reduce((sum, alumnos) => sum + calcularGrupos(alumnos), 0);
    const totalAlumnos = Object.values(alumnosPorCuatrimestre).reduce((sum, alumnos) => sum + (parseInt(alumnos) || 0), 0);
    const aulasDisponibles = aulas.filter(a => a.disponible !== false).length;

    // Validez: todos los cuatrimestres seleccionados deben sumar 35 créditos
    const planSeleccionadoObj = planes.find(p => p.id?.toString() === selectedPlan?.toString());
    const todos35 = (() => {
        if (!planSeleccionadoObj || !planSeleccionadoObj.materias_por_cuatrimestre) return true;
        for (const c of cuatrimestresSeleccionados) {
            const mats = planSeleccionadoObj.materias_por_cuatrimestre[c] || [];
            const total = mats.reduce((s, m) => s + (m.horas_semanales || 0), 0);
            if (total !== 35) return false;
        }
        return true;
    })();

    const handleGenerar = async () => {
        if (!selectedPlan) {
            setError('Seleccione un plan de estudios');
            return;
        }
        if (cuatrimestresSeleccionados.length === 0) {
            setError('Seleccione al menos un cuatrimestre');
            return;
        }

        // Prevalidación: cada cuatrimestre seleccionado debe sumar exactamente 35 horas
        const planSel = planes.find(p => p.id?.toString() === selectedPlan?.toString());
        if (planSel && planSel.materias_por_cuatrimestre) {
            const errores = [];
            for (const c of cuatrimestresSeleccionados) {
                const mats = planSel.materias_por_cuatrimestre[c] || [];
                const total = mats.reduce((s, m) => s + (m.horas_semanales || 0), 0);
                if (total !== 35) errores.push(`${c}º cuatrimestre: ${total} horas (se requieren 35)`);
            }
            if (errores.length > 0) {
                setError(`Ajusta las materias del plan:\n${errores.join('\n')}`);
                return;
            }
        }

        try {
            setGenerating(true);
            setError(null);
            setSuccess(null);
            setWarnings([]);

            const gruposPorCuatri = {};
            cuatrimestresSeleccionados.forEach(cuatri => {
                gruposPorCuatri[cuatri] = calcularGrupos(alumnosPorCuatrimestre[cuatri] || 35);
            });

            const res = await api.generarHorario({
                plan_id: parseInt(selectedPlan),
                maestro_ids: maestros.map(m => m.id),
                cuatrimestres_seleccionados: cuatrimestresSeleccionados,
                grupos_por_cuatrimestre: gruposPorCuatri,
                turno: 'matutino',
            });

            if (res.advertencias?.length > 0) {
                setWarnings(res.advertencias);
                setSuccess(`Horarios generados con ${res.advertencias.length} advertencia(s)`);
            } else {
                setSuccess(`Horarios generados exitosamente - ${totalGrupos} grupo(s)`);
            }
        } catch (err) {
            setError(err.message || 'Error al generar horarios');
        } finally {
            setGenerating(false);
        }
    };

    const handleEliminar = async () => {
        if (!confirm('¿Eliminar todos los horarios generados?')) return;
        try {
            await api.eliminarTodosHorarios();
            setSuccess('Horarios eliminados correctamente');
        } catch (err) {
            setError('Error al eliminar horarios');
        }
    };

    const getNombreCuatri = (c) => {
        const nombres = { 1: '1er', 2: '2do', 3: '3er', 4: '4to', 5: '5to', 7: '7mo', 8: '8vo', 9: '9no' };
        return `${nombres[c]} Cuatrimestre`;
    };

    if (loading) {
        return <div style={styles.loading}>Cargando...</div>;
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Generar Horarios</h1>
                    <p style={styles.subtitle}>Configure los parámetros y genere horarios automáticamente</p>
                </div>
                <button style={styles.btnDanger} onClick={handleEliminar}>
                    Eliminar Todos
                </button>
            </div>

            {/* Alerts */}
            {error && <div style={styles.alertError}>{error}</div>}

            {warnings.length > 0 && (
                <div style={styles.alertWarning}>
                    <strong>Advertencias:</strong>
                    <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                        {warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                </div>
            )}

            {success && <div style={styles.alertSuccess}>{success}</div>}

            {/* Main Grid */}
            <div style={styles.gridLg}>
                {/* Left Card */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>Seleccione Cuatrimestres</div>
                    <div style={styles.cardBody}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={styles.label}>Plan de Estudios</label>
                            <select
                                style={styles.select}
                                value={selectedPlan}
                                onChange={(e) => setSelectedPlan(e.target.value)}
                            >
                                <option value="">Seleccione un plan...</option>
                                {planes.map(p => (
                                    <option key={p.id} value={p.id}>{p.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div style={styles.grid}>
                            {CUATRIMESTRES_VALIDOS.map(cuatri => (
                                <label
                                    key={cuatri}
                                    style={cuatrimestresSeleccionados.includes(cuatri) ? styles.checkboxSelected : styles.checkbox}
                                    onClick={() => {
                                        if (cuatrimestresSeleccionados.length >= 4 && !cuatrimestresSeleccionados.includes(cuatri)) return;
                                        toggleCuatrimestre(cuatri);
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={cuatrimestresSeleccionados.includes(cuatri)}
                                        onChange={() => { }}
                                        disabled={cuatrimestresSeleccionados.length >= 4 && !cuatrimestresSeleccionados.includes(cuatri)}
                                        style={{ width: '18px', height: '18px', accentColor: '#2563eb' }}
                                    />
                                    <span style={{ fontWeight: '500', color: cuatrimestresSeleccionados.includes(cuatri) ? '#1d4ed8' : '#404040' }}>
                                        {getNombreCuatri(cuatri)}
                                    </span>
                                </label>
                            ))}
                        </div>

                        <div style={{ ...styles.alertWarning, marginTop: '20px' }}>
                            <strong>Nota:</strong> 6to y 10mo cuatrimestre son períodos de estadías y no requieren horarios.
                        </div>
                        {(() => {
                            const planSel = planes.find(p => p.id?.toString() === selectedPlan?.toString());
                            if (!planSel || !planSel.materias_por_cuatrimestre) return null;
                            const resumen = cuatrimestresSeleccionados.map(c => {
                                const mats = planSel.materias_por_cuatrimestre[c] || [];
                                const total = mats.reduce((s, m) => s + (m.horas_semanales || 0), 0);
                                return `${c}°: ${total}/35`;
                            });
                            if (resumen.length === 0) return null;
                            return (
                                <div style={{ ...styles.infoBox, marginTop: '12px', backgroundColor: '#eef2ff', color: '#1e3a8a' }}>
                                    <div><strong>Créditos por cuatrimestre seleccionado:</strong> {resumen.join(' · ')}</div>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Right Card */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>Configurar Alumnos por Cuatrimestre</div>
                    <div style={styles.cardBody}>
                        {cuatrimestresSeleccionados.length === 0 ? (
                            <div style={styles.emptyState}>
                                <p>Seleccione cuatrimestres para configurar</p>
                            </div>
                        ) : (
                            <>
                                {cuatrimestresSeleccionados.map(cuatri => {
                                    const alumnos = alumnosPorCuatrimestre[cuatri] || 35;
                                    const grupos = calcularGrupos(alumnos);
                                    const letras = 'ABCDEFGHIJ';
                                    const nombresGrupos = Array.from({ length: grupos }, (_, i) => `${cuatri}${letras[i]}`).join(', ');

                                    return (
                                        <div key={cuatri} style={styles.cuatriItem}>
                                            <div style={styles.cuatriHeader}>
                                                <span style={styles.cuatriName}>
                                                    <span style={styles.cuatriDot}></span>
                                                    {getNombreCuatri(cuatri)}
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="500"
                                                        value={alumnos}
                                                        onChange={(e) => setAlumnosPorCuatrimestre(prev => ({
                                                            ...prev,
                                                            [cuatri]: Math.max(1, parseInt(e.target.value) || 1)
                                                        }))}
                                                        style={styles.input}
                                                    />
                                                    <span style={{ fontSize: '13px', color: '#737373' }}>alumnos</span>
                                                </div>
                                            </div>
                                            <div style={styles.cuatriDetail}>
                                                Grupos: <strong>{grupos}</strong> ({nombresGrupos}) | Aulas: <strong>{grupos}</strong>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Summary */}
                                <div style={styles.summaryBox}>
                                    <div style={{ fontWeight: '600', marginBottom: '14px', fontSize: '15px' }}>Resumen</div>
                                    <div style={styles.summaryGrid}>
                                        <div style={styles.summaryItem}>
                                            <div style={styles.summaryLabel}>Grupos a crear</div>
                                            <div style={styles.summaryValue}>{totalGrupos}</div>
                                        </div>
                                        <div style={styles.summaryItem}>
                                            <div style={styles.summaryLabel}>Total alumnos</div>
                                            <div style={styles.summaryValue}>{totalAlumnos}</div>
                                        </div>
                                        <div style={styles.summaryItem}>
                                            <div style={styles.summaryLabel}>Aulas necesarias</div>
                                            <div style={styles.summaryValue}>{totalGrupos}</div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Info */}
                        <div style={{ ...styles.infoBox, marginTop: '16px' }}>
                            <div><strong>Horario:</strong> 07:00 - 14:50 (8 sesiones de 55 min)</div>
                            <div><strong>Receso:</strong> 10:40 - 11:10 (obligatorio)</div>
                            <div><strong>Maestros disponibles:</strong> {maestros.length}</div>
                        </div>

                        {/* Button */}
                        <button
                            onClick={handleGenerar}
                            disabled={generating || !selectedPlan || cuatrimestresSeleccionados.length === 0 || !todos35}
                            style={generating || !selectedPlan || cuatrimestresSeleccionados.length === 0 || !todos35 ? styles.btnPrimaryDisabled : styles.btnPrimary}
                        >
                            {generating ? 'Generando...' : `Generar ${totalGrupos} Horario(s)`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GenerarHorarios;
