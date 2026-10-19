// REVIT hero: procedural sofa in a studio, extraction stripe sweeps it clean on a scroll-driven camera rail.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const isMobile = () => window.innerWidth <= 760;

/* ------------------------------------------------------------------ themes */
// <html data-theme="dark"> switches the studio to a dark, low-key set. Anything else = the approved light scene (values unchanged).
const THEMES = {
  light: {
    exposure: 1.12, envIntensity: 0.5,
    key: [0xfff3e6, 2.6], keyPos: [-2.6, 4.2, 3.4], rim: [0xe4ecff, 1.35], rim2: null, hemi: [0xffffff, 0xd9d3c8, 0.35],
    floor: null, shadowOpacity: 0.16, contact: [0.55, 0.5],
    fabric: '#c9c3b8', sheen: '#f3efe8', glow: [1.9, 0.16, 0.085],
  },
  dark: {
    exposure: 1.0, envIntensity: 0.08,
    key: [0xfff0e0, 3.1], keyPos: [-3.3, 3.9, 2.3], rim: [0xdbe6ff, 4.2], rim2: [0xe8eeff, 2.0], hemi: [0xf2efe8, 0x141414, 0.06],
    floor: { color: '#2a2b2d', size: [5.6, 4.2] }, shadowOpacity: 0.6, contact: [0.85, 0.75],
    fabric: '#d3cdc2', sheen: '#f6f2ea', glow: [2.8, 0.42, 0.14],
  },
};
const themeOf = () => (document.documentElement.dataset.theme === 'dark' ? THEMES.dark : THEMES.light);

/* ------------------------------------------------------------------ textures */
function makeWeave(size, threads) {
  // plain linen weave with slubs: returns { height Float32Array, albedo canvas }
  const h = new Float32Array(size * size);
  const tw = size / threads;
  const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const warpW = [], weftW = [], warpT = [], weftT = [];
  for (let i = 0; i < threads; i++) { warpW.push(0.78 + rnd(i) * 0.3); weftW.push(0.75 + rnd(i + 99) * 0.32); warpT.push(rnd(i + 7)); weftT.push(rnd(i + 51)); }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = Math.floor(x / tw), j = Math.floor(y / tw);
      const u = (x / tw) - i, v = (y / tw) - j;
      const over = (i + j) % 2 === 0;
      // thread cross-sections
      const wa = Math.max(0, 1 - Math.pow((u - 0.5) / (0.5 * warpW[i]), 2));
      const we = Math.max(0, 1 - Math.pow((v - 0.5) / (0.5 * weftW[j]), 2));
      // along-thread hump where it crosses over
      const humpA = 0.55 + 0.45 * Math.sin(Math.PI * v);
      const humpE = 0.55 + 0.45 * Math.sin(Math.PI * u);
      const ha = Math.sqrt(wa) * (over ? humpA : 0.45);
      const he = Math.sqrt(we) * (over ? 0.45 : humpE);
      // slub noise along threads
      const slubA = 0.92 + 0.16 * Math.sin((y / size) * 23.0 + warpT[i] * 40.0) * Math.sin((y / size) * 7.0 + i);
      const slubE = 0.92 + 0.16 * Math.sin((x / size) * 19.0 + weftT[j] * 40.0) * Math.sin((x / size) * 5.0 + j);
      h[y * size + x] = Math.max(ha * slubA, he * slubE) + (rnd(x * 7 + y * 131) - 0.5) * 0.05;
    }
  }
  // albedo: thread tone variation (multiplied into the base colour)
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = Math.floor(x / tw), j = Math.floor(y / tw);
      const over = (i + j) % 2 === 0;
      const tone = over ? 0.93 + warpT[i] * 0.07 : 0.9 + weftT[j] * 0.08;
      const k = Math.min(1, tone * (0.92 + h[y * size + x] * 0.09));
      const p = (y * size + x) * 4; const g = Math.round(k * 255);
      img.data[p] = g; img.data[p + 1] = g; img.data[p + 2] = Math.round(g * 0.985); img.data[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // normal map from height (sobel)
  const n = document.createElement('canvas'); n.width = n.height = size;
  const nctx = n.getContext('2d'); const nimg = nctx.createImageData(size, size);
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  const strength = 2.6;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
      let nx = -dx * strength, ny = dy * strength, nz = 1;
      const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const p = (y * size + x) * 4;
      nimg.data[p] = (nx * 0.5 + 0.5) * 255; nimg.data[p + 1] = (ny * 0.5 + 0.5) * 255; nimg.data[p + 2] = (nz * 0.5 + 0.5) * 255; nimg.data[p + 3] = 255;
    }
  }
  nctx.putImageData(nimg, 0, 0);
  return { albedo: c, normal: n };
}

function contactShadowTexture([a1, a2] = [0.55, 0.5]) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.filter = 'blur(18px)';
  ctx.fillStyle = `rgba(28,24,20,${a1})`;
  ctx.beginPath(); ctx.roundRect(70, 66, 372, 124, 40); ctx.fill();
  ctx.filter = 'blur(6px)';
  ctx.fillStyle = `rgba(20,16,12,${a2})`;
  ctx.beginPath(); ctx.roundRect(96, 84, 320, 88, 24); ctx.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function floorPoolTexture() {
  // radial alpha for the dark set: a lit patch of studio floor that fades into the page ground
  // alphaMap reads the green channel, so the falloff is drawn as grey on opaque black
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 256, 256);
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#b8b8b8'); g.addColorStop(0.62, '#3a3a3a'); g.addColorStop(1, '#000');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

/* ------------------------------------------------------------------ geometry helpers */
function softBox(w, h, d, r, seg, opts = {}) {
  let g = new RoundedBoxGeometry(w, h, d, seg, r);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-5);
  const p = g.attributes.position;
  const hw = w / 2, hh = h / 2, hd = d / 2;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const fx = Math.max(0, 1 - (x / hw) ** 2), fy = Math.max(0, 1 - (y / hh) ** 2), fz = Math.max(0, 1 - (z / hd) ** 2);
    if (opts.puffTop) y += opts.puffTop * Math.max(0, y / hh) * Math.pow(fx * fz, 0.7);
    if (opts.puffFront) z += opts.puffFront * Math.max(0, z / hd) * Math.pow(fx * fy, 0.7);
    if (opts.bulge) { const b = 1 + opts.bulge * fy; x *= b; z *= 1 + opts.bulge * 0.6 * fy; }
    if (opts.sag) y -= opts.sag * Math.max(0, y / hh) * Math.exp(-((x / hw) ** 2) * 3.0) * fz; // seat dip
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

function boxUV(g, scale) {
  const p = g.attributes.position, n = g.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else if (ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u * scale; uv[i * 2 + 1] = v * scale;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function pipingFor(w, d, y, r, puffTop, hw0, hd0, segs) {
  // welt cord following the top edge of a seat cushion
  const pts = [];
  const a = w / 2 - r * 0.3, b = d / 2 - r * 0.3, cr = r * 0.75;
  const corners = [[a - cr, b - cr, 0], [-(a - cr), b - cr, Math.PI / 2], [-(a - cr), -(b - cr), Math.PI], [a - cr, -(b - cr), Math.PI * 1.5]];
  corners.forEach(([cx, cz, start]) => {
    for (let k = 0; k <= 8; k++) {
      const t = start + (k / 8) * (Math.PI / 2);
      const x = cx + Math.cos(t) * cr, z = cz + Math.sin(t) * cr;
      const f = Math.pow(Math.max(0, 1 - (x / hw0) ** 2) * Math.max(0, 1 - (z / hd0) ** 2), 0.7);
      pts.push(new THREE.Vector3(x, y + puffTop * 0.92 * f, z));
    }
  });
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  return new THREE.TubeGeometry(curve, segs, 0.0065, 6, true);
}

/* ------------------------------------------------------------------ fabric shader */
const NOISE_GLSL = /* glsl */`
uniform float uProgress; uniform float uStripe; uniform vec3 uBlue; uniform vec3 uGlow;
varying vec3 vWPos;
float hash13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vnoise(vec3 p){ vec3 i = floor(p); vec3 f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash13(i), hash13(i+vec3(1,0,0)), f.x), mix(hash13(i+vec3(0,1,0)), hash13(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(hash13(i+vec3(0,0,1)), hash13(i+vec3(1,0,1)), f.x), mix(hash13(i+vec3(0,1,1)), hash13(i+vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < OCTAVES; i++){ s += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
`;

function fabricMaterial(maps, mobile, theme) {
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(theme.fabric),
    map: maps.albedo,
    normalMap: maps.normal,
    normalScale: new THREE.Vector2(0.38, 0.38),
    roughness: 0.88,
    sheen: 1.0,
    sheenRoughness: 0.42,
    sheenColor: new THREE.Color(theme.sheen),
    clearcoat: 1.0,
    clearcoatRoughness: 0.2,
  });
  m.userData.uniforms = {
    uProgress: { value: 0 },
    uStripe: { value: 1 },
    uBlue: { value: new THREE.Color('#4090f0') },
    uGlow: { value: new THREE.Vector3(...theme.glow) },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.uniforms);
    sh.defines = sh.defines || {};
    sh.defines.OCTAVES = mobile ? 3 : 4;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + NOISE_GLSL)
      .replace('#include <color_fragment>', /* glsl */`#include <color_fragment>
        float front = mix(-1.18, 1.18, uProgress);
        float ragged = (fbm(vec3(vWPos.yz * 1.3, 1.7)) - 0.5) * 0.04 + (vnoise(vWPos * 60.0) - 0.5) * 0.005;
        float dd = front + ragged - vWPos.x;                    // > 0 : already extracted
        float cleanM = smoothstep(-0.003, 0.003, dd);
        // grime: base film + set-in stains with tide marks + body oil on arms / headrest / seat fronts
        float film = fbm(vWPos * 1.4 + 2.1) * 0.7 + fbm(vWPos * 9.0) * 0.3;
        float sN = fbm(vWPos * 1.9 + vec3(7.3, 1.1, 4.2));
        float stains = smoothstep(0.56, 0.69, sN);
        float tide = (1.0 - smoothstep(0.0, 0.008, abs(sN - 0.56))) * 0.16;
        float armOil = smoothstep(0.78, 0.9, abs(vWPos.x)) * smoothstep(0.5, 0.68, vWPos.y);
        float headOil = smoothstep(0.78, 0.92, vWPos.y) * smoothstep(-0.3, -0.12, vWPos.z) * (0.6 + 0.4 * fbm(vWPos * 6.0));
        float seatFront = smoothstep(0.30, 0.43, vWPos.z) * (1.0 - smoothstep(0.42, 0.5, vWPos.y));
        float grime = clamp(0.42 + film * 0.34 + stains * 0.5 + tide + armOil * 0.55 + headOil * 0.45 + seatFront * 0.25, 0.0, 1.15);
        vec3 dirty = diffuseColor.rgb * mix(vec3(1.0), vec3(0.5, 0.43, 0.32), clamp(grime, 0.0, 1.0));
        dirty = mix(dirty, vec3(dot(dirty, vec3(0.3, 0.59, 0.11))), 0.18) * (1.0 - 0.3 * stains - 0.12 * tide);
        // wet trace right behind the head: darker, glossier, decays like a wake as it dries
        float wet = cleanM * exp(-max(dd, 0.0) * 7.5) * uStripe;
        vec3 clean = diffuseColor.rgb * (1.04 - wet * 0.3);
        diffuseColor.rgb = mix(dirty, clean, cleanM);
        float dirtAmt = (1.0 - cleanM) * clamp(grime, 0.0, 1.0);
        float edge = (1.0 - smoothstep(0.0, 0.0045, abs(dd))) * uStripe;
        float halo = (1.0 - smoothstep(0.0, 0.05, abs(dd))) * uStripe;
      `)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.97, dirtAmt * 0.6);
        roughnessFactor = mix(roughnessFactor, 0.36, wet * 0.85);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += uBlue * (edge * uGlow.x + halo * uGlow.y + wet * uGlow.z);`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
        material.clearcoat = wet * 0.85;
        material.clearcoatRoughness = 0.16;
        material.sheenColor *= mix(1.0, 0.35, dirtAmt);`);
  };
  return m;
}

/* ------------------------------------------------------------------ sofa */
function buildSofa(fabric, wood, mobile) {
  const sofa = new THREE.Group();
  const seg = mobile ? 4 : 7;
  const UVS = 6.5; // weave tiles per metre
  const parts = [];
  const add = (geo, x, y, z, rx = 0) => {
    const m = new THREE.Matrix4().makeRotationX(rx).setPosition(x, y, z);
    geo.applyMatrix4(m);
    boxUV(geo, UVS);
    parts.push(geo);
  };
  const legH = 0.11;
  // plinth / frame
  add(softBox(2.0, 0.21, 0.88, 0.04, Math.max(3, seg - 2)), 0, legH + 0.105, 0);
  // arms
  for (const s of [-1, 1]) add(softBox(0.2, 0.58, 0.9, 0.075, seg, { puffTop: 0.018, bulge: 0.015 }), s * 0.9, legH + 0.29, 0);
  // back frame
  add(softBox(1.62, 0.68, 0.19, 0.06, seg, { puffTop: 0.01 }), 0, legH + 0.34, -0.345, -0.05);
  // seat cushions
  const cw = 1.6 / 3 - 0.008;
  const seatY = legH + 0.21 + 0.08;
  for (let i = 0; i < 3; i++) {
    const x = -0.8 + cw / 2 + 0.004 + i * (cw + 0.008);
    add(softBox(cw, 0.16, 0.69, 0.065, seg, { puffTop: 0.028, bulge: 0.02, sag: i === 1 ? 0.012 : 0.008 }), x, seatY, 0.095);
    if (!mobile) add(pipingFor(cw, 0.69, 0.08 - 0.065 * 0.3, 0.065, 0.028, cw / 2, 0.69 / 2, 72), x, seatY, 0.095);
  }
  // back cushions, leaning back
  for (let i = 0; i < 3; i++) {
    const x = -0.8 + cw / 2 + 0.004 + i * (cw + 0.008);
    add(softBox(cw, 0.46, 0.18, 0.075, seg, { puffFront: 0.035, bulge: 0.02 }), x, seatY + 0.08 + 0.21, -0.19, -0.16);
  }
  const fabricMesh = new THREE.Mesh(mergeGeoms(parts), fabric);
  fabricMesh.castShadow = !mobile; fabricMesh.receiveShadow = !mobile;
  sofa.add(fabricMesh);
  // tapered legs
  const legGeo = new THREE.CylinderGeometry(0.021, 0.014, legH, mobile ? 12 : 20);
  for (const sx of [-0.92, 0.92]) for (const sz of [-0.36, 0.36]) {
    const leg = new THREE.Mesh(legGeo, wood);
    leg.position.set(sx, legH / 2, sz);
    leg.castShadow = !mobile;
    sofa.add(leg);
  }
  return sofa;
}

function mergeGeoms(list) {
  // minimal merge (positions, normals, uvs, indices) to keep a single draw call
  let vCount = 0, iCount = 0;
  list.forEach((g) => { if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]); vCount += g.attributes.position.count; iCount += g.index.count; });
  const pos = new Float32Array(vCount * 3), nor = new Float32Array(vCount * 3), uv = new Float32Array(vCount * 2);
  const idx = new Uint32Array(iCount);
  let vo = 0, io = 0;
  list.forEach((g) => {
    pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3); uv.set(g.attributes.uv.array, vo * 2);
    const ia = g.index.array; for (let k = 0; k < ia.length; k++) idx[io + k] = ia[k] + vo;
    vo += g.attributes.position.count; io += ia.length;
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

/* ------------------------------------------------------------------ camera rail */
// keyframes: t (stage progress), camera position, look target, fov, frame shift (fraction of viewport)
const RAILS = {
  desktop: [
    { t: 0.00, pos: [2.75, 1.42, 4.25], tgt: [0.02, 0.43, 0.0], fov: 27, sx: 0.2, sy: 0.075 },
    { t: 0.36, pos: [1.15, 1.02, 3.55], tgt: [0.15, 0.46, 0.05], fov: 27, sx: 0.215, sy: 0.02 },
    { t: 0.66, pos: [0.78, 0.84, 1.42], tgt: [0.42, 0.47, 0.26], fov: 30, sx: 0.19, sy: 0.0 },
    { t: 1.00, pos: [-2.95, 1.62, 4.6], tgt: [0.0, 0.42, 0.0], fov: 27, sx: 0.17, sy: 0.03 },
  ],
  mobile: [
    { t: 0.00, pos: [3.95, 2.05, 7.8], tgt: [0.0, 0.42, 0.0], fov: 32, sx: 0.0, sy: 0.075 },
    { t: 0.36, pos: [1.4, 1.6, 7.6], tgt: [0.1, 0.42, 0.05], fov: 32, sx: 0.0, sy: 0.24 },
    { t: 0.66, pos: [0.9, 0.95, 2.2], tgt: [0.42, 0.45, 0.26], fov: 34, sx: 0.0, sy: 0.24 },
    { t: 1.00, pos: [-3.6, 1.95, 7.2], tgt: [0.0, 0.42, 0.0], fov: 32, sx: 0.0, sy: 0.22 },
  ],
};
// tablet portrait: mobile composition, closer camera, sofa lower in frame (under the copy)
RAILS.tablet = RAILS.mobile.map((k, i) => ({ ...k, pos: k.pos.map((v, j) => (j === 1 ? v : v * 0.86)), sy: [0.2, 0.26, 0.26, 0.24][i] }));
const railName = (w, h) => (w <= 760 ? 'mobile' : w / h < 0.95 ? 'tablet' : 'desktop');

// cleaning progress along the stage (front sweeps left -> right)
const CLEAN = [[0.0, 0.0], [0.04, 0.38], [0.36, 0.56], [0.66, 0.70], [0.88, 1.0], [1.0, 1.0]];
const INTRO_CLEAN = 0.38;

const smooth = (t) => t * t * (3 - 2 * t);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function piecewise(table, x) {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    if (x <= table[i][0]) { const [x0, y0] = table[i - 1], [x1, y1] = table[i]; return y0 + (y1 - y0) * smooth((x - x0) / (x1 - x0)); }
  }
  return table[table.length - 1][1];
}
function railAt(rail, t) {
  let i = 1; while (i < rail.length - 1 && t > rail[i].t) i++;
  const a = rail[i - 1], b = rail[i];
  const k = smooth(Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))));
  const lerp3 = (p, q) => p.map((v, j) => v + (q[j] - v) * k);
  return { pos: lerp3(a.pos, b.pos), tgt: lerp3(a.tgt, b.tgt), fov: a.fov + (b.fov - a.fov) * k, sx: a.sx + (b.sx - a.sx) * k, sy: a.sy + (b.sy - a.sy) * k };
}

/* ------------------------------------------------------------------ init */
export function initHero(stage, { posterMode } = {}) {
  const canvas = stage.querySelector('[data-canvas]');
  const host = stage.querySelector('.stage__sticky');
  let mobile = isMobile();
  const theme = themeOf();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!posterMode });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = theme.exposure;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = theme.envIntensity;

  const camera = new THREE.PerspectiveCamera(27, 1, 0.05, 40);

  // lights: soft key from front-left, cool rim from back-right, low fill
  const key = new THREE.DirectionalLight(...theme.key);
  key.position.set(...theme.keyPos);
  key.castShadow = !mobile;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: 1, far: 12 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.012; key.shadow.radius = 4;
  scene.add(key);
  const rim = new THREE.DirectionalLight(...theme.rim); rim.position.set(3.2, 2.6, -3.6); scene.add(rim);
  if (theme.rim2) { const rim2 = new THREE.DirectionalLight(...theme.rim2); rim2.position.set(-3.4, 2.2, -3.2); scene.add(rim2); }
  scene.add(new THREE.HemisphereLight(...theme.hemi));

  // floor: shadow catcher + soft contact shadow (works without shadow maps on mobile)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: theme.shadowOpacity }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = !mobile; scene.add(floor);
  if (theme.floor) {
    // dark set: lit floor patch under the sofa so the contact shadow has something to fall on
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(...theme.floor.size), new THREE.MeshStandardMaterial({ color: theme.floor.color, roughness: 0.92, metalness: 0, alphaMap: floorPoolTexture(), transparent: true, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.y = -0.001; pool.renderOrder = -1; scene.add(pool);
  }
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(2.75, 1.9), new THREE.MeshBasicMaterial({ map: contactShadowTexture(theme.contact), transparent: true, depthWrite: false, toneMapped: false }));
  contact.rotation.x = -Math.PI / 2; contact.position.y = 0.002; scene.add(contact);

  // materials
  const weave = makeWeave(mobile ? 256 : 512, mobile ? 16 : 32);
  const albedo = new THREE.CanvasTexture(weave.albedo); albedo.colorSpace = THREE.SRGBColorSpace;
  const normal = new THREE.CanvasTexture(weave.normal);
  [albedo, normal].forEach((t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); });
  const fabric = fabricMaterial({ albedo, normal }, mobile, theme);
  const wood = new THREE.MeshStandardMaterial({ color: '#4a2f1e', roughness: 0.45, metalness: 0 });
  const sofa = buildSofa(fabric, wood, mobile);
  scene.add(sofa);

  // ----- state
  const state = { p: 0, intro: posterMode ? 1 : 0, dirty: true, visible: true };
  const vT = new THREE.Vector3();

  function resize() {
    mobile = isMobile();
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    state.dirty = true;
  }

  function frame() {
    const w = host.clientWidth, h = host.clientHeight;
    const rail = RAILS[railName(w, h)];
    const k = railAt(rail, state.p);
    const ie = easeInOut(state.intro);
    // intro: camera settles from a higher, wider establishing position
    const lift = 1 - ie;
    camera.position.set(k.pos[0] * (1 + 0.1 * lift), k.pos[1] + 0.35 * lift, k.pos[2] * (1 + 0.12 * lift));
    vT.set(k.tgt[0], k.tgt[1], k.tgt[2]);
    camera.lookAt(vT);
    camera.fov = k.fov;
    // frame shift keeps the sofa clear of the copy column
    const centred = posterMode === 'end';
    camera.setViewOffset(w, h, centred ? 0 : -k.sx * w, centred ? 0 : -k.sy * h, w, h);
    camera.updateProjectionMatrix();
    const c = Math.max(piecewise(CLEAN, state.p), INTRO_CLEAN * ie);
    const u = fabric.userData.uniforms;
    u.uProgress.value = c;
    u.uStripe.value = c > 0.002 && c < 0.998 ? 1 : 0;
    renderer.render(scene, camera);
  }

  resize();
  window.addEventListener('resize', () => { resize(); });

  // first frame, then reveal the canvas over the poster
  frame();
  stage.classList.add('is-live');

  if (posterMode) {
    document.documentElement.classList.add('is-poster');
    if (posterMode === 'end') document.documentElement.classList.add('is-poster-end');
    state.p = posterMode === 'end' ? 1 : 0;
    frame();
    window.__posterReady = true;
    return;
  }

  // intro (automatic, plays once)
  const t0 = performance.now();
  const INTRO_MS = 2600;
  const introTick = (now) => {
    state.intro = Math.min(1, (now - t0) / INTRO_MS);
    state.dirty = true;
    if (state.intro < 1) requestAnimationFrame(introTick);
  };
  requestAnimationFrame(introTick);

  // scroll rail: GSAP ScrollTrigger when present, plain scroll math as fallback
  const setP = (v) => { state.p = Math.min(1, Math.max(0, v)); state.dirty = true; };
  const gsap = window.gsap, ST = window.ScrollTrigger;
  if (gsap && ST) {
    gsap.registerPlugin(ST);
    const proxy = { p: 0 };
    gsap.to(proxy, {
      p: 1, ease: 'none',
      scrollTrigger: { trigger: stage, start: 'top top', end: 'bottom bottom', scrub: 0.7, invalidateOnRefresh: true },
      onUpdate: () => setP(proxy.p),
    });
  } else {
    const onS = () => { const r = stage.getBoundingClientRect(); setP(-r.top / Math.max(1, r.height - window.innerHeight)); };
    window.addEventListener('scroll', onS, { passive: true }); onS();
  }

  // render only when visible and something changed
  new IntersectionObserver(([e]) => { state.visible = e.isIntersecting; if (e.isIntersecting) state.dirty = true; }).observe(stage);
  const loop = () => {
    if (state.visible && state.dirty) { state.dirty = false; frame(); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  window.__hero = { state, frame }; // QA hook
}
