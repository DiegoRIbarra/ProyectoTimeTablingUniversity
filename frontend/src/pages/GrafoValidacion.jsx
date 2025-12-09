import React, { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { api } from '../services/api';

// Colores por tipo de nodo (como en el ejemplo)
const NODE_COLORS = {
    curso: '#3b82f6',       // azul
    profesor: '#10b981',    // verde
    grupo: '#f59e0b',       // naranja
    slot: '#6b7280',        // gris
};

const styles = {
    container: { display: 'flex', flexDirection: 'column', gap: '20px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' },
    title: { fontSize: '24px', fontWeight: '700', color: '#171717', margin: 0 },
    subtitle: { fontSize: '14px', color: '#737373', marginTop: '4px' },
    controls: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' },
    select: { padding: '10px 14px', border: '1px solid #d4d4d4', borderRadius: '8px', fontSize: '14px', backgroundColor: 'white', minWidth: '180px' },
    checkbox: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#525252' },
    btn: { padding: '10px 16px', backgroundColor: '#f5f5f5', border: '1px solid #e5e5e5', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: '500' },
    stats: { display: 'flex', gap: '20px', fontSize: '14px', color: '#525252' },
    mainContent: { display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' },
    graphCard: { backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e5e5', height: '640px', position: 'relative' },
    sidebar: { backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e5e5', padding: '20px' },
    sidebarTitle: { fontWeight: '600', fontSize: '16px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e5e5e5', color: '#171717' },
    detailSection: { marginBottom: '16px' },
    detailLabel: { fontSize: '12px', color: '#737373', marginBottom: '4px' },
    detailValue: { fontWeight: '600', fontSize: '15px', color: '#171717' },
    infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' },
    infoBox: { backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #f3f4f6' },
    scheduleBox: { backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px', marginBottom: '16px' },
    scheduleRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' },
    conflictWarning: { fontSize: '13px', color: '#dc2626', fontWeight: '500', marginTop: '12px' },
    emptyState: { textAlign: 'center', color: '#a3a3a3', marginTop: '30px', fontSize: '14px' },
    legend: { marginTop: '12px', fontSize: '12px' },
    legendTitle: { fontWeight: '600', marginBottom: '6px', color: '#404040' },
    legendItem: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' },
    legendDot: { width: '10px', height: '10px', borderRadius: '50%' },
    legendLine: { width: '16px', height: '3px' },
    loadingOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.9)', zIndex: 10, color: '#737373', borderRadius: '12px' },
};

const GrafoValidacion = () => {
    const fgRef = useRef();
    const containerRef = useRef();
    const [horarios, setHorarios] = useState([]);
    const [selectedHorario, setSelectedHorario] = useState(null);
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [graphStats, setGraphStats] = useState({ cursos: 0, profesores: 0, grupos: 0, slots: 0, conexiones: 0 });
    const [loading, setLoading] = useState(false);
    const [highlightNode, setHighlightNode] = useState(null);
    const [showProfessorLinks, setShowProfessorLinks] = useState(true);
    const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

    useEffect(() => { loadHorarios(); }, []);

    useEffect(() => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setDimensions({ width: rect.width - 2, height: 638 });
        }
    }, []);

    const loadHorarios = async () => {
        try {
            const data = await api.getHorarios();
            setHorarios(data);
            if (data.length > 0) loadDetalleHorario(data[0].id);
        } catch (e) { console.error(e); }
    };

    const loadDetalleHorario = async (id) => {
        setLoading(true);
        setSelectedHorario(id);
        try {
            const data = await api.getHorario(id);
            processGraphData(data.asignaciones || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const processGraphData = (asignaciones) => {
        const nodesMap = new Map();
        const links = [];

        const courseKey = (nombre) => `C:${nombre}`;
        const profKey = (nombre) => `P:${nombre}`;
        const groupKey = (nombre) => `G:${nombre}`;
        const slotKey = (dia, h) => `S:${dia}-${h}`;

        asignaciones.forEach(a => {
            const kCurso = courseKey(a.materia);
            const kProf = profKey(a.maestro);
            const kGrupo = groupKey(a.grupo);
            const kSlot = slotKey(a.dia, a.hora_inicio);

            if (!nodesMap.has(kCurso)) nodesMap.set(kCurso, { id: kCurso, label: a.materia, type: 'curso', color: NODE_COLORS.curso, val: 8 });
            if (!nodesMap.has(kProf)) nodesMap.set(kProf, { id: kProf, label: a.maestro, type: 'profesor', color: NODE_COLORS.profesor, val: 6 });
            if (!nodesMap.has(kGrupo)) nodesMap.set(kGrupo, { id: kGrupo, label: a.grupo, type: 'grupo', color: NODE_COLORS.grupo, val: 6 });
            if (!nodesMap.has(kSlot)) nodesMap.set(kSlot, { id: kSlot, label: `${a.dia} H${a.hora_inicio}`, type: 'slot', color: NODE_COLORS.slot, val: 5 });

            // Enlaces principales
            links.push({ source: kCurso, target: kProf, color: '#cbd5e1', width: 1 });
            links.push({ source: kCurso, target: kGrupo, color: '#cbd5e1', width: 1 });
            links.push({ source: kCurso, target: kSlot, color: '#cbd5e1', width: 1 });

            // Opcional: relacion profesor-grupo para compactar clusters
            if (showProfessorLinks) links.push({ source: kProf, target: kGrupo, color: '#e5e7eb', width: 0.5 });
        });

        const nodes = Array.from(nodesMap.values());

        setGraphData({ nodes, links });
        setGraphStats({
            cursos: nodes.filter(n => n.type === 'curso').length,
            profesores: nodes.filter(n => n.type === 'profesor').length,
            grupos: nodes.filter(n => n.type === 'grupo').length,
            slots: nodes.filter(n => n.type === 'slot').length,
            conexiones: links.length,
        });
    };

    const paintNode = useCallback((node, ctx, globalScale) => {
        const text = node.label || '';
        const max = 16 / globalScale;
        const label = text.length > max ? text.substring(0, Math.max(3, Math.floor(max))) + '…' : text;
        const size = node.val || 6;
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
        ctx.fillStyle = node.color;
        ctx.fill();
        if (highlightNode && (node.id === highlightNode.id)) {
            ctx.lineWidth = 2 / globalScale;
            ctx.strokeStyle = '#1f2937';
            ctx.stroke();
        }
        if (globalScale > 0.6) {
            ctx.font = `${10 / globalScale}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillStyle = '#1f2937';
            ctx.fillText(label, node.x, node.y + size + 6);
        }
    }, [highlightNode]);

    const handleNodeClick = (node) => {
        setHighlightNode(node === highlightNode ? null : node);
        if (fgRef.current) { fgRef.current.centerAt(node.x, node.y, 800); fgRef.current.zoom(3, 1000); }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Grafo de Validación</h1>
                    <p style={styles.subtitle}>Cursos, Profesores, Grupos y Slots conectados</p>
                </div>
                <div style={styles.controls}>
                    <select style={styles.select} value={selectedHorario || ''} onChange={(e) => loadDetalleHorario(e.target.value)}>
                        {horarios.map(h => <option key={h.id} value={h.id}>Horario #{h.id}</option>)}
                    </select>
                    <label style={styles.checkbox}>
                        <input type="checkbox" checked={showProfessorLinks} onChange={(e) => setShowProfessorLinks(e.target.checked)} />
                        Conectar Profesor–Grupo
                    </label>
                    <button style={styles.btn} onClick={() => fgRef.current?.zoomToFit(400)}>Resetear Vista</button>
                </div>
            </div>

            {/* Leyenda */}
            <div style={{ display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ ...styles.legendDot, backgroundColor: NODE_COLORS.curso }}></div><span>Cursos</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ ...styles.legendDot, backgroundColor: NODE_COLORS.profesor }}></div><span>Profesores</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ ...styles.legendDot, backgroundColor: NODE_COLORS.grupo }}></div><span>Grupos</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ ...styles.legendDot, backgroundColor: NODE_COLORS.slot }}></div><span>Slots de Tiempo</span>
                </div>
            </div>

            <div style={styles.mainContent}>
                <div ref={containerRef} style={styles.graphCard}>
                    {loading && <div style={styles.loadingOverlay}>Cargando grafo...</div>}
                    <ForceGraph2D
                        ref={fgRef}
                        graphData={graphData}
                        width={dimensions.width}
                        height={dimensions.height}
                        nodeLabel={(n) => `${n.type.toUpperCase()}\n${n.label}`}
                        nodeColor="color"
                        nodeRelSize={6}
                        linkColor="color"
                        linkWidth="width"
                        onNodeClick={handleNodeClick}
                        nodeCanvasObject={paintNode}
                        cooldownTicks={120}
                        onEngineStop={() => fgRef.current?.zoomToFit(400)}
                    />
                </div>

                <div style={styles.sidebar}>
                    <div style={styles.sidebarTitle}>Detalles del Nodo</div>
                    {highlightNode ? (
                        <div>
                            <div style={styles.detailSection}>
                                <div style={styles.detailLabel}>Tipo</div>
                                <div style={styles.detailValue}>{highlightNode.type}</div>
                            </div>
                            <div style={styles.detailSection}>
                                <div style={styles.detailLabel}>Etiqueta</div>
                                <div style={styles.detailValue}>{highlightNode.label}</div>
                            </div>
                            {/* Nodo de slot tiene formato especial */}
                            {highlightNode.type === 'slot' && (
                                <div style={styles.scheduleBox}>
                                    <div style={styles.scheduleRow}><span style={{ color: '#737373' }}>Slot:</span><span style={{ fontWeight: '500' }}>{highlightNode.label}</span></div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={styles.emptyState}>
                            <p>Haga clic en un nodo para ver detalles</p>
                            <div style={styles.legend}>
                                <div style={styles.legendTitle}>Tipos de Nodo</div>
                                <div style={styles.legendItem}><span style={{ ...styles.legendDot, backgroundColor: NODE_COLORS.curso }}></span><span>Cursos</span></div>
                                <div style={styles.legendItem}><span style={{ ...styles.legendDot, backgroundColor: NODE_COLORS.profesor }}></span><span>Profesores</span></div>
                                <div style={styles.legendItem}><span style={{ ...styles.legendDot, backgroundColor: NODE_COLORS.grupo }}></span><span>Grupos</span></div>
                                <div style={styles.legendItem}><span style={{ ...styles.legendDot, backgroundColor: NODE_COLORS.slot }}></span><span>Slots de Tiempo</span></div>
                            </div>
                        </div>
                    )}

                    {/* Estadísticas tipo tarjetas */}
                    <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                        <div style={{ ...styles.infoBox, textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: NODE_COLORS.curso }}>{graphStats.cursos}</div>
                            <div>Cursos</div>
                        </div>
                        <div style={{ ...styles.infoBox, textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: NODE_COLORS.profesor }}>{graphStats.profesores}</div>
                            <div>Profesores</div>
                        </div>
                        <div style={{ ...styles.infoBox, textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: NODE_COLORS.grupo }}>{graphStats.grupos}</div>
                            <div>Grupos</div>
                        </div>
                        <div style={{ ...styles.infoBox, textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: NODE_COLORS.slot }}>{graphStats.slots}</div>
                            <div>Slots</div>
                        </div>
                        <div style={{ ...styles.infoBox, textAlign: 'center', gridColumn: 'span 2' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#1e3a8a' }}>{graphStats.conexiones}</div>
                            <div>Conexiones</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GrafoValidacion;
