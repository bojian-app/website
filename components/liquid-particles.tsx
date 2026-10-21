"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { particleText } from "@/lib/particle-text";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";

// Coherent vector noise advects a layered particle surface. This is an artistic
// fluid field, not a Navier–Stokes simulation. All particles move on the GPU.
const vertexShader = `
attribute vec4 a_seed;
attribute vec3 a_welcome;
attribute vec3 a_guide;
uniform float u_time;
uniform float u_progress;
uniform float u_pixelRatio;
uniform vec2 u_pointer;
uniform vec2 u_velocity;
uniform float u_interaction;
uniform float u_formation;
uniform float u_message;
uniform float u_scatter;
uniform float u_appearance;
uniform vec3 u_layout;
varying float v_alpha;
varying float v_light;
varying float v_tint;
vec3 hash(vec3 p){p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));return -1.+2.*fract(sin(p)*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(mix(dot(hash(i),f),dot(hash(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),mix(dot(hash(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(hash(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),mix(mix(dot(hash(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(hash(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),mix(dot(hash(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(hash(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z);}
mat2 turn(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
void main(){
  float t=u_time*.40;
  vec3 unit=normalize(position);
  unit.xz=turn(t*.27+unit.y*.75)*unit.xz;
  unit.xy=turn(sin(t*.43)*.25)*unit.xy;
  vec3 q=unit*1.6+vec3(t*.42,-t*.58,t*.22);
  float broad=noise(q)*.72+noise(q*2.15+4.7)*.22;
  float folds=sin(unit.y*4.8+unit.x*2.4+t*1.4)*.22;
  float radius=2.28+broad+folds;
  vec3 p=unit*radius;
  // Unequal axes and a slowly turning neck give the fluid an open, folded form.
  p.x*=1.3;p.y*=.95;
  p.x+=sin(unit.y*2.3+t*.48)*.48;
  p.z+=sin(unit.x*3.+t*.7)*.32;
  vec3 flow=vec3(noise(q+vec3(8.3,1.,0.)),noise(q+vec3(0.,7.1,2.)),noise(q+vec3(1.,0.,5.4)));
  p+=flow*(.20+a_seed.x*.13);
  p*=.92+a_seed.y*.10;
  float fringe=pow(a_seed.z,18.);
  p+=unit*fringe*(.2+.65*a_seed.x);
  p.xy=turn(-.28+u_progress*.4)*p.xy;
  p.x-=u_progress*2.8;
  p.z-=u_progress*.7;
  float formation=smoothstep(0.,1.,clamp(u_formation*1.22-a_seed.x*.22,0.,1.));
  vec3 destination=mix(a_welcome,a_guide,u_message);
  destination.xy*=u_layout.x;
  destination.x+=u_layout.y;
  destination.y+=u_layout.z;
  destination.xy+=vec2(sin(u_time*.6+a_seed.w*6.283),cos(u_time*.5+a_seed.x*6.283))*.006;
  // Arcing paths and staggered arrival keep the gathering visibly particulate.
  float arc=sin(formation*3.14159265);
  p=mix(p,destination,formation);
  p.xy+=vec2(sin(a_seed.w*6.283+formation*4.),cos(a_seed.w*6.283+formation*4.))*arc*(.4+a_seed.z*.9);
  p.z+=sin(a_seed.x*6.283)*arc*1.6;
  p+=vec3(sin(a_seed.w*6.283),cos(a_seed.w*6.283),sin(a_seed.x*6.283))*u_scatter*(1.-formation*.45)*(1.+a_seed.z*2.);
  // Scrolling returns the text to the liquid field before the product enters.
  p.x-=u_progress*formation*2.8;
  vec2 delta=p.xy-u_pointer;
  float influence=exp(-dot(delta,delta)*1.5)*u_interaction*(1.-formation*.9);
  vec2 push=delta/max(length(delta),.001);
  p.xy+=push*influence*.85;
  p.xy+=vec2(-push.y,push.x)*influence*.4;
  p.xy+=u_velocity*influence*.14;
  p.z+=influence*sin(a_seed.w*6.283+t*2.)*.6;
  vec4 mv=modelViewMatrix*vec4(p,1.);
  gl_Position=projectionMatrix*mv;
  float size=mix(mix(1.3,2.15,a_seed.w),1.2,formation);
  gl_PointSize=clamp(size*u_pixelRatio*8.5/-mv.z,.7,3.8*u_pixelRatio);
  float face=dot(unit,normalize(vec3(-.4,.8,1.)));
  float ridge=pow(1.-abs(unit.z),2.);
  v_light=.35+max(0.,face)*.6+ridge*.3;
  v_alpha=(.32+.6*smoothstep(-2.5,2.5,p.z))*(1.-fringe*.58)*(1.-u_progress*.3);
  v_tint=clamp(.5+noise(q*.7)*.8+unit.y*.1,0.,1.);
  v_light=mix(v_light,.95,formation);
  v_alpha=mix(v_alpha,.32,formation)*u_appearance;
  v_tint=mix(v_tint,.9,formation);
}`;
const fragmentShader = `
precision highp float;
varying float v_alpha;
varying float v_light;
varying float v_tint;
void main(){
  float r=length(gl_PointCoord-.5);
  if(r>.5)discard;
  float core=1.-smoothstep(.08,.5,r);
  vec3 color=mix(vec3(.24,.50,1.),vec3(.80,.94,1.),v_tint)*v_light*1.55;
  gl_FragColor=vec4(color,core*v_alpha);
}`;

export function LiquidParticles() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current,
      canvas = host?.querySelector("canvas");
    const stage = host?.closest<HTMLElement>(".product-stage");
    if (!host || !canvas || !stage) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }
    const scene = new Scene();
    const camera = new PerspectiveCamera(42, 1, 0.1, 40);
    let reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const media = gsap.matchMedia();
    const geometry = new BufferGeometry();
    const count = innerWidth < 700 ? 20000 : 48000;
    const positions = new Float32Array(count * 3),
      seeds = new Float32Array(count * 4);
    let seed = 731;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    // A uniform Fibonacci surface avoids polar bands and random clusters.
    for (let i = 0; i < count; i++) {
      const y = 1 - (2 * (i + 0.5)) / count,
        r = Math.sqrt(1 - y * y),
        a = i * 2.399963229728653;
      positions.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3);
      seeds.set([random(), random(), random(), random()], i * 4);
    }
    const welcome = particleText("欢迎使用博简", count);
    const guide = particleText("下滑查看用户指引", count);
    if (!welcome || !guide) {
      geometry.dispose();
      renderer.dispose();
      return;
    }
    geometry.setAttribute("a_welcome", new BufferAttribute(welcome, 3));
    geometry.setAttribute("a_guide", new BufferAttribute(guide, 3));
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("a_seed", new BufferAttribute(seeds, 4));
    const uniforms = {
      u_time: { value: 0 },
      u_progress: { value: 0 },
      u_pixelRatio: { value: 1 },
      u_pointer: { value: new Vector2(20, 20) },
      u_velocity: { value: new Vector2() },
      u_interaction: { value: 0 },
      u_formation: { value: 0 },
      u_message: { value: 0 },
      u_scatter: { value: 0 },
      u_appearance: { value: 0 },
      u_layout: { value: new Vector3() },
    };
    const material = new ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
    });
    const particles = new Points(geometry, material);
    particles.frustumCulled = false;
    scene.add(particles);
    let frame = 0,
      last = 0,
      time = 0,
      visible = true,
      lost = false,
      disposed = false;
    let targetX = 20,
      targetY = 20,
      velocityX = 0,
      velocityY = 0,
      active = false,
      previousX = 0,
      previousY = 0;
    const pointerTarget = new Vector2();
    const velocityTarget = new Vector2();
    let phase = "";
    function draw() {
      if (disposed || lost) return;
      const progress = Number(stage!.dataset.progress) || 0;
      const mobile = host!.clientWidth < 900;
      camera.position.set(mobile ? 0 : -1.35, 0.1, mobile ? 11.6 : 10.7);
      camera.lookAt(mobile ? 0 : -1.35, 0.1, 0);
      // Active visible seconds: no timers run behind other tabs or off screen.
      const age = reduceMotion ? 11 : time;
      let formation = 0,
        message = 0,
        scatter = 0,
        nextPhase = "appearing";
      if (age >= 10.55) {
        formation = 1;
        message = 1;
        nextPhase = "guide";
      } else if (age >= 8.35) {
        formation = (age - 8.35) / 2.2;
        message = 1;
        scatter = 1 - formation;
        nextPhase = "forming-guide";
      } else if (age >= 7.2) {
        const p = (age - 7.2) / 1.15;
        formation = 1 - p;
        scatter = Math.sin(p * Math.PI * 0.5);
        nextPhase = "scattering";
      } else if (age >= 4.2) {
        formation = 1;
        nextPhase = "welcome";
      } else if (age >= 2) {
        formation = (age - 2) / 2.2;
        nextPhase = "forming-welcome";
      } else if (age >= 1.1) {
        nextPhase = "liquid";
      }
      uniforms.u_formation.value = formation * (1 - Math.min(1, progress * 4));
      uniforms.u_message.value = message;
      uniforms.u_scatter.value = scatter;
      uniforms.u_appearance.value = Math.min(1, age / 1.1);
      const worldWidth =
        2 * Math.tan((42 * Math.PI) / 360) * camera.position.z * camera.aspect;
      uniforms.u_layout.value.set(
        Math.min(0.82, (worldWidth * 0.82) / 8),
        camera.position.x,
        0.1,
      );
      if (phase !== nextPhase) {
        phase = nextPhase;
        host!.dataset.phase = phase;
      }
      uniforms.u_time.value = time;
      uniforms.u_progress.value = progress;
      uniforms.u_pointer.value.lerp(pointerTarget.set(targetX, targetY), 0.13);
      uniforms.u_velocity.value.lerp(
        velocityTarget.set(velocityX, velocityY),
        0.12,
      );
      uniforms.u_interaction.value +=
        ((active && !reduceMotion ? 1 : 0) - uniforms.u_interaction.value) *
        0.07;
      velocityX *= 0.94;
      velocityY *= 0.94;
      renderer.render(scene, camera);
    }
    function tick(now: number) {
      frame = 0;
      if (disposed || lost || reduceMotion || document.hidden || !visible)
        return;
      if (!last || now - last >= (innerWidth < 700 ? 33 : 22)) {
        time += last ? (now - last) / 1000 : 0;
        last = now;
        draw();
      }
      frame = requestAnimationFrame(tick);
    }
    function sync() {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      const playing =
        !disposed && !lost && !reduceMotion && !document.hidden && visible;
      host!.dataset.animated = String(playing);
      if (reduceMotion) {
        active = false;
        uniforms.u_interaction.value = 0;
      }
      if (playing) frame = requestAnimationFrame(tick);
      else if (visible) draw();
    }
    function resize() {
      const width = Math.max(1, host!.clientWidth),
        height = Math.max(1, host!.clientHeight);
      const dpr = Math.min(devicePixelRatio || 1, width < 700 ? 1.25 : 1.5);
      renderer.setPixelRatio(dpr);
      uniforms.u_pixelRatio.value = dpr;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      draw();
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || reduceMotion) return;
      const box = stage!.getBoundingClientRect();
      const worldHeight =
        2 * Math.tan((42 * Math.PI) / 360) * camera.position.z;
      const x =
        ((e.clientX - box.left) / box.width - 0.5) *
          worldHeight *
          camera.aspect +
        camera.position.x;
      const y = (0.5 - (e.clientY - box.top) / box.height) * worldHeight + 0.1;
      if (active) {
        velocityX = Math.max(-2, Math.min(2, (x - previousX) * 9));
        velocityY = Math.max(-2, Math.min(2, (y - previousY) * 9));
      }
      previousX = x;
      previousY = y;
      targetX = x;
      targetY = y;
      active = true;
    };
    const leave = () => {
      active = false;
    };
    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      host!.dataset.renderer = "fallback";
      sync();
    };
    const onRestored = () => {
      lost = false;
      host!.dataset.renderer = "webgl";
      resize();
      sync();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    stage.addEventListener("pointermove", move, { passive: true });
    stage.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", sync);

    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        sync();
      },
      { rootMargin: "100px" },
    );
    observer.observe(host);
    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(host);
    host.dataset.renderer = "webgl";
    resize();
    media.add(
      {
        motion: "(prefers-reduced-motion: no-preference)",
        static: "(prefers-reduced-motion: reduce)",
      },
      (state) => {
        reduceMotion = !state.conditions?.motion;
        sync();
        return () => {
          cancelAnimationFrame(frame);
          frame = 0;
        };
      },
    );
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      sizeObserver.disconnect();
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", sync);
      media.revert();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);
  return (
    <div
      className="liquid-particles"
      ref={ref}
      data-renderer="fallback"
      data-animated="false"
      aria-hidden="true"
    >
      <div className="liquid-fallback" />
      <div className="particle-fallback-text">
        <span>欢迎使用博简</span>
        <span>下滑查看用户指引</span>
      </div>
      <canvas />
    </div>
  );
}
