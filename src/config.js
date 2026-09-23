/** Toda la distribución se edita aquí. Medidas en unidades del escenario. */
export const THEME = {
  gold: 0xf6c75c, blue: 0x64aeff, background: 0x07090d,
};
export const GALLERY = {
  z: 0, spacing: 12, interactionRadius: 6, hideDistance: 8.5,
  pedestalHeight: 0.28, cubeSize: 2.65, cubeOffsetX: 3.9,
};
export const WORLDS = {
  hub: { id: 'hub', name: 'Cancha Media', short: 'Inicio', file: './models/CanchaMedia.glb' },
  marzo: { id: 'marzo', name: '23 de Marzo', short: '23 de Marzo', file: './models/23demarzo.glb' },
  ballivian: { id: 'ballivian', name: 'Ballivián', short: 'Ballivián', file: './models/balliviam.glb' },
  racing: { id: 'racing', name: 'Racing', short: 'Racing', file: './models/racing.glb' },
  asociacion: { id: 'asociacion', name: 'Asociación', short: 'Asociación', file: './models/asociacion.glb' },
};
// Cada mascota tiene su logo explícito; no se deducen parejas por orden de carga.
export const STATIONS = [
  { id: 'marzo', number: '01', name: 'CLUB DEPORTIVO CULTURAL 23 DE MARZO', short: 'CLUB DEPORTIVO CULTURAL 23 DE MARZO', x: -24,
    mascot: './models/mascota-23-marzo.glb', logo: './models/logo-23-marzo.glb',
    height: 3.5, yaw: 0, logoYaw: 0, world: 'marzo', accent: THEME.gold,
    description: 'Club fundado el año de 1964 ,este compite en la primera A de la AFLL donde se ha consolidado como habitual contendiente al titulo como haci tambien en la copa Simon Bolivar,sus hazañas mas grandes son la representracion en la ya mencionado copa Simon Bolivar en la cual siempre esta presente.' },
  { id: 'ballivian', number: '02', name: 'BALLIVIAN FUTBOL CLUB', short: 'BALLIVIAN FUTBOL CLUB', x: -12,
    mascot: './models/mascota-ballivian.glb', logo: './models/logo-ballivian.glb',
    height: 3.6, yaw: 0, logoYaw: 0, world: 'ballivian', accent: THEME.blue,
    description: 'Club fundado un 22 de noviembre de 1961, este es otro club el cual tambien es unos de los mas fuertes de la AFLL luchando siempre los primeros puestos,las hazañas mas grandes de este fue en los años 70 y 80 en donde en encuentros amistosos en la localidad de Catavi logro ganar a equipos ya conocidos como lo es el Bolivar y el Independiente Unificada.' },
  { id: 'racing', number: '03', name: 'RACING SPORTING CLUB', short: 'RACING SPORTING CLUB', x: 0,
    mascot: './models/mascota-racing.glb', logo: './models/logo-racing.glb',
    height: 3.25, yaw: 0, logoYaw: 0, world: 'racing', accent: THEME.gold,
    description: 'Este es el decano del futbol llallagueño fue fundado el 8 de diciembre de 1927 en el centro minero de Llallagua,es un club que hace participe de la primera A de Llallagua ,sus logros mas grandes son el subcampeonato de la copa del norte ,como tambien haci la lucha por los torneos provinciales en cada gestion.' },
  { id: 'asociacion', number: '04', name: 'AFLL', short: 'AFLL', x: 12,
    mascot: './models/minero.glb', logo: './models/logo-asociacion.glb', logoYaw: 0, height: 3.6, yaw: 0, world: 'asociacion', accent: THEME.blue,
    description: 'La AFLL no fue creada por un una sola persona,sino que fue fundada y impulsada por dirigentes mineros en una asamblea comunitaria en los cuales destacan la participacion de campamentos mineros(Siglo XX,Catavi)educadores y los primeros representantes de los primeros clubes pioneros del centro minero.' },
  { id: 'serrafin', number: '05', name: 'DR. SERRAFIN FERREIRA', short: 'DR. SERRAFIN FERREIRA', x: 24,
    mascot: './models/serrafin.glb', logo: null,
    height: 3.5, yaw: 0, world: null, accent: THEME.gold,
    description: 'El Dr. Serrafin Ferreira fue un destacado abogado y alto ejecutivo de la empresa minera Patiño,este siempre impulsaba el deporte en los mineros y el mismo le decia a Patiño la frase celebre Mente sana en cuerpo sano fue un pilar fundamental del discurso y la filosofia que implanto el Dr. ya que queria que los compañeros mineros tubieran un poco de distraccion en sus momentos libres el Dr. aprovecho  que Simon Patiño era un aficionado mas del Futbol ya que este siempre traia equipos internacionalles al centro minero.' },
];
