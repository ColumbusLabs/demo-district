/** Bounded analytic displays: each window compiles only its own installation. */
export const exhibitShapes = /* glsl */`
  void orb(vec3 o, vec3 d, vec3 c, vec3 scale, vec3 tint, float glow, inout float nearest, inout vec3 color) {
    vec3 p = (o - c) / scale;
    vec3 r = d / scale;
    float a = dot(r,r), b = dot(p,r), det = b*b-a*(dot(p,p)-1.0);
    if (det < 0.0) return;
    float t = (-b-sqrt(det))/a;
    if (t <= 0.0 || t >= nearest) return;
    nearest = t;
    vec3 n = normalize((o+d*t-c)/(scale*scale));
    float light = 0.32 + 0.68*max(0.0,dot(n,normalize(vec3(-0.6,1.0,1.5))));
    color = tint * (light + glow) + vec3(0.55)*pow(max(0.0,dot(reflect(d,n),normalize(vec3(-0.6,1.0,1.5)))),28.0);
  }
  void hoop(vec3 o, vec3 d, vec3 c, vec3 n, float radius, float thickness, vec3 tint, inout float nearest, inout vec3 color) {
    n = normalize(n);
    float denom = dot(d,n);
    if (abs(denom) < 0.0001) return;
    float t = dot(c-o,n)/denom;
    if (t <= 0.0 || t >= nearest) return;
    float r = length(o+d*t-c);
    if (abs(r-radius) < thickness) { nearest=t; color=tint; }
  }
  mat3 spin(float a) { float c=cos(a),s=sin(a); return mat3(c,s,0.0,-s,c,0.0,0.0,0.0,1.0); }
  // A thin square beam from a to b in the window plane (a.z is used for both ends).
  void beam(vec3 o, vec3 d, vec3 a, vec3 b, float w, vec3 tint, inout float nearest, inout vec3 color) {
    vec2 v = b.xy - a.xy;
    mat3 turn = spin(-atan(v.y, v.x));
    vec3 c = vec3((a.xy + b.xy) * 0.5, a.z);
    displayBox(turn*(o-c), turn*d, vec3(0.0), vec3(length(v)*0.5, w, w), tint, nearest, color);
  }
`;

export const exhibitInstallation = /* glsl */`
  // Normalize the installation to window height, keeping real view-dependent depth.
  float unit = size.y;
  vec3 origin = vLocal / unit;
  vec3 ray = dir;
  float nearExhibit = t / unit;
  vec3 base = vec3(0.0,-0.5,-roomDepth*0.45/unit);
  vec3 ink = vec3(0.025,0.035,0.055);
  vec3 gold = vec3(0.85,0.47,0.14);
  #if EXHIBIT_KIND == 0
    // ART: a suspended coral mobile, ivory blades sweeping around a gold hoop.
    hoop(origin,ray,base+vec3(0.0,0.54,0.0),vec3(0.25,0.15,1.0),0.29,0.012,gold,nearExhibit,room);
    for (int i=0;i<7;i++) {
      float a=float(i)*0.897;
      vec3 c=base+vec3(cos(a)*0.24,0.54+sin(a)*0.24,sin(a*2.0)*0.08);
      mat3 turn=spin(a+0.6);
      displayBox(turn*(origin-c),turn*ray,vec3(0.0),vec3(0.12,0.036,0.018),mix(vec3(0.95,0.12,0.075),vec3(0.9,0.8,0.62),mod(float(i),2.0)),nearExhibit,room);
    }
    displayBox(origin,ray,base+vec3(0.0,0.93,0.0),vec3(0.002,0.15,0.002),gold,nearExhibit,room);
  #elif EXHIBIT_KIND == 1
    // WORLDS: floating terraced island with an illuminated miniature village.
    orb(origin,ray,base+vec3(0.0,0.27,0.0),vec3(0.35,0.14,0.23),vec3(0.09,0.18,0.18),0.0,nearExhibit,room);
    orb(origin,ray,base+vec3(0.0,0.37,0.0),vec3(0.31,0.055,0.22),vec3(0.17,0.34,0.27),0.0,nearExhibit,room);
    for (int i=0;i<5;i++) {
      float f=float(i); float x=(f-2.0)*0.12; float h=0.1+0.08*sin(f*1.7+0.5);
      vec3 c=base+vec3(x,0.42+h*0.5,0.035*sin(f*2.0));
      displayBox(origin,ray,c,vec3(0.044,h*0.5,0.044),vec3(0.20,0.12,0.065),nearExhibit,room);
      displayBox(origin,ray,c+vec3(0.0,0.015,0.046),vec3(0.025,0.03,0.003),vec3(1.7,0.8,0.2),nearExhibit,room);
      orb(origin,ray,base+vec3(x,0.72+0.08*cos(f),-0.06),vec3(0.018,0.03,0.018),gold,0.8,nearExhibit,room);
    }
    hoop(origin,ray,base+vec3(0.0,0.12,0.0),vec3(0.0,1.0,0.2),0.37,0.009,vec3(0.15,0.8,0.8),nearExhibit,room);
  #elif EXHIBIT_KIND == 2
    // MUSIC: a luminous wave of freestanding organ pipes on a black stage.
    displayBox(origin,ray,base+vec3(0.0,0.08,0.0),vec3(0.43,0.08,0.15),ink,nearExhibit,room);
    for (int i=0;i<11;i++) {
      float f=float(i); float h=0.18+0.42*pow(0.5+0.5*sin(f*0.65-1.5),2.0);
      vec3 c=base+vec3((f-5.0)*0.075,0.16+h*0.5,0.045*cos(f*0.6));
      displayBox(origin,ray,c,vec3(0.02,h*0.5,0.025),vec3(0.08,0.35,0.5),nearExhibit,room);
      displayBox(origin,ray,c+vec3(0.0,0.0,0.027),vec3(0.006,h*0.5,0.002),vec3(0.2,1.4,1.8),nearExhibit,room);
    }
  #elif EXHIBIT_KIND == 3
    // GAMES: an impossible ascending course of tilted blocks and a golden comet.
    for (int i=0;i<6;i++) {
      float f=float(i); vec3 c=base+vec3(-0.32+f*0.12,0.18+f*0.11,sin(f)*0.09);
      mat3 turn=spin(-0.12+f*0.09);
      displayBox(turn*(origin-c),turn*ray,vec3(0.0),vec3(0.073,0.036,0.085),mix(vec3(0.08,0.17,0.55),vec3(0.65,0.25,0.07),f/5.0),nearExhibit,room);
    }
    orb(origin,ray,base+vec3(0.20,0.83,-0.03),vec3(0.085),vec3(1.0,0.57,0.12),0.4,nearExhibit,room);
    hoop(origin,ray,base+vec3(0.20,0.83,-0.03),vec3(0.0,0.0,1.0),0.135,0.007,gold,nearExhibit,room);
  #elif EXHIBIT_KIND == 4
    // STORIES: an open book whose loose pages spiral upward.
    displayBox(origin,ray,base+vec3(0.0,0.15,0.0),vec3(0.24,0.15,0.15),vec3(0.17,0.095,0.045),nearExhibit,room);
    for (int i=0;i<2;i++) {
      float side=float(i)*2.0-1.0; mat3 turn=spin(side*0.18);
      vec3 c=base+vec3(side*0.12,0.34,0.03);
      displayBox(turn*(origin-c),turn*ray,vec3(0.0),vec3(0.13,0.021,0.17),vec3(0.88,0.76,0.52),nearExhibit,room);
    }
    for (int i=0;i<5;i++) {
      float f=float(i); vec3 c=base+vec3(sin(f*1.3)*0.21,0.46+f*0.085,cos(f)*0.06);
      mat3 turn=spin(-0.5+f*0.3);
      displayBox(turn*(origin-c),turn*ray,vec3(0.0),vec3(0.072,0.043,0.003),vec3(1.0,0.87,0.62),nearExhibit,room);
    }
  #elif EXHIBIT_KIND == 5
    // TOOLS: a loom of colored strands stretched through a brass frame.
    for (int i=0;i<2;i++) displayBox(origin,ray,base+vec3(float(i)*0.64-0.32,0.48,0.0),vec3(0.017,0.39,0.025),gold,nearExhibit,room);
    for (int i=0;i<9;i++) {
      float f=float(i); mat3 turn=spin(0.30*sin(f)); vec3 c=base+vec3((f-4.0)*0.061,0.49,sin(f)*0.025);
      displayBox(turn*(origin-c),turn*ray,vec3(0.0),vec3(0.009,0.34,0.009),mix(vec3(0.15,0.9,1.0),vec3(0.95,0.12,0.55),f/8.0),nearExhibit,room);
    }
    for (int i=0;i<2;i++) displayBox(origin,ray,base+vec3(0.0,0.10+float(i)*0.77,0.0),vec3(0.34,0.02,0.03),gold,nearExhibit,room);
  #elif EXHIBIT_KIND == 6
    // EXPERIMENTS: specimen light-globes at different heights in a dark lab.
    displayBox(origin,ray,base+vec3(0.0,0.10,0.0),vec3(0.38,0.10,0.18),ink,nearExhibit,room);
    for (int i=0;i<5;i++) {
      float f=float(i); float h=0.32+0.22*sin(f*1.7); float x=(f-2.0)*0.15;
      displayBox(origin,ray,base+vec3(x,0.20+h*0.5,0.025*sin(f)),vec3(0.009,h*0.5,0.009),vec3(0.1,0.3,0.2),nearExhibit,room);
      orb(origin,ray,base+vec3(x,0.2+h,0.025*sin(f)),vec3(0.064,0.085,0.064),vec3(0.35,0.85,0.28),0.55,nearExhibit,room);
    }
    hoop(origin,ray,base+vec3(0.0,0.49,0.0),vec3(0.2,0.15,1.0),0.37,0.005,vec3(0.3,0.65,0.4),nearExhibit,room);
  #elif EXHIBIT_KIND == 8
    // LENS: an optics bench. Light from a miniature tree passes three glass elements in a
    // brass barrel and converges on a glowing plane of focus.
    displayBox(origin,ray,base+vec3(0.0,0.07,0.0),vec3(0.47,0.022,0.05),ink,nearExhibit,room);
    displayBox(origin,ray,base+vec3(0.0,0.094,0.052),vec3(0.47,0.003,0.002),gold,nearExhibit,room);
    // The subject: a small tree on a stand.
    displayBox(origin,ray,base+vec3(-0.40,0.12,0.0),vec3(0.035,0.03,0.035),ink,nearExhibit,room);
    displayBox(origin,ray,base+vec3(-0.40,0.20,0.0),vec3(0.009,0.05,0.009),vec3(0.24,0.14,0.07),nearExhibit,room);
    orb(origin,ray,base+vec3(-0.40,0.33,0.0),vec3(0.055,0.095,0.055),vec3(0.16,0.42,0.22),0.1,nearExhibit,room);
    // Lens elements, barrel rings and mount.
    vec3 axis=base+vec3(0.0,0.42,0.0);
    orb(origin,ray,axis+vec3(-0.08,0.0,0.0),vec3(0.018,0.17,0.17),vec3(0.30,0.55,0.72),0.25,nearExhibit,room);
    orb(origin,ray,axis,vec3(0.03,0.21,0.21),vec3(0.36,0.62,0.80),0.3,nearExhibit,room);
    orb(origin,ray,axis+vec3(0.07,0.0,0.0),vec3(0.016,0.15,0.15),vec3(0.30,0.55,0.72),0.25,nearExhibit,room);
    for (int i=0;i<3;i++) hoop(origin,ray,axis+vec3(-0.11+float(i)*0.1,0.0,0.0),vec3(1.0,0.0,0.0),0.225,0.011,gold,nearExhibit,room);
    displayBox(origin,ray,base+vec3(0.0,0.15,0.0),vec3(0.025,0.06,0.025),gold*0.7,nearExhibit,room);
    // Rays: out from the treetop, bent by the glass, meeting on the focal plane.
    vec3 subject=base+vec3(-0.40,0.40,0.0);
    vec3 image=base+vec3(0.34,0.31,0.0);
    vec3 beamTint=vec3(1.7,1.05,0.45);
    for (int i=0;i<3;i++) {
      vec3 glass=axis+vec3(0.0,(1.0-float(i))*0.15,0.0);
      beam(origin,ray,subject,glass,0.0035,beamTint,nearExhibit,room);
      beam(origin,ray,glass,image,0.0035,beamTint,nearExhibit,room);
    }
    // The plane of focus: a glowing sensor sheet on a slim stand.
    displayBox(origin,ray,image+vec3(0.0,0.03,0.0),vec3(0.004,0.15,0.11),vec3(0.55,1.45,2.0),nearExhibit,room);
    displayBox(origin,ray,base+vec3(0.34,0.14,0.0),vec3(0.008,0.05,0.008),ink,nearExhibit,room);
  #else
    // LEARNING: a suspended orrery, two orbital planes and bright satellites.
    vec3 center=base+vec3(0.0,0.54,0.0);
    orb(origin,ray,center,vec3(0.17),vec3(0.38,0.57,0.88),0.1,nearExhibit,room);
    hoop(origin,ray,center,vec3(0.2,0.8,1.0),0.29,0.01,gold,nearExhibit,room);
    hoop(origin,ray,center,vec3(-0.7,0.2,1.0),0.40,0.008,vec3(0.45,0.65,0.95),nearExhibit,room);
    orb(origin,ray,center+vec3(0.29,0.0,-0.058),vec3(0.04),gold,0.3,nearExhibit,room);
    orb(origin,ray,center+vec3(-0.15,0.35,-0.175),vec3(0.035),vec3(0.85,0.8,0.65),0.3,nearExhibit,room);
    displayBox(origin,ray,base+vec3(0.0,0.05,0.0),vec3(0.25,0.05,0.17),ink,nearExhibit,room);
  #endif
`;
