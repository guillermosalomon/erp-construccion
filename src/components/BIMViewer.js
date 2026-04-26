'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useStore } from '@/store/StoreContext';
import { saveIFCFile, loadIFCFile, deleteIFCFile } from '@/lib/ifc-storage';

const DISCIPLINAS = {
  ARQ: { label: 'Arquitectónico', color: '#3b82f6', meshTint: 0xcccccc },
  EST: { label: 'Estructural', color: '#ef4444', meshTint: 0xaaaaaa },
  ELE: { label: 'Eléctrico', color: '#eab308', meshTint: 0xddcc88 },
  SAN: { label: 'Sanitario', color: '#22c55e', meshTint: 0x88ddaa },
  OTR: { label: 'Otro', color: '#94a3b8', meshTint: 0xbbbbbb },
};

export default function BIMViewer({ onSelect, selectedId, coloredMap, isStandalone = true, proyectoId }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animFrameRef = useRef(null);
  const modelGroupsRef = useRef({}); // { modelId: THREE.Group }

  const { state, dispatch } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadDisciplina, setUploadDisciplina] = useState('ARQ');
  const [uploadCustomDisciplina, setUploadCustomDisciplina] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [visibleDisciplinas, setVisibleDisciplinas] = useState({ ARQ: true, EST: true, ELE: true, SAN: true });
  const [showPanel, setShowPanel] = useState(true);
  const fileInputRef = useRef(null);

  const projectModels = state.bimModels.filter(m => m.proyecto_id === proyectoId);

  // Toggle discipline visibility
  useEffect(() => {
    Object.entries(modelGroupsRef.current).forEach(([modelId, group]) => {
      const model = state.bimModels.find(m => m.id === modelId);
      if (model) group.visible = visibleDisciplinas[model.disciplina] !== false;
    });
  }, [visibleDisciplinas, state.bimModels]);

  // Sync highlighting
  useEffect(() => {
    if (!sceneRef.current) return;
    Object.values(modelGroupsRef.current).forEach(group => {
      group.children.forEach(child => {
        if (child.material && child.userData.expressID) {
          const eid = child.userData.expressID;
          if (selectedId && eid === selectedId) {
            child.material.emissive?.setHex(0xffff00);
          } else {
            child.material.emissive?.setHex(0x000000);
          }
          if (coloredMap && coloredMap[eid]) {
            child.material.color.set(coloredMap[eid]);
          }
        }
      });
    });
  }, [selectedId, coloredMap]);

  // Initialize Three.js
  useEffect(() => {
    const container = containerRef.current;
    if (!container || rendererRef.current) return;
    let disposed = false;

    (async () => {
      try {
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        if (disposed) return;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f4f8);
        sceneRef.current = scene;
        const rect = container.getBoundingClientRect();
        const w = rect.width || 800, h = rect.height || 600;
        const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
        camera.position.set(20, 15, 20);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0, 1, 0);
        controls.update();
        controlsRef.current = controls;
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dir = new THREE.DirectionalLight(0xffffff, 0.9);
        dir.position.set(30, 40, 30);
        dir.castShadow = true;
        scene.add(dir);
        scene.add(new THREE.HemisphereLight(0xddeeff, 0x203040, 0.4));
        scene.add(new THREE.GridHelper(50, 50, 0xbbbbbb, 0xe0e0e0));
        scene.add(new THREE.AxesHelper(3));

        const animate = () => {
          if (disposed) return;
          animFrameRef.current = requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

        const ro = new ResizeObserver(() => {
          const r = container.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            camera.aspect = r.width / r.height;
            camera.updateProjectionMatrix();
            renderer.setSize(r.width, r.height);
          }
        });
        ro.observe(container);
        setInitialized(true);
      } catch (err) {
        setError(`Error inicializando visor: ${err.message}`);
      }
    })();

    return () => {
      disposed = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.domElement?.remove();
        rendererRef.current = null;
      }
    };
  }, []);

  // Auto-load saved models when viewer initializes or project changes
  useEffect(() => {
    if (!initialized || !proyectoId) return;
    projectModels.forEach(model => {
      if (!modelGroupsRef.current[model.id]) {
        loadModelFromDB(model);
      }
    });
  }, [initialized, proyectoId, projectModels.length]);

  // Parse IFC buffer into Three.js group
  const parseIFCBuffer = useCallback(async (buffer, modelId) => {
    const WebIFC = await import('web-ifc');
    const ifcApi = new WebIFC.IfcAPI();
    await ifcApi.Init((path) => '/' + path);
    const data = new Uint8Array(buffer);
    const mid = ifcApi.OpenModel(data);
    const meshGroup = new THREE.Group();
    meshGroup.name = `IFC_${modelId}`;
    let meshCount = 0;

    ifcApi.StreamAllMeshes(mid, (mesh) => {
      const pgs = mesh.geometries;
      for (let i = 0; i < pgs.size(); i++) {
        const pg = pgs.get(i);
        const geo = ifcApi.GetGeometry(mid, pg.geometryExpressID);
        const verts = ifcApi.GetVertexArray(geo.GetVertexData(), geo.GetVertexDataSize());
        const indices = ifcApi.GetIndexArray(geo.GetIndexData(), geo.GetIndexDataSize());
        if (!verts.length || !indices.length) continue;
        const bufGeo = new THREE.BufferGeometry();
        const vc = verts.length / 6;
        const pos = new Float32Array(vc * 3);
        const norm = new Float32Array(vc * 3);
        for (let j = 0; j < vc; j++) {
          pos[j*3]=verts[j*6]; pos[j*3+1]=verts[j*6+1]; pos[j*3+2]=verts[j*6+2];
          norm[j*3]=verts[j*6+3]; norm[j*3+1]=verts[j*6+4]; norm[j*3+2]=verts[j*6+5];
        }
        bufGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        bufGeo.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
        bufGeo.setIndex(new THREE.BufferAttribute(indices, 1));
        const c = pg.color;
        const mat = new THREE.MeshPhongMaterial({
          color: new THREE.Color(c.x, c.y, c.z), opacity: c.w,
          transparent: c.w < 1, side: THREE.DoubleSide,
        });
        const m = new THREE.Mesh(bufGeo, mat);
        const mtx = new THREE.Matrix4();
        mtx.fromArray(pg.flatTransformation);
        m.applyMatrix4(mtx);
        m.userData = { expressID: mesh.expressID, modelId };
        meshGroup.add(m);
        meshCount++;
      }
    });
    ifcApi.CloseModel(mid);
    return { meshGroup, meshCount };
  }, []);

  // Load a model from IndexedDB
  const loadModelFromDB = useCallback(async (model) => {
    if (modelGroupsRef.current[model.id]) return;
    try {
      setLoadingMsg(`Cargando ${model.nombre}...`);
      setIsLoading(true);
      const buffer = await loadIFCFile(model.id);
      if (!buffer) { setIsLoading(false); return; }
      const { meshGroup } = await parseIFCBuffer(buffer, model.id);
      sceneRef.current.add(meshGroup);
      modelGroupsRef.current[model.id] = meshGroup;
      meshGroup.visible = !!visibleDisciplinas[model.disciplina];
      fitCameraToAll();
    } catch (err) {
      console.error('Error loading model from DB:', err);
    } finally {
      setIsLoading(false);
      setLoadingMsg('');
    }
  }, [parseIFCBuffer, visibleDisciplinas]);

  // Fit camera to all visible models
  const fitCameraToAll = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const box = new THREE.Box3();
    let hasContent = false;
    Object.values(modelGroupsRef.current).forEach(g => {
      if (g.visible && g.children.length > 0) {
        box.expandByObject(g);
        hasContent = true;
      }
    });
    if (!hasContent) return;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = maxDim / (2 * Math.tan((camera.fov * Math.PI / 180) / 2)) * 1.5;
    camera.position.set(center.x + dist * 0.5, center.y + dist * 0.5, center.z + dist * 0.5);
    controls.target.copy(center);
    controls.update();
  }, []);

  // Upload and save new model
  const handleSaveModel = useCallback(async () => {
    if (!uploadFile || !proyectoId) return;
    setShowUploadModal(false);
    setIsLoading(true);
    setLoadingMsg(`Procesando ${uploadName || uploadFile.name}...`);
    setError(null);
    const modelId = crypto.randomUUID();
    try {
      const buffer = await uploadFile.arrayBuffer();
      const { meshGroup, meshCount } = await parseIFCBuffer(buffer, modelId);
      // Save to IndexedDB
      await saveIFCFile(modelId, buffer);
      // Save metadata to store
      dispatch({
        type: 'ADD_BIM_MODEL',
        payload: {
          id: modelId, proyecto_id: proyectoId,
          nombre: uploadName || uploadFile.name,
          disciplina: uploadDisciplina === 'OTR' ? (uploadCustomDisciplina || 'OTR') : uploadDisciplina,
          file_size: uploadFile.size, mesh_count: meshCount,
        }
      });
      // Add to scene
      sceneRef.current.add(meshGroup);
      modelGroupsRef.current[modelId] = meshGroup;
      fitCameraToAll();
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
      setLoadingMsg('');
      setUploadFile(null);
      setUploadName('');
    }
  }, [uploadFile, uploadName, uploadDisciplina, proyectoId, parseIFCBuffer, dispatch, fitCameraToAll]);

  // Delete model
  const handleDeleteModel = useCallback(async (modelId) => {
    if (!confirm('¿Eliminar este modelo BIM?')) return;
    // Remove from scene
    const group = modelGroupsRef.current[modelId];
    if (group) {
      sceneRef.current.remove(group);
      group.children.forEach(c => { c.geometry?.dispose(); c.material?.dispose(); });
      delete modelGroupsRef.current[modelId];
    }
    // Remove from IndexedDB
    try { await deleteIFCFile(modelId); } catch (e) { console.warn(e); }
    // Remove from store
    dispatch({ type: 'DELETE_BIM_MODEL', payload: modelId });
  }, [dispatch]);

  // Selection (raycasting)
  const selectElement = useCallback((e) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    const allMeshes = [];
    Object.values(modelGroupsRef.current).forEach(g => { if (g.visible) allMeshes.push(...g.children); });
    const intersects = raycaster.intersectObjects(allMeshes);
    if (intersects.length > 0) {
      onSelect?.(intersects[0].object.userData.expressID);
    } else {
      onSelect?.(null);
    }
  }, [onSelect]);

  useEffect(() => {
    const c = containerRef.current;
    if (c) { c.addEventListener('click', selectElement); return () => c.removeEventListener('click', selectElement); }
  }, [selectElement]);

  const formatSize = (bytes) => bytes > 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : (bytes / 1024).toFixed(0) + ' KB';

  return (
    <>
      {isStandalone && (
        <div className="page-header">
          <div>
            <h1>Visor BIM 3D</h1>
            <div className="page-header-subtitle">
              {projectModels.length > 0 ? `${projectModels.length} modelo(s) cargado(s)` : 'Carga modelos IFC para visualizar'}
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'relative', height: isStandalone ? 'calc(100vh - 85px)' : '100%', overflow: 'hidden' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />


        {/* Modelos button */}
        <button
          onClick={() => setShowPanel(!showPanel)}
          style={{ position: 'absolute', top: 8, left: 8, zIndex: 15, background: 'rgba(255,255,255,0.92)', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        >
          📦 Modelos {showPanel ? '◀' : '▶'}
        </button>

        {/* Dropdown sin fondo */}
        {showPanel && (
          <div style={{ position: 'absolute', top: 42, left: 8, zIndex: 14, display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 0' }}>
            {projectModels.length === 0 ? (
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textShadow: '0 0 4px #fff, 0 0 8px #fff, 0 0 12px #fff', padding: '4px 2px' }}>Sin modelos cargados</div>
            ) : (
              projectModels.map(model => {
                const disc = DISCIPLINAS[model.disciplina] || { label: model.disciplina, color: '#94a3b8' };
                const isOn = visibleDisciplinas[model.disciplina] !== false;
                return (
                  <div key={model.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10 }}>
                    <span
                      onClick={() => setVisibleDisciplinas(prev => ({ ...prev, [model.disciplina]: !prev[model.disciplina] }))}
                      style={{ cursor: 'pointer', fontSize: 12, color: isOn ? '#22c55e' : '#c0c7cf', textShadow: '0 0 4px #fff', transition: 'color 0.2s' }}
                    >👁</span>
                    <span style={{ fontWeight: 700, color: isOn ? '#64748b' : '#b0b8c4', textShadow: '0 0 4px #fff, 0 0 8px #fff', transition: 'color 0.2s' }}>{model.nombre}</span>
                    <button onClick={() => handleDeleteModel(model.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 10, padding: 0, textShadow: '0 0 4px #fff' }} title="Eliminar">✕</button>
                  </div>
                );
              })
            )}
            <button
              onClick={() => setShowUploadModal(true)}
              disabled={isLoading || !initialized || !proyectoId}
              style={{ padding: '4px 10px', borderRadius: 6, border: '1px dashed #3b82f680', background: 'transparent', color: '#3b82f6', fontWeight: 700, fontSize: 10, cursor: 'pointer', textShadow: '0 0 4px #fff, 0 0 8px #fff', alignSelf: 'flex-start' }}
            >
              + Cargar IFC
            </button>
          </div>
        )}

        {/* Upload modal */}
        {showUploadModal && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: 340, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800 }}>📂 Cargar Modelo IFC</h3>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Archivo .ifc</label>
                <input
                  type="file" accept=".ifc"
                  onChange={e => { setUploadFile(e.target.files[0]); if (e.target.files[0]) setUploadName(e.target.files[0].name.replace('.ifc', '')); }}
                  style={{ width: '100%', padding: 8, border: '2px dashed #e2e8f0', borderRadius: 8, fontSize: 12 }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Nombre del modelo</label>
                <input
                  type="text" value={uploadName} onChange={e => setUploadName(e.target.value)}
                  placeholder="Ej: Arquitectonico"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setShowUploadModal(false); setUploadFile(null); }} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                <button onClick={handleSaveModel} disabled={!uploadFile} style={{ flex: 2, padding: 10, borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 700, opacity: uploadFile ? 1 : 0.5 }}>
                  💾 Guardar y Cargar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{loadingMsg || 'Cargando...'}</div>
              <div style={{ fontSize: 12, color: '#737373' }}>Procesando geometrías IFC</div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ position: 'absolute', top: 16, left: showPanel ? 230 : 16, right: 16, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: 12, zIndex: 15, fontSize: 12, color: '#dc2626' }}>
            ⚠️ {error}
            <button onClick={() => setError(null)} style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700 }}>✕</button>
          </div>
        )}

        {/* Empty state */}
        {projectModels.length === 0 && !isLoading && initialized && !showUploadModal && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.92)', padding: 32, borderRadius: 12, border: '1px solid #e5e5e5', pointerEvents: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }}>🧊</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Visor BIM 3D</h3>
              <p style={{ fontSize: 13, color: '#737373', maxWidth: 320, lineHeight: 1.5 }}>
                Carga archivos <strong>.ifc</strong> por disciplina: Arquitectónico, Estructural, Eléctrico o Sanitario.
              </p>
              <button
                onClick={() => setShowUploadModal(true)}
                disabled={!proyectoId}
                style={{ marginTop: 16, padding: '10px 20px', borderRadius: 10, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                📂 Cargar Modelo IFC
              </button>
              {!proyectoId && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 8 }}>Selecciona un proyecto primero</div>}
            </div>
          </div>
        )}

        {/* Controls hint */}
        {initialized && projectModels.length > 0 && (
          <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: '4px 12px', fontSize: 10, color: '#737373', border: '1px solid #e5e5e5' }}>
            🖱️ Rotar · Scroll: Zoom · Click derecho: Mover
          </div>
        )}
      </div>


    </>
  );
}
