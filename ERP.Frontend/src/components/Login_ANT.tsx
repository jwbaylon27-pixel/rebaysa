import { FormEvent, useState } from 'react';
import { LogIn, LockKeyhole, UserRound } from 'lucide-react';
import { iniciarSesion, type Sesion } from '../auth';

type Props = { onAuthenticated: (sesion: Sesion) => void };

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
      <form className="login-card" onSubmit={enviar}>
        <div className="login-mark"><LockKeyhole size={28} /></div>
        <p className="eyebrow">ERP REPUESTOS</p>
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
