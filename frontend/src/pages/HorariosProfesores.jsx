import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const DIAS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'];

const SESIONES = [
    { id: 0, hora: '07:00 - 07:55', horaNum: 7 },
    { id: 1, hora: '07:55 - 08:50', horaNum: 8 },
    { id: 2, hora: '08:50 - 09:45', horaNum: 9 },
    { id: 3, hora: '09:45 - 10:40', horaNum: 10 },
    { id: 'receso', hora: '10:40 - 11:10', esReceso: true },
    { id: 5, hora: '11:10 - 12:05', horaNum: 11 },
    { id: 6, hora: '12:05 - 13:00', horaNum: 12 },
    { id: 7, hora: '13:00 - 13:55', horaNum: 13 },
    { id: 8, hora: '13:55 - 14:50', horaNum: 14 },
];

const styles = {
    container: { display: 'flex', flexDirection: 'column', gap: '24px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' },
    title: { fontSize: '24px', fontWeight: '700', color: '#171717', margin: 0 },
    subtitle: { fontSize: '14px', color: '#737373', marginTop: '4px' },
    btn: { padding: '10px 16px', backgroundColor: '#f5f5f5', border: '1px solid #e5e5e5', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: '500', color: '#404040' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },
    card: { backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e5e5', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' },
    cardBody: { padding: '20px' },
    cardName: { fontSize: '16px', fontWeight: '600', color: '#171717', marginBottom: '4px' },
    cardEmail: { fontSize: '13px', color: '#737373', marginBottom: '12px' },
    cardInfo: { fontSize: '13px', color: '#525252', marginBottom: '6px' },
    cardLabel: { fontWeight: '600', color: '#404040' },
    cardBtnGroup: { display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' },
    cardBtn: { flex: 1, padding: '8px 12px', fontSize: '13px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', border: 'none' },
    validBadge: { display: 'inline-block', marginTop: '8px', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' },
    modal: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
    modalContent: { backgroundColor: 'white', borderRadius: '16px', maxWidth: '900px', width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e5e5', backgroundColor: '#1e3a5f', color: 'white', borderRadius: '16px 16px 0 0' },
    modalTitle: { fontSize: '18px', fontWeight: '600', margin: 0 },
    modalClose: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'white', opacity: 0.8 },
    modalBody: { padding: '24px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' },
    statBox: { padding: '14px', borderRadius: '10px', textAlign: 'center' },
    statLabel: { fontSize: '12px', color: '#737373', marginBottom: '4px' },
    statValue: { fontSize: '15px', fontWeight: '600' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
    th: { backgroundColor: '#1e3a5f', color: 'white', padding: '12px 8px', fontWeight: '600', textAlign: 'center' },
    td: { border: '1px solid #e5e5e5', padding: '10px 8px', textAlign: 'center' },
    tdReceso: { backgroundColor: '#fef3c7', color: '#92400e', fontWeight: '600', textAlign: 'center', padding: '10px' },
    classCell: { backgroundColor: '#dbeafe', borderRadius: '6px', padding: '6px 4px' },
    classCellMateria: { fontWeight: '600', color: '#1e40af', fontSize: '12px' },
    classCellGrupo: { color: '#3b82f6', fontSize: '11px' },
    exportBtnGroup: { display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' },
    btnPrimary: { padding: '10px 16px', backgroundColor: '#2563eb', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: '500', color: 'white' },
    loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#737373' },
    empty: { textAlign: 'center', padding: '60px 20px', color: '#a3a3a3' },
};

const HorariosProfesores = () => {
    const [maestros, setMaestros] = useState([]);
    const [allAsignaciones, setAllAsignaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProfesor, setSelectedProfesor] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [maestrosData, horariosData] = await Promise.all([api.getMaestros(), api.getHorarios()]);
            setMaestros(maestrosData);
            const todasAsignaciones = [];
            for (const h of horariosData) {
                try {
                    const detalle = await api.getHorario(h.id);
                    if (detalle.asignaciones) todasAsignaciones.push(...detalle.asignaciones);
                } catch (e) { }
            }
            console.log('Total asignaciones cargadas:', todasAsignaciones.length);
            console.log('Maestros únicos en asignaciones:', [...new Set(todasAsignaciones.map(a => a.maestro))]);
            console.log('Todas las asignaciones:', todasAsignaciones.map(a => ({
                maestro: a.maestro,
                materia: a.materia,
                dia: a.dia,
                hora_inicio: a.hora_inicio,
                grupo: a.grupo
            })));
            setAllAsignaciones(todasAsignaciones);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Normalizar nombre para comparación (trim y lowercase)
    const normalizeName = (name) => (name || '').trim().toLowerCase();

    const getAsignacionesProfesor = (nombre) => {
        const nombreNorm = normalizeName(nombre);
        return allAsignaciones.filter(a => normalizeName(a.maestro) === nombreNorm);
    };
    const getMateriasProfesor = (nombre) => [...new Set(getAsignacionesProfesor(nombre).map(a => a.materia))];
    const getGruposProfesor = (nombre) => [...new Set(getAsignacionesProfesor(nombre).map(a => a.grupo))];

    const openModal = (p) => { setSelectedProfesor(p); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setSelectedProfesor(null); };

    const downloadFile = (content, filename, mimeType) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    };

    const exportToCSV = (p) => {
        const asigs = getAsignacionesProfesor(p.nombre);
        let csv = 'Dia,Hora Inicio,Hora Fin,Materia,Grupo\n';
        asigs.forEach(a => { csv += `${a.dia},${a.hora_inicio},${a.hora_fin},${a.materia},${a.grupo}\n`; });
        downloadFile(csv, `horario_${p.nombre.replace(/\s/g, '_')}.csv`, 'text/csv');
    };

    const exportToExcel = (p) => {
        const asigs = getAsignacionesProfesor(p.nombre);
        let content = `Horario de ${p.nombre}\n\nDia\tHora Inicio\tHora Fin\tMateria\tGrupo\n`;
        asigs.forEach(a => { content += `${a.dia}\t${a.hora_inicio}\t${a.hora_fin}\t${a.materia}\t${a.grupo}\n`; });
        downloadFile(content, `horario_${p.nombre.replace(/\s/g, '_')}.xls`, 'application/vnd.ms-excel');
    };

    const exportToPDF = (p) => {
        const asigs = getAsignacionesProfesor(p.nombre);
        const materias = getMateriasProfesor(p.nombre);
        const grupos = getGruposProfesor(p.nombre);
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Horario - ${p.nombre}</title>
<style>body{font-family:Arial,sans-serif;padding:30px;color:#333}h1{color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:10px}.info{margin:20px 0}.info p{margin:5px 0}table{width:100%;border-collapse:collapse;margin-top:20px}th{background-color:#1e3a5f;color:white;padding:12px 8px}td{border:1px solid #ddd;padding:10px 8px;text-align:center}.receso{background-color:#fef3c7;color:#92400e;font-weight:bold}.clase{background-color:#dbeafe}.clase-materia{font-weight:bold;color:#1e40af}.clase-grupo{font-size:12px;color:#3b82f6}@media print{body{padding:0}}</style></head>
<body><h1>Horario: ${p.nombre}</h1><div class="info"><p><strong>Materias:</strong> ${materias.join(', ') || '-'}</p><p><strong>Grupos:</strong> ${grupos.join(', ') || '-'}</p><p><strong>Total horas:</strong> ${asigs.length}</p></div>
<table><thead><tr><th>Hora</th>${DIAS.map(d => `<th>${d}</th>`).join('')}</tr></thead><tbody>
${SESIONES.map(s => {
            if (s.esReceso) return `<tr><td class="receso">${s.hora}</td><td colspan="5" class="receso">RECESO</td></tr>`;
            const celdas = DIAS.map(dia => {
                const c = asigs.find(a => a.dia === dia && parseInt(a.hora_inicio) === s.horaNum);
                return c ? `<td class="clase"><span class="clase-materia">${c.materia}</span><br><span class="clase-grupo">${c.grupo}</span></td>` : '<td>-</td>';
            }).join('');
            return `<tr><td style="background:#f9fafb;font-weight:500">${s.hora}</td>${celdas}</tr>`;
        }).join('')}
</tbody></table><script>window.print();</script></body></html>`;
        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
    };

    const exportAllToCSV = () => {
        let csv = 'Profesor,Dia,Hora Inicio,Hora Fin,Materia,Grupo\n';
        maestros.forEach(m => {
            getAsignacionesProfesor(m.nombre).forEach(a => {
                csv += `${m.nombre},${a.dia},${a.hora_inicio},${a.hora_fin},${a.materia},${a.grupo}\n`;
            });
        });
        downloadFile(csv, 'horarios_todos.csv', 'text/csv');
    };

    const validarSesionesPorDia = (nombre) => {
        const porDia = {};
        getAsignacionesProfesor(nombre).forEach(a => { porDia[a.dia] = (porDia[a.dia] || 0) + 1; });
        return Object.values(porDia).every(c => c <= 2);
    };

    if (loading) return <div style={styles.loading}>Cargando...</div>;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Horarios por Profesor</h1>
                    <p style={styles.subtitle}>Consulte y exporte los horarios individuales</p>
                </div>
                <button style={styles.btn} onClick={exportAllToCSV}>Exportar Todos (CSV)</button>
            </div>

            {maestros.length === 0 ? (
                <div style={styles.empty}>No hay profesores registrados</div>
            ) : (
                <div style={styles.grid}>
                    {maestros.map(p => {
                        const materias = getMateriasProfesor(p.nombre);
                        const grupos = getGruposProfesor(p.nombre);
                        const totalHoras = getAsignacionesProfesor(p.nombre).length;
                        const valid = validarSesionesPorDia(p.nombre);

                        return (
                            <div key={p.id} style={styles.card}>
                                <div style={styles.cardBody}>
                                    <div style={styles.cardName}>{p.nombre}</div>
                                    <div style={styles.cardEmail}>{p.email}</div>
                                    <div style={styles.cardInfo}><span style={styles.cardLabel}>Materias: </span>{materias.length > 0 ? materias.join(', ') : 'Sin asignaciones'}</div>
                                    <div style={styles.cardInfo}><span style={styles.cardLabel}>Grupos: </span>{grupos.length > 0 ? grupos.join(', ') : '-'}</div>
                                    <div style={styles.cardInfo}><span style={styles.cardLabel}>Horas semanales: </span>{totalHoras}</div>
                                    {totalHoras > 0 && (
                                        <div style={{ ...styles.validBadge, backgroundColor: valid ? '#dcfce7' : '#fef2f2', color: valid ? '#16a34a' : '#dc2626' }}>
                                            {valid ? 'Max 2 sesiones/dia OK' : 'Excede limite'}
                                        </div>
                                    )}
                                    <div style={styles.cardBtnGroup}>
                                        <button style={{ ...styles.cardBtn, backgroundColor: '#2563eb', color: 'white' }} onClick={() => openModal(p)}>Ver Horario</button>
                                        <button style={{ ...styles.cardBtn, backgroundColor: '#dc2626', color: 'white' }} onClick={() => exportToPDF(p)}>PDF</button>
                                        <button style={{ ...styles.cardBtn, backgroundColor: '#f5f5f5', color: '#404040' }} onClick={() => exportToCSV(p)}>CSV</button>
                                        <button style={{ ...styles.cardBtn, backgroundColor: '#f5f5f5', color: '#404040' }} onClick={() => exportToExcel(p)}>Excel</button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showModal && selectedProfesor && (
                <div style={styles.modal} onClick={closeModal}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>Horario: {selectedProfesor.nombre}</h2>
                            <button style={styles.modalClose} onClick={closeModal}>×</button>
                        </div>
                        <div style={styles.modalBody}>
                            <div style={styles.statsGrid}>
                                <div style={{ ...styles.statBox, backgroundColor: '#eff6ff' }}>
                                    <div style={styles.statLabel}>Materias</div>
                                    <div style={{ ...styles.statValue, color: '#2563eb' }}>{getMateriasProfesor(selectedProfesor.nombre).join(', ') || '-'}</div>
                                </div>
                                <div style={{ ...styles.statBox, backgroundColor: '#f0fdf4' }}>
                                    <div style={styles.statLabel}>Grupos</div>
                                    <div style={{ ...styles.statValue, color: '#16a34a' }}>{getGruposProfesor(selectedProfesor.nombre).join(', ') || '-'}</div>
                                </div>
                                <div style={{ ...styles.statBox, backgroundColor: '#faf5ff' }}>
                                    <div style={styles.statLabel}>Total Horas</div>
                                    <div style={{ ...styles.statValue, color: '#9333ea' }}>{getAsignacionesProfesor(selectedProfesor.nombre).length} hrs/sem</div>
                                </div>
                                <div style={{ ...styles.statBox, backgroundColor: validarSesionesPorDia(selectedProfesor.nombre) ? '#f0fdf4' : '#fef2f2' }}>
                                    <div style={styles.statLabel}>Validacion</div>
                                    <div style={{ ...styles.statValue, color: validarSesionesPorDia(selectedProfesor.nombre) ? '#16a34a' : '#dc2626' }}>{validarSesionesPorDia(selectedProfesor.nombre) ? 'OK' : 'Revisar'}</div>
                                </div>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>Hora</th>
                                            {DIAS.map(d => <th key={d} style={styles.th}>{d}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {SESIONES.map(s => {
                                            if (s.esReceso) return <tr key="receso"><td style={styles.tdReceso}>{s.hora}</td><td colSpan={5} style={styles.tdReceso}>RECESO</td></tr>;
                                            return (
                                                <tr key={s.id}>
                                                    <td style={{ ...styles.td, backgroundColor: '#f9fafb', fontWeight: '500' }}>{s.hora}</td>
                                                    {DIAS.map(dia => {
                                                        const c = getAsignacionesProfesor(selectedProfesor.nombre).find(a => a.dia === dia && parseInt(a.hora_inicio) === s.horaNum);
                                                        return (
                                                            <td key={dia} style={styles.td}>
                                                                {c ? <div style={styles.classCell}><div style={styles.classCellMateria}>{c.materia}</div><div style={styles.classCellGrupo}>{c.grupo}</div></div> : <span style={{ color: '#d4d4d4' }}>-</span>}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div style={styles.exportBtnGroup}>
                                <button style={{ ...styles.btnPrimary, backgroundColor: '#dc2626' }} onClick={() => exportToPDF(selectedProfesor)}>Exportar PDF</button>
                                <button style={styles.btnPrimary} onClick={() => exportToCSV(selectedProfesor)}>Exportar CSV</button>
                                <button style={styles.btn} onClick={() => exportToExcel(selectedProfesor)}>Exportar Excel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HorariosProfesores;
