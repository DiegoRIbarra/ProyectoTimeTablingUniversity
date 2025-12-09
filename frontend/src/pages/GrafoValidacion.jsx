import React, { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { api } from '../services/api';

const CUATRI_COLORS = {
    1: "#3b82f6", 2: "#10b981", 3: "#22c55e", 4: "#eab308", 5: "#ef4444",
    6: "#a855f7", 7: "#f97316", 8: "#ec4899", 9: "#6366f1", 10: "#64748b"
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
    mainContent: { display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px' },
    graphCard: { backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e5e5', height: '500px', position: 'relative' },
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
    legend: { marginTop: '20px', fontSize: '12px' },
    legendTitle: { fontWeight: '600', marginBottom: '8px', color: '#404040' },
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
    const [loading, setLoading] = useState(false);
    const [highlightNode, setHighlightNode] = useState(null);
    const [showProfessorLinks, setShowProfessorLinks] = useState(true);
    const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

    useEffect(() => { loadHorarios(); }, []);

    useEffect(() => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setDimensions({ width: rect.width - 2, height: 498 });
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
        const nodes = [];
        const links = [];

        asignaciones.forEach(a => {
            let cuatri = 1;
            const match = a.grupo.match(/^(\d+)/);
            if (match) cuatri = parseInt(match[1]);
            nodes.push({
                id: a.id, materia: a.materia, profesor: a.maestro, grupo: a.grupo, aula: a.aula,
                dia: a.dia, hora: `${a.hora_inicio}:00 - ${a.hora_fin}:00`, cuatrimestre: cuatri,
                color: CUATRI_COLORS[cuatri] || '#9ca3af', val: 1
            });
        });

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const n1 = nodes[i], n2 = nodes[j];
                if (n1.dia === n2.dia && n1.hora === n2.hora) {
                    if (n1.profesor === n2.profesor) links.push({ source: n1.id, target: n2.id, type: 'conflict', color: '#dc2626', width: 3 });
                    if (n1.aula === n2.aula && n1.aula !== "N/A") links.push({ source: n1.id, target: n2.id, type: 'conflict', color: '#dc2626', width: 3 });
                }
                if (showProfessorLinks && n1.profesor === n2.profesor) {
                    links.push({ source: n1.id, target: n2.id, type: 'profesor', color: '#d4d4d4', width: 1 });
                }
            }
        }
        setGraphData({ nodes, links });
    };

    const paintNode = useCallback((node, ctx, globalScale) => {
        const label = node.materia.length > 10 ? node.materia.substring(0, 10) + '...' : node.materia;
        const size = 6;
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
        ctx.fillStyle = node.color;
        ctx.fill();
        if (highlightNode && (node === highlightNode || node.profesor === highlightNode.profesor)) {
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
        if (fgRef.current) { fgRef.current.centerAt(node.x, node.y, 1000); fgRef.current.zoom(3, 1500); }
    };

    const conflictCount = graphData.links.filter(l => l.type === 'conflict').length;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Grafo de Validacion</h1>
                    <p style={styles.subtitle}>Visualice conflictos y relaciones entre sesiones</p>
                </div>
                <div style={styles.controls}>
                    <select style={styles.select} value={selectedHorario || ''} onChange={(e) => loadDetalleHorario(e.target.value)}>
                        {horarios.map(h => <option key={h.id} value={h.id}>Horario #{h.id}</option>)}
                    </select>
                    <label style={styles.checkbox}>
                        <input type="checkbox" checked={showProfessorLinks} onChange={(e) => setShowProfessorLinks(e.target.checked)} />
                        Mostrar relaciones profesor
                    </label>
                    <button style={styles.btn} onClick={() => fgRef.current?.zoomToFit(400)}>Resetear Vista</button>
                </div>
            </div>

            <div style={styles.stats}>
                <span>Nodos: <strong>{graphData.nodes.length}</strong></span>
                <span>Enlaces: <strong>{graphData.links.length}</strong></span>
                <span style={{ color: conflictCount > 0 ? '#dc2626' : '#16a34a' }}>Conflictos: <strong>{conflictCount}</strong></span>
            </div>

            <div style={styles.mainContent}>
                <div ref={containerRef} style={styles.graphCard}>
                    {loading && <div style={styles.loadingOverlay}>Cargando grafo...</div>}
                    <ForceGraph2D
                        ref={fgRef}
                        graphData={graphData}
                        width={dimensions.width}
                        height={dimensions.height}
                        nodeLabel={(n) => `${n.materia}\n${n.profesor}\n${n.dia} ${n.hora}`}
                        nodeColor="color"
                        nodeRelSize={6}
                        linkColor="color"
                        linkWidth="width"
                        onNodeClick={handleNodeClick}
                        nodeCanvasObject={paintNode}
                        cooldownTicks={100}
                        onEngineStop={() => fgRef.current?.zoomToFit(400)}
                    />
                </div>

                <div style={styles.sidebar}>
                    <div style={styles.sidebarTitle}>Detalles del Nodo</div>
                    {highlightNode ? (
                        <div>
                            <div style={styles.detailSection}>
                                <div style={styles.detailLabel}>Materia</div>
                                <div style={styles.detailValue}>{highlightNode.materia}</div>
                            </div>
                            <div style={styles.detailSection}>
                                <div style={styles.detailLabel}>Profesor</div>
                                <div style={styles.detailValue}>{highlightNode.profesor}</div>
                            </div>
                            <div style={styles.infoGrid}>
                                <div style={styles.infoBox}><div style={styles.detailLabel}>Grupo</div><div style={{ fontWeight: '600' }}>{highlightNode.grupo}</div></div>
                                <div style={styles.infoBox}><div style={styles.detailLabel}>Cuatrimestre</div><div style={{ fontWeight: '600' }}>{highlightNode.cuatrimestre}°</div></div>
                            </div>
                            <div style={styles.scheduleBox}>
                                <div style={styles.scheduleRow}><span style={{ color: '#737373' }}>Dia:</span><span style={{ fontWeight: '500' }}>{highlightNode.dia}</span></div>
                                <div style={styles.scheduleRow}><span style={{ color: '#737373' }}>Horario:</span><span style={{ fontWeight: '500' }}>{highlightNode.hora}</span></div>
                                <div style={{ ...styles.scheduleRow, marginBottom: 0 }}><span style={{ color: '#737373' }}>Aula:</span><span style={{ fontWeight: '500', color: '#2563eb' }}>{highlightNode.aula}</span></div>
                            </div>
                            {graphData.links.filter(l => (l.source.id === highlightNode.id || l.target.id === highlightNode.id) && l.type === 'conflict').length > 0 && (
                                <div style={styles.conflictWarning}>Conflicto detectado</div>
                            )}
                        </div>
                    ) : (
                        <div style={styles.emptyState}>
                            <p>Haga clic en un nodo para ver detalles</p>
                            <div style={styles.legend}>
                                <div style={styles.legendTitle}>Leyenda de Enlaces</div>
                                <div style={styles.legendItem}><span style={{ ...styles.legendLine, backgroundColor: '#dc2626' }}></span><span>Conflicto</span></div>
                                <div style={styles.legendItem}><span style={{ ...styles.legendLine, backgroundColor: '#d4d4d4' }}></span><span>Mismo profesor</span></div>
                                <div style={{ ...styles.legendTitle, marginTop: '14px' }}>Colores por Cuatrimestre</div>
                                {[1, 2, 3, 4, 5].map(c => <div key={c} style={styles.legendItem}><span style={{ ...styles.legendDot, backgroundColor: CUATRI_COLORS[c] }}></span><span>{c}° Cuatrimestre</span></div>)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GrafoValidacion;
