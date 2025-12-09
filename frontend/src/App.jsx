import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Maestros from './pages/Maestros';
import Materias from './pages/Materias';
import Horarios from './pages/Horarios';
import GenerarHorarios from './pages/GenerarHorarios';
import PlanesEstudios from './pages/PlanesEstudios';
import Grupos from './pages/Grupos';
import HorariosProfesores from './pages/HorariosProfesores';
import GrafoValidacion from './pages/GrafoValidacion';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/maestros" element={<Maestros />} />
          <Route path="/materias" element={<Materias />} />
          <Route path="/planes" element={<PlanesEstudios />} />
          <Route path="/grupos" element={<Grupos />} />
          <Route path="/generar" element={<GenerarHorarios />} />
          <Route path="/horarios" element={<Horarios />} />
          <Route path="/horarios-profesores" element={<HorariosProfesores />} />
          <Route path="/grafo-validacion" element={<GrafoValidacion />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
