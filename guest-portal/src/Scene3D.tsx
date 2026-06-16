import { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Stars, PerspectiveCamera, MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'

// ─── MOUNTAIN TERRAIN ────────────────────────────────────────────────────────

function Mountain({
  position,
  scale,
  color,
  roughness = 0.9,
}: {
  readonly position: [number, number, number]
  readonly scale: [number, number, number]
  readonly color: string
  readonly roughness?: number
}) {
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(1, 1.6, 7, 1)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      if (y < 0.5) {
        pos.setX(i, x + (Math.random() - 0.5) * 0.18)
        pos.setZ(i, z + (Math.random() - 0.5) * 0.18)
      }
    }
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <mesh geometry={geo} position={position} scale={scale} castShadow receiveShadow>
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={0.0}
        flatShading
      />
    </mesh>
  )
}

function MountainRange() {
  return (
    <group>
      {/* Back range - far, lighter */}
      <Mountain position={[-6, -1.5, -12]} scale={[3.5, 4.5, 3.5]} color="#1a3a22" />
      <Mountain position={[-2, -1.5, -14]} scale={[4, 5.5, 4]} color="#1c4028" />
      <Mountain position={[2, -1.5, -13]} scale={[3.8, 5, 3.8]} color="#173520" />
      <Mountain position={[6.5, -1.5, -12]} scale={[3.2, 4.2, 3.2]} color="#1a3a22" />
      <Mountain position={[10, -1.5, -13]} scale={[3.5, 4.8, 3.5]} color="#1c4028" />
      <Mountain position={[-10, -1.5, -11]} scale={[3, 3.8, 3]} color="#182e1e" />

      {/* Mid range - closer, darker */}
      <Mountain position={[-7, -2, -7]} scale={[2.8, 3.8, 2.8]} color="#122a18" />
      <Mountain position={[-3.5, -2, -8]} scale={[3.2, 4.5, 3.2]} color="#0f2214" />
      <Mountain position={[0, -2, -7.5]} scale={[3, 4.2, 3]} color="#122a18" />
      <Mountain position={[4, -2, -8]} scale={[2.8, 3.6, 2.8]} color="#0f2214" />
      <Mountain position={[7.5, -2, -7]} scale={[3.2, 4.5, 3.2]} color="#122a18" />

      {/* Front range - closest, darkest */}
      <Mountain position={[-5, -2.8, -3]} scale={[2, 3, 2]} color="#0a1a0e" />
      <Mountain position={[-1, -2.8, -4]} scale={[2.5, 3.5, 2.5]} color="#0c1e10" />
      <Mountain position={[3, -2.8, -3.5]} scale={[2.2, 3, 2.2]} color="#0a1a0e" />
      <Mountain position={[7, -2.8, -3]} scale={[2, 2.8, 2]} color="#0c1e10" />
    </group>
  )
}

// ─── TERRAIN PLANE ───────────────────────────────────────────────────────────

function Terrain() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(40, 40, 60, 60)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      const wave = Math.sin(x * 0.4) * 0.3 + Math.cos(y * 0.35) * 0.25 + (Math.random() - 0.5) * 0.2
      pos.setZ(i, z + wave)
    }
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.5, -5]} receiveShadow>
      <meshStandardMaterial color="#0d2213" roughness={1} metalness={0} />
    </mesh>
  )
}

// ─── GLOWING HOUSE ───────────────────────────────────────────────────────────

function GlowingHouse() {
  const houseRef = useRef<THREE.Group>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.6 + Math.sin(t * 1.5) * 0.3
    }
  })

  return (
    <group ref={houseRef} position={[0, 1.2, -7.5]}>
      {/* House body */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.4, 0.3, 0.35]} />
        <meshStandardMaterial color="#0f1f14" roughness={0.8} metalness={0.1} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 0.22, 0]} castShadow>
        <coneGeometry args={[0.32, 0.25, 4, 1]} />
        <meshStandardMaterial color="#0a160d" roughness={0.9} />
      </mesh>
      {/* Warm window glow */}
      <mesh ref={glowRef} position={[0, 0, 0.18]}>
        <planeGeometry args={[0.12, 0.1]} />
        <meshStandardMaterial
          color="#ffcc66"
          emissive="#ffaa33"
          emissiveIntensity={0.8}
          roughness={0}
        />
      </mesh>
      {/* Point light from window */}
      <pointLight position={[0, 0, 0.3]} color="#ffcc66" intensity={0.8} distance={3} decay={2} />
    </group>
  )
}

// ─── FLOATING MIST CLOUDS ────────────────────────────────────────────────────

function MistCloud({
  position,
  scale,
  speed,
  delay,
}: {
  readonly position: [number, number, number]
  readonly scale: number
  readonly speed: number
  readonly delay: number
}) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime() + delay
    ref.current.position.x = position[0] + Math.sin(t * speed * 0.3) * 2
    ref.current.position.y = position[1] + Math.sin(t * speed * 0.5) * 0.2
    const mat = ref.current.material as THREE.MeshStandardMaterial
    mat.opacity = 0.12 + Math.sin(t * speed * 0.4) * 0.06
  })

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[scale, 8, 6]} />
      <meshStandardMaterial
        color="#c8f0d8"
        transparent
        opacity={0.12}
        roughness={1}
        depthWrite={false}
      />
    </mesh>
  )
}

function MistLayer() {
  return (
    <group>
      <MistCloud position={[-4, -0.5, -9]} scale={2.5} speed={0.4} delay={0} />
      <MistCloud position={[2, -0.2, -10]} scale={3} speed={0.35} delay={2} />
      <MistCloud position={[-1, -0.8, -8]} scale={2} speed={0.5} delay={4} />
      <MistCloud position={[5, -0.4, -9.5]} scale={2.8} speed={0.3} delay={1} />
      <MistCloud position={[-6, -0.6, -10]} scale={3.2} speed={0.28} delay={3} />
      <MistCloud position={[8, -0.3, -9]} scale={2.2} speed={0.45} delay={5} />
    </group>
  )
}

// ─── ANIMATED SUN ────────────────────────────────────────────────────────────

function AnimatedSun() {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    const mat = ref.current.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = 0.7 + Math.sin(t * 0.8) * 0.3
  })

  return (
    <group position={[4, 3, -16]}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshStandardMaterial
          color="#fff5cc"
          emissive="#ffdd66"
          emissiveIntensity={0.8}
          roughness={0}
          metalness={0}
        />
      </mesh>
      {/* Glow halo */}
      <mesh>
        <sphereGeometry args={[1.1, 16, 16]} />
        <meshStandardMaterial
          color="#ffe599"
          transparent
          opacity={0.08}
          roughness={1}
          depthWrite={false}
        />
      </mesh>
      <pointLight color="#ffe8a0" intensity={4} distance={30} decay={1.5} />
    </group>
  )
}

// ─── FLOATING LANTERN PARTICLES ───────────────────────────────────────────────

function FloatingLanterns() {
  const count = 18
  const positions = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 20,
      y: Math.random() * 5 - 1,
      z: (Math.random() * 8 - 14),
      speed: 0.15 + Math.random() * 0.2,
      offset: Math.random() * Math.PI * 2,
      size: 0.03 + Math.random() * 0.05,
    }))
  }, [])

  const meshRef = useRef<THREE.InstancedMesh>(null)

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    const dummy = new THREE.Object3D()
    positions.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.offset) * 0.5,
        p.y + Math.sin(t * p.speed * 0.7 + p.offset) * 0.4 + t * 0.04 % 8,
        p.z
      )
      dummy.scale.setScalar(p.size)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial
        color="#d9ff78"
        emissive="#d9ff78"
        emissiveIntensity={2}
        roughness={0}
      />
    </instancedMesh>
  )
}

// ─── CAMERA DRIFT ────────────────────────────────────────────────────────────

function CameraDrift() {
  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime()
    camera.position.x = Math.sin(t * 0.06) * 0.4
    camera.position.y = 0.5 + Math.sin(t * 0.04) * 0.15
    camera.lookAt(0, 0, -8)
  })

  return null
}

// ─── HERO SCENE ──────────────────────────────────────────────────────────────

export function HeroScene() {
  return (
    <div className="hero-canvas-wrap" aria-hidden="true">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <PerspectiveCamera makeDefault position={[0, 0.5, 4]} fov={60} />
        <CameraDrift />

        {/* Atmosphere */}
        <color attach="background" args={['#07120a']} />
        <fog attach="fog" args={['#0a1a0d', 12, 30]} />

        {/* Lighting */}
        <ambientLight color="#1a3d22" intensity={1.2} />
        <directionalLight
          position={[4, 8, -5]}
          color="#ffe8a0"
          intensity={2.5}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-8, 4, 2]} color="#2a6b3a" intensity={0.8} />
        <hemisphereLight args={['#1a4a28', '#050f08', 0.6]} />

        <Suspense fallback={null}>
          <AnimatedSun />
          <MountainRange />
          <Terrain />
          <GlowingHouse />
          <MistLayer />
          <FloatingLanterns />
          <Stars
            radius={80}
            depth={40}
            count={800}
            factor={2}
            saturation={0.3}
            fade
            speed={0.3}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}

// ─── FLOATING ISLAND (Experience Section BG) ─────────────────────────────────

function FloatingIsland() {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    groupRef.current.rotation.y = t * 0.12
    groupRef.current.position.y = Math.sin(t * 0.5) * 0.15
  })

  const terrainGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(2.2, 1.4, 0.9, 10, 4)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      if (y > 0.1) {
        pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * 0.25)
        pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * 0.25)
        pos.setY(i, y + Math.random() * 0.3)
      }
    }
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Island base */}
      <mesh geometry={terrainGeo} castShadow receiveShadow>
        <meshStandardMaterial color="#1a4a28" roughness={0.9} metalness={0} flatShading />
      </mesh>
      {/* Small trees */}
      {[[-0.6, 0.6, 0.3], [0.4, 0.55, -0.5], [0.8, 0.5, 0.4], [-0.2, 0.65, -0.3]].map(([x, y, z], i) => (
        <group key={`tree-island-${i}`} position={[x, y, z] as [number, number, number]}>
          <mesh>
            <cylinderGeometry args={[0.04, 0.06, 0.3, 6]} />
            <meshStandardMaterial color="#2d1a0e" roughness={1} />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <coneGeometry args={[0.18, 0.4, 7]} />
            <meshStandardMaterial color="#1e5c2a" roughness={0.9} flatShading />
          </mesh>
        </group>
      ))}
      {/* Tiny house */}
      <group position={[0, 0.65, 0.1]}>
        <mesh>
          <boxGeometry args={[0.22, 0.18, 0.2]} />
          <meshStandardMaterial color="#0f1f14" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.13, 0]}>
          <coneGeometry args={[0.18, 0.15, 4]} />
          <meshStandardMaterial color="#0a160d" roughness={0.9} flatShading />
        </mesh>
        <pointLight color="#ffcc66" intensity={0.5} distance={2} />
      </group>
      {/* Bottom rock */}
      <mesh position={[0, -0.7, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[1.2, 0.8, 8]} />
        <meshStandardMaterial color="#0a1a0e" roughness={1} flatShading />
      </mesh>
    </group>
  )
}

export function IslandScene() {
  return (
    <div className="island-canvas-wrap" aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <PerspectiveCamera makeDefault position={[0, 1.5, 5]} fov={50} />
        <ambientLight color="#1a3d22" intensity={1.5} />
        <directionalLight position={[3, 5, 3]} color="#ffe8a0" intensity={2} />
        <directionalLight position={[-3, 2, -3]} color="#2a6b3a" intensity={0.8} />
        <pointLight position={[0, 3, 0]} color="#d9ff78" intensity={0.5} distance={8} />
        <Suspense fallback={null}>
          <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
            <FloatingIsland />
          </Float>
          <Stars radius={60} depth={20} count={400} factor={1.5} saturation={0} fade speed={0.2} />
        </Suspense>
        <fog attach="fog" args={['#050f08', 10, 20]} />
      </Canvas>
    </div>
  )
}

// ─── TERRAIN GLOBE (CTA Section) ─────────────────────────────────────────────

function TerrainSphere() {
  const ref = useRef<THREE.Mesh>(null)

  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1.8, 4)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
      const len = v.length()
      const noise =
        Math.sin(v.x * 3.5) * 0.08 +
        Math.cos(v.y * 4.2) * 0.07 +
        Math.sin(v.z * 3.8) * 0.06
      v.multiplyScalar(1 + noise / len)
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    g.computeVertexNormals()
    return g
  }, [])

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.getElapsedTime() * 0.15
    ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.08) * 0.1
  })

  return (
    <mesh ref={ref} geometry={geo} castShadow>
      <meshStandardMaterial
        color="#1a4a28"
        roughness={0.85}
        metalness={0.05}
        flatShading
        emissive="#0a2214"
        emissiveIntensity={0.3}
      />
    </mesh>
  )
}

function GlowRing() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.rotation.x = t * 0.2
    ref.current.rotation.z = t * 0.12
    const mat = ref.current.material as THREE.MeshStandardMaterial
    mat.opacity = 0.15 + Math.sin(t * 1.2) * 0.08
  })
  return (
    <mesh ref={ref}>
      <torusGeometry args={[2.4, 0.04, 8, 80]} />
      <meshStandardMaterial
        color="#d9ff78"
        emissive="#d9ff78"
        emissiveIntensity={1}
        transparent
        opacity={0.2}
        depthWrite={false}
      />
    </mesh>
  )
}

export function GlobeScene() {
  return (
    <div className="globe-canvas-wrap" aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 5.5]} fov={45} />
        <ambientLight color="#1a3d22" intensity={1.2} />
        <directionalLight position={[4, 6, 4]} color="#ffe8a0" intensity={3} castShadow />
        <directionalLight position={[-4, -2, -4]} color="#2a6b3a" intensity={0.8} />
        <pointLight position={[0, 0, 3]} color="#d9ff78" intensity={0.6} distance={8} />
        <Suspense fallback={null}>
          <Float speed={1.2} floatIntensity={0.4} rotationIntensity={0.2}>
            <TerrainSphere />
            <GlowRing />
          </Float>
          <Stars radius={50} depth={30} count={300} factor={1.2} saturation={0} fade speed={0.15} />
        </Suspense>
        <fog attach="fog" args={['#050f08', 12, 25]} />
      </Canvas>
    </div>
  )
}

// ─── DISTORT SPHERE (decorative accent) ──────────────────────────────────────

export function AccentSphere({ className }: { readonly className?: string }) {
  return (
    <div className={className ?? 'accent-canvas-wrap'} aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 3.5]} fov={50} />
        <ambientLight intensity={0.5} />
        <pointLight position={[2, 3, 2]} color="#d9ff78" intensity={3} />
        <pointLight position={[-2, -2, -2]} color="#2a6b3a" intensity={1.5} />
        <Suspense fallback={null}>
          <Float speed={2} floatIntensity={0.6} rotationIntensity={1}>
            <mesh>
              <sphereGeometry args={[1, 64, 64]} />
              <MeshDistortMaterial
                color="#1a4a28"
                distort={0.45}
                speed={2}
                roughness={0.3}
                metalness={0.2}
                emissive="#0d3018"
                emissiveIntensity={0.4}
              />
            </mesh>
          </Float>
        </Suspense>
      </Canvas>
    </div>
  )
}
