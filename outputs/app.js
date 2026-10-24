(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = matchMedia("(max-width: 760px)");
  const toggle = $(".menu-toggle");
  const nav = $("#primaryNavigation");
  const navLinks = $$(".primary-nav a");
  const rows = $$(".project-row");
  const form = $("#inquiryForm");
  const status = $("#formStatus");
  const sceneStatus = $(".scene-status");

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      toggle.setAttribute("aria-label", open ? "Open navigation" : "Close navigation");
      nav.classList.toggle("is-open", !open);
    });
    navLinks.forEach((a) => a.addEventListener("click", () => {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation");
      nav.classList.remove("is-open");
    }));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open navigation");
        nav.classList.remove("is-open");
      }
    });
  }

  let activeProject = 0;
  function chooseProject(index) {
    activeProject = Math.max(0, Math.min(rows.length - 1, index));
    rows.forEach((row, i) => {
      const active = i === activeProject;
      row.classList.toggle("is-active", active);
      row.setAttribute("aria-pressed", String(active));
    });
  }
  rows.forEach((row, i) => {
    row.addEventListener("click", () => chooseProject(i));
    row.addEventListener("pointerenter", () => chooseProject(i));
    row.addEventListener("focus", () => chooseProject(i));
  });

  const sections = $$(".scene-section");
  if ("IntersectionObserver" in window) {
    const navObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.hash === "#" + entry.target.id ? a.setAttribute("aria-current", "location") : a.removeAttribute("aria-current"));
    }), { rootMargin: "-38% 0px -52% 0px" });
    sections.forEach((s) => navObserver.observe(s));
    const projectObserver = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
      if (visible[0]) chooseProject(Number(visible[0].target.dataset.project));
    }, { rootMargin: "-28% 0px -46% 0px" });
    rows.forEach((r) => projectObserver.observe(r));
  }

  if (form) form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const recipient = form.dataset.email || "hello@frameby.no";
    const subject = encodeURIComponent("Project inquiry from " + String(data.get("name") || ""));
    const body = encodeURIComponent("Name: " + data.get("name") + "\nEmail: " + data.get("email") + "\nProject type: " + data.get("project") + "\n\n" + data.get("message"));
    status.textContent = "Opening a pre-filled email to " + recipient + ".";
    window.location.href = "mailto:" + recipient + "?subject=" + subject + "&body=" + body;
  });

  const canvas = $("#worldCanvas");
  const home = $("#home");
  const work = $("#work");
  if (!canvas || !window.THREE) {
    document.body.classList.add("no-webgl");
    return;
  }

  const T = window.THREE;
  let renderer, environment, frameId = 0, disposed = false;
  let pageVisible = !document.hidden;
  function fallback(error) {
    document.body.classList.add("no-webgl");
    canvas.style.display = "none";
    if (sceneStatus) sceneStatus.textContent = "Scene status / visual fallback";
    if (error) console.warn("3D scene fallback:", error);
  }

  try {
    const isMobile = mobile.matches;
    renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: !isMobile, powerPreference: "high-performance", stencil: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isMobile ? 1.12 : 1.5));
    renderer.setSize(innerWidth, innerHeight, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    const scene = new T.Scene();
    scene.fog = new T.FogExp2(0x080a09, 0.017);
    const camera = new T.PerspectiveCamera(isMobile ? 49 : 39, innerWidth / innerHeight, 0.1, 120);
    const look = new T.Vector3(0.45, 0.05, -0.1);
    camera.position.set(0.2, 0.15, 9.4);

    scene.add(new T.HemisphereLight(0xc4c9b4, 0x10120e, 1.15));
    const key = new T.PointLight(0xeaffaa, 170, 42, 1.5); key.position.set(-3.5, 4.5, 5); scene.add(key);
    const warm = new T.PointLight(0xffb06a, 92, 34, 1.6); warm.position.set(4.6, -0.8, 2.2); scene.add(warm);
    const rim = new T.PointLight(0xd33224, 175, 44, 1.35);
    rim.position.set(1.5, 3.5, -5);
    scene.add(rim);

    const envScene = new T.Scene();
    envScene.background = new T.Color(0x121713);
    [[-4,2,1,3.5,8,0xd9efab],[4,1,0,2.4,7,0xffc887],[0,5,-4,8,1.6,0xf3f0dc],[-1,-2,4,5,.7,0x94a764]].forEach((p) => {
      const m = new T.Mesh(new T.PlaneGeometry(p[3], p[4]), new T.MeshBasicMaterial({ color: p[5], side: T.DoubleSide }));
      m.position.set(p[0],p[1],p[2]); m.lookAt(0,0,0); envScene.add(m);
    });
    const pmrem = new T.PMREMGenerator(renderer);
    try { environment = pmrem.fromScene(envScene, .035).texture; scene.environment = environment; } catch (e) { console.warn("Reflections unavailable:", e); }
    finally { pmrem.dispose(); }

    const architecture = new T.Group(); scene.add(architecture);
    const metal = new T.MeshStandardMaterial({ color: 0x171c19, metalness: .78, roughness: .28 });
    const graphite = new T.MeshStandardMaterial({ color: 0x242a26, metalness: .84, roughness: .3 });
    const accents = [new T.MeshBasicMaterial({ color: 0xbfd77a, transparent: true, opacity: .34 }),new T.MeshBasicMaterial({ color: 0xd9573d, transparent: true, opacity: .4 })];
    const floor = new T.Mesh(new T.PlaneGeometry(90,90),new T.MeshStandardMaterial({color:0x101411,metalness:.54,roughness:.3}));
    floor.rotation.x=-Math.PI/2;floor.position.set(0,-2.85,-5);architecture.add(floor);
    const pillars = isMobile ? [[-6.5,-7,.45,9],[6.2,-9,.35,10]] : [[-7.2,-7,.5,12],[7.1,-10,.38,14],[-5.7,-13,.18,10],[5.5,-15,.18,11],[-9.2,-6,.22,8],[9.4,-8,.22,9]];
    pillars.forEach((p,i)=>{const [x,z,w,h]=p;const b=new T.Mesh(new T.BoxGeometry(w,h,.55),i%2?graphite:metal);b.position.set(x,h/2-2.55,z);architecture.add(b);const edge=new T.Mesh(new T.BoxGeometry(.025,h*.9,.58),accents[i%2]);edge.position.set(x+w/2,h/2-2.55,z+.3);architecture.add(edge)});
    const portals=[];
    for(let i=0;i<3;i++){const ring=new T.Mesh(new T.TorusGeometry(6.2-i*.72,.032-i*.003,8,160),new T.MeshStandardMaterial({color:i===0?0x667653:0x343b34,metalness:.7,roughness:.28,emissive:i===1?0x17200d:0}));ring.position.set(.25,.35,-7.2-i*1.65);ring.rotation.x=.06;architecture.add(ring);portals.push(ring)}
    if(!isMobile){const beamMat=new T.MeshBasicMaterial({color:0xd2e99c,transparent:true,opacity:.035,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});[[-4.2,1.5,-6,-.12],[.7,1.8,-7,.08],[4.3,1.35,-5,.18]].forEach((p,i)=>{const cone=new T.Mesh(new T.ConeGeometry(i===1?1.4:1.05,10,28,1,true),beamMat);cone.position.set(p[0],p[1],p[2]);cone.rotation.z=p[3];architecture.add(cone)})}
    const foreground=new T.Group(),fgmat=new T.MeshStandardMaterial({color:0x202723,metalness:.82,roughness:.24});
    [[-.26,-.1,1.3,.1,10,.42], [.22,.1,-.6,-.14,8,.34]].forEach((p,i)=>{const rail=new T.Mesh(new T.BoxGeometry(p[0]===0?0.2:Math.abs(p[0]),p[4],p[5]),fgmat);rail.position.set(i?-7.7:7.7,p[1],p[2]);rail.rotation.z=p[3];foreground.add(rail)});
    scene.add(foreground);

    const rig=new T.Group();rig.position.set(1.25,.03,-.62);rig.scale.setScalar(isMobile?.84:1.16);scene.add(rig);
    const bodyMat=new T.MeshStandardMaterial({color:0x202522,metalness:.82,roughness:.31,envMapIntensity:1.25});
    const rubber=new T.MeshStandardMaterial({color:0x090c0b,metalness:.18,roughness:.48});
    const steel=new T.MeshStandardMaterial({color:0x778078,metalness:.94,roughness:.22});
    const silver=new T.MeshStandardMaterial({color:0xb9bdb2,metalness:.9,roughness:.19});
    const amber=new T.MeshStandardMaterial({color:0x8b633b,metalness:.8,roughness:.23,emissive:0x201005});
    const lime=new T.MeshStandardMaterial({color:0x91a84e,metalness:.82,roughness:.21,emissive:0x242d0c});
    rig.add(new T.Mesh(new T.BoxGeometry(3.45,2.2,1.08),bodyMat));
    const front=new T.Mesh(new T.BoxGeometry(3.2,1.98,.12),graphite);front.position.z=.56;rig.add(front);
    const foot=new T.Mesh(new T.BoxGeometry(1.35,.28,.78),metal);foot.position.set(0,-1.19,-.36);rig.add(foot);
    function cylinderZ(group,top,bottom,depth,material,z){const m=new T.Mesh(new T.CylinderGeometry(top,bottom,depth,96),material);m.rotation.x=Math.PI/2;m.position.z=z;group.add(m);return m}
    function torus(group,r,t,material,z){const m=new T.Mesh(new T.TorusGeometry(r,t,12,144),material);m.position.z=z;group.add(m);return m}
    const lens=new T.Group();lens.position.set(.05,.05,.2);rig.add(lens);
    cylinderZ(lens,1.22,1.38,.42,bodyMat,-.02);cylinderZ(lens,1.16,1.22,.3,rubber,.3);cylinderZ(lens,1.1,1.16,.22,steel,.51);cylinderZ(lens,1.02,1.1,.22,rubber,.72);cylinderZ(lens,.98,1.02,.16,silver,.88);
    torus(lens,1.27,.075,steel,.18);torus(lens,1.13,.05,rubber,.47);torus(lens,1.06,.035,amber,.68);torus(lens,1,.06,silver,.91);torus(lens,.9,.035,lime,.98);
    [[.88,0xa6b49b,.78],[.68,0x486d68,.86],[.42,0x162528,.94]].forEach((p,i)=>{const m=new T.Mesh(new T.CircleGeometry(p[0],96),new T.MeshPhysicalMaterial({color:p[1],metalness:.24+i*.08,roughness:.06,clearcoat:1,transparent:true,opacity:p[2]}));m.position.z=.99+i*.012;lens.add(m)});
    const dome=new T.Mesh(new T.SphereGeometry(.61,64,40,0,Math.PI*2,0,Math.PI/2),new T.MeshPhysicalMaterial({color:0x9cbab2,metalness:.12,roughness:.045,clearcoat:1,transparent:true,opacity:.36}));dome.rotation.x=Math.PI/2;dome.scale.set(1.25,1.25,.72);dome.position.z=1.03;lens.add(dome);
    const iris=new T.Mesh(new T.CircleGeometry(.16,48),new T.MeshBasicMaterial({color:0x030706}));iris.position.z=1.045;lens.add(iris);
    const reflection=new T.Mesh(new T.PlaneGeometry(.54,.075),new T.MeshBasicMaterial({color:0xe7f2cf,transparent:true,opacity:.54,blending:T.AdditiveBlending,depthWrite:false}));reflection.position.set(-.18,.36,1.055);reflection.rotation.z=-.52;lens.add(reflection);
    for(let i=0;i<64;i++){const a=i/64*Math.PI*2,g=new T.Mesh(new T.BoxGeometry(.028,.085,.09),i%4===0?steel:rubber);g.position.set(Math.cos(a)*1.3,Math.sin(a)*1.3,.06);g.rotation.z=a;lens.add(g)}
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2,s=new T.Mesh(new T.SphereGeometry(.045,12,10),silver);s.position.set(Math.cos(a)*1.17,Math.sin(a)*1.17,.98);lens.add(s)}
    const dial=new T.Mesh(new T.CylinderGeometry(.23,.23,.18,40),amber);dial.rotation.z=Math.PI/2;dial.position.set(1.79,.54,-.26);rig.add(dial);
    const shutter=new T.Mesh(new T.CylinderGeometry(.14,.17,.11,36),lime);shutter.position.set(-.88,1.25,-.18);rig.add(shutter);

    const screen=document.createElement("canvas");screen.width=384;screen.height=256;const sc=screen.getContext("2d");
    sc.fillStyle="#101613";sc.fillRect(0,0,384,256);sc.strokeStyle="#91a84e";sc.lineWidth=3;sc.strokeRect(15,15,354,226);sc.fillStyle="#d5e0c0";sc.font="500 22px monospace";sc.fillText("REC  00:24",28,58);sc.fillStyle="#e0231c";sc.beginPath();sc.arc(337,43,8,0,Math.PI*2);sc.fill();sc.fillStyle="#a6aea0";sc.font="16px monospace";sc.fillText("4K   24 FPS",28,216);
    const screenTex=new T.CanvasTexture(screen);screenTex.colorSpace=T.SRGBColorSpace;
    const screenMesh=new T.Mesh(new T.PlaneGeometry(.68,.45),new T.MeshBasicMaterial({map:screenTex}));screenMesh.position.set(-.93,.35,.63);rig.add(screenMesh);

    const count=isMobile?110:340,positions=new Float32Array(count*3);
    for(let i=0;i<count;i++){const a=i*2.399,r=2+(i%61)/61*12;positions[i*3]=Math.cos(a)*r;positions[i*3+1]=(Math.sin(i*7.1)*.5+Math.cos(i*2.7)*.5)*6;positions[i*3+2]=-Math.random()*24}
    const dustGeo=new T.BufferGeometry();dustGeo.setAttribute("position",new T.BufferAttribute(positions,3));
    const dust=new T.Points(dustGeo,new T.PointsMaterial({color:0xe3e4d5,size:isMobile?.033:.022,transparent:true,opacity:.38,depthWrite:false,sizeAttenuation:true}));scene.add(dust);

    function poster(project,index){
      const c=document.createElement("canvas");c.width=720;c.height=480;const x=c.getContext("2d"),g=x.createLinearGradient(0,0,720,480);g.addColorStop(0,project.colors[0]);g.addColorStop(1,project.colors[1]);x.fillStyle=g;x.fillRect(0,0,720,480);
      x.globalAlpha=.16;x.strokeStyle="#f2eee6";x.lineWidth=1;for(let i=0;i<13;i++){x.beginPath();x.moveTo(i*58,0);x.lineTo(i*58-160,480);x.stroke()}x.globalAlpha=1;
      if(index===0){const glow=x.createRadialGradient(460,170,8,460,170,220);glow.addColorStop(0,"#f3dc9f");glow.addColorStop(.35,"#dd8c54");glow.addColorStop(1,"rgba(224,35,28,0)");x.fillStyle=glow;x.fillRect(150,0,570,400);for(let i=0;i<5;i++){x.fillStyle="rgba(15,18,15,"+(.4+i*.08)+")";x.beginPath();x.ellipse(380+i*24,292-i*19,165-i*15,37,-.08,0,Math.PI*2);x.fill()}}
      else if(index===1){for(let i=7;i>0;i--){x.strokeStyle=i%2?"rgba(255,211,193,.78)":"rgba(238,91,112,.72)";x.lineWidth=5+i;x.beginPath();x.ellipse(385,220,35+i*31,18+i*22,-.28,0,Math.PI*2);x.stroke()}}
      else{for(let i=0;i<6;i++){x.strokeStyle="rgba(186,211,188,.65)";x.lineWidth=20;x.beginPath();x.moveTo(-30,250+i*24);x.bezierCurveTo(145,120+i*12,355,370-i*15,760,82+i*34);x.stroke()}x.fillStyle="rgba(224,35,28,.48)";x.fillRect(462,80,24,265)}
      x.fillStyle="rgba(7,9,8,.68)";x.fillRect(0,0,720,48);x.fillRect(0,426,720,54);x.fillStyle="#f1eee6";x.font="500 17px monospace";x.fillText("FRAME / MOTION - STUDY 0"+(index+1),22,31);x.font="600 25px sans-serif";x.fillText(project.title,22,462);
      const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;
    }
    const projectData=[{title:"SOLIS",colors:["#171914","#9d4728"]},{title:"SOFT SIGNAL",colors:["#1b151b","#a64759"]},{title:"OTHER WORLDS",colors:["#111916","#456b5b"]}];
    const framePos=[new T.Vector3(-4.25,.7,-3.8),new T.Vector3(.1,.35,-5.2),new T.Vector3(4.2,.4,-3.6)],frames=[];
    projectData.forEach((p,i)=>{const root=new T.Group(),back=new T.Mesh(new T.BoxGeometry(2.65,1.82,.12),new T.MeshStandardMaterial({color:0x202522,metalness:.76,roughness:.28,transparent:true,opacity:.08}));root.add(back);const img=new T.Mesh(new T.PlaneGeometry(2.48,1.65),new T.MeshBasicMaterial({map:poster(p,i),transparent:true,opacity:.08}));img.position.z=.071;root.add(img);root.add(new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(2.65,1.82,.13)),new T.LineBasicMaterial({color:i===1?0xe59d86:0xbcd179,transparent:true,opacity:.12})));root.position.copy(framePos[i]);root.rotation.set(i===1?.06:-.04,(i-1)*-.12,i===0?.05:-.03);root.userData.baseY=root.position.y;root.userData.phase=i*2.2;root.userData.rotY=root.rotation.y;scene.add(root);frames.push(root)});

    const points=[
      {id:"home",p:new T.Vector3(.25,.2,9.5),t:new T.Vector3(.55,.02,-.05)},
      {id:"work",p:new T.Vector3(-.1,.15,8.3),t:new T.Vector3(0,.15,-2.5)},
      {id:"studio",p:new T.Vector3(2.5,.55,8.8),t:new T.Vector3(.3,.12,-1.3)},
      {id:"services",p:new T.Vector3(-1.8,.35,9.6),t:new T.Vector3(-.15,.05,-2.8)},
      {id:"contact",p:new T.Vector3(.4,.3,10.2),t:new T.Vector3(.1,.1,-4.5)}
    ], pathSections=points.map((p)=>$("#"+p.id));
    let px=0,py=0,sx=0,sy=0,active=0;
    const introStart=performance.now(),closeP=new T.Vector3(1.1,.08,3.35),closeT=new T.Vector3(1.25,.08,1.28);
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    const ease=(v)=>{const t=clamp(v,0,1);return t*t*(3-2*t)};
    function pathPose(){const marker=scrollY+innerHeight*.47;let i=0;while(i<pathSections.length-1&&marker>pathSections[i+1].offsetTop)i++;if(i>=points.length-1)return{p:points[i].p.clone(),t:points[i].t.clone()};const a=pathSections[i],b=pathSections[i+1],u=ease((marker-a.offsetTop)/Math.max(1,b.offsetTop-a.offsetTop));return{p:points[i].p.clone().lerp(points[i+1].p,u),t:points[i].t.clone().lerp(points[i+1].t,u)}}
    function workMix(){const r=work.getBoundingClientRect(),d=Math.abs(r.top+r.height/2-innerHeight/2);return clamp(1-d/(r.height/2+innerHeight*.55),0,1)}
    function setOpacity(object,value){object.traverse((child)=>{if(!child.material)return;(Array.isArray(child.material)?child.material:[child.material]).forEach((m)=>{m.opacity=value})})}
    function resize(){renderer.setSize(innerWidth,innerHeight,false);renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile.matches?1.12:1.5));camera.aspect=innerWidth/innerHeight;camera.fov=mobile.matches?49:39;camera.updateProjectionMatrix()}
    addEventListener("resize",resize,{passive:true});resize();
    if(!mobile.matches){addEventListener("pointermove",(e)=>{px=(e.clientX/innerWidth-.5)*2;py=(e.clientY/innerHeight-.5)*2},{passive:true});addEventListener("pointerleave",()=>{px=py=0},{passive:true})}
    let last=0;
    function render(now){
      if(disposed||!pageVisible){frameId=0;return}
      const dt=Math.min(.05,(now-(last||now))/1000||.016);last=now;const time=(now-introStart)/1000,p=pathPose(),mix=workMix();
      let cp=p.p,ct=p.t;
      if(mix>.08){const f=framePos[active];cp=p.p.clone().lerp(f.clone().add(new T.Vector3(f.x*.18,.2,8.3)),mix*.42);ct=p.t.clone().lerp(f,mix*.72)}
      if(!reduced.matches&&scrollY<home.offsetHeight*.9&&time<4.6){const u=ease(time/4.6),arc=Math.sin(Math.PI*u);cp=closeP.clone().lerp(cp,u);cp.x+=arc*.78;cp.z+=arc*.22;ct=closeT.clone().lerp(ct,u);ct.x+=arc*.12}
      const damp=reduced.matches?1:1-Math.exp(-dt*2.45);camera.position.lerp(cp,damp);look.lerp(ct,damp);
      if(!reduced.matches&&!mobile.matches){sx+=(px-sx)*(1-Math.exp(-dt*2.15));sy+=(py-sy)*(1-Math.exp(-dt*2.15))}else{sx*=.9;sy*=.9}
      camera.position.x+=sx*.17;camera.position.y-=sy*.09;camera.lookAt(look);
      const motion=reduced.matches?0:1;
      rig.rotation.y+=(sx*.08+Math.sin(time*.2)*.018*motion-rig.rotation.y)*(1-Math.exp(-dt*1.1));
      rig.rotation.x+=(sy*.052+Math.sin(time*.15)*.011*motion-rig.rotation.x)*(1-Math.exp(-dt*1.1));
      rig.rotation.z=Math.sin(time*.18)*.008*motion;rig.position.y=.03+Math.sin(time*.4)*.032*motion;
      architecture.rotation.y=Math.sin(time*.08)*.01*motion;dust.rotation.y=time*.006*motion;dust.position.y=Math.sin(time*.13)*.07*motion;
      key.position.x=-3.5+Math.sin(time*.18)*1.2;warm.position.x=4.6+Math.cos(time*.14)*.6;
      portals.forEach((o,i)=>{o.rotation.y=Math.sin(time*.13+i)*.022*motion;o.rotation.z=Math.cos(time*.11+i)*.016*motion});
      frames.forEach((f,i)=>{const emph=i===active?1:.26;setOpacity(f,.025+mix*emph*.86);f.scale.setScalar((i===active?.78:.66)+mix*(i===active?.32:.08));f.position.y=f.userData.baseY+Math.sin(time*.34+f.userData.phase)*.09*motion;f.rotation.y+=(f.userData.rotY+sx*.025-f.rotation.y)*(1-Math.exp(-dt*1.4))});
      renderer.render(scene,camera);frameId=requestAnimationFrame(render)
    }
    document.addEventListener("visibilitychange",()=>{pageVisible=!document.hidden;if(pageVisible&&!frameId)frameId=requestAnimationFrame(render)});
    canvas.addEventListener("webglcontextlost",(e)=>{e.preventDefault();disposed=true;cancelAnimationFrame(frameId);fallback(new Error("WebGL context lost"))});
    addEventListener("pagehide",()=>{disposed=true;cancelAnimationFrame(frameId);renderer.dispose();dustGeo.dispose();if(environment)environment.dispose()},{once:true});
    document.body.classList.add("webgl-ready");
    if(sceneStatus)sceneStatus.textContent="Scene status / live";
    render(performance.now());
  } catch(error) {
    document.body.classList.add("no-webgl");canvas.style.display="none";console.warn("3D scene fallback:",error);
  }
})();
