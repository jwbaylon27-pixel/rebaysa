import { FormEvent, useState } from 'react';
import { LogIn, LockKeyhole, UserRound } from 'lucide-react';
import { iniciarSesion, type Sesion } from '../auth';
import logo from '../assets/Logo1.png';
import './login.css';

type Props = { onAuthenticated: (sesion: Sesion) => void };

/* ---------- Fondo animado: engranajes que giran lento ----------
   Se dibujan como SVG (sin imagenes externas). Todos con numero PAR de
   dientes para que el centro del dibujo coincida con el eje de giro. */

function gearPath(teeth: number, rOuter: number): string {
  const rRoot = rOuter * 0.88;
  const rHole = rOuter * 0.28;
  const step = (Math.PI * 2) / teeth;
  const points: string[] = [];

  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const flancos: [number, number][] = [
      [a - step * 0.28, rRoot],
      [a - step * 0.15, rOuter],
      [a + step * 0.15, rOuter],
      [a + step * 0.28, rRoot],
    ];
    flancos.forEach(([ang, r]) => {
      points.push(`${(Math.cos(ang) * r).toFixed(1)} ${(Math.sin(ang) * r).toFixed(1)}`);
    });
  }

  const cuerpo = `M${points.join(' L')} Z`;
  const agujero = `M${rHole} 0 A${rHole} ${rHole} 0 1 0 ${-rHole} 0 A${rHole} ${rHole} 0 1 0 ${rHole} 0 Z`;
  return `${cuerpo} ${agujero}`;
}

const ENGRANAJES = [
  { id: 'a', x: 130, y: 120, teeth: 18, r: 300 },
  { id: 'b', x: 1470, y: 760, teeth: 12, r: 190 },
  { id: 'c', x: 1380, y: 150, teeth: 10, r: 120 },
  { id: 'd', x: 260, y: 800, teeth: 14, r: 150 },
].map((gear) => ({ ...gear, d: gearPath(gear.teeth, gear.r) }));

function FondoEngranajes() {
  return (
    <svg
      className="login-gears"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {ENGRANAJES.map((gear) => (
        <g key={gear.id} transform={`translate(${gear.x} ${gear.y})`}>
          <path
            className={`gear gear-${gear.id}`}
            fillRule="evenodd"
            fill="rgba(255,255,255,0.05)"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={2}
            d={gear.d}
          />
        </g>
      ))}
    </svg>
  );
}

export default function Login({ onAuthenticated }: Props) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setEnviando(true);
      setError('');
      onAuthenticated(await iniciarSesion(usuario, password));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="login-page">
      <FondoEngranajes />

      <form className="login-card" onSubmit={enviar}>
        <img className="login-logo" src={logo} alt="REBAYSA" />
        <h1>Acceso al sistema</h1>
        <p className="login-copy">Ingresa con el usuario registrado y sus permisos asignados.</p>
        {error && <div className="alert compact-alert">{error}</div>}
        <label>Usuario
          <span className="login-field"><UserRound size={18} /><input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" required /></span>
        </label>
        <label>Contraseña
          <span className="login-field"><LockKeyhole size={18} /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></span>
        </label>
        <button className="primary-button login-submit" disabled={enviando} type="submit"><LogIn size={18} />{enviando ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
    </main>
  );
}
