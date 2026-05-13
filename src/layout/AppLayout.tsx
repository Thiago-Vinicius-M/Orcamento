import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import styles from './AppLayout.module.css'
import {
  getPreferredLoginKind,
  getPreferredLoginPath,
  setPreferredLogin,
} from '../auth/preferredLogin'
import type { PreferredLogin } from '../auth/preferredLogin'
import { useUserRole } from '../hooks/useUserRole'
import { useSupabase } from '../lib/useSupabase'
import { ErrorBoundary } from '../components/ErrorBoundary'
import logoOrca from '../assets/img/logoOrca.png'

type NavItem = { to: string; label: string; end?: boolean }

export function AppLayout() {
  const navigate = useNavigate()
  const supabaseStatus = useSupabase()
  const { role, loading: roleLoading } = useUserRole()
  const [loggingOut, setLoggingOut] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')

    const syncBodyScrollLock = () => {
      document.body.style.overflow = menuOpen && mq.matches ? 'hidden' : ''
    }

    syncBodyScrollLock()

    const onMqChange = () => {
      if (!mq.matches) {
        setMenuOpen(false)
      }
      syncBodyScrollLock()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuOpen && mq.matches) {
        setMenuOpen(false)
      }
    }

    mq.addEventListener('change', onMqChange)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      mq.removeEventListener('change', onMqChange)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const navItems = useMemo<NavItem[]>(() => {
    const operacional: NavItem[] = [
      { to: '/', label: 'Dashboard', end: true },
      { to: '/clientes', label: 'Clientes' },
      { to: '/orcamentos', label: 'Orçamentos' },
    ]
    const configuracoes: NavItem = { to: '/configuracoes', label: 'Configurações' }

    if (roleLoading) {
      return operacional
    }
    if (role === 'gerente') {
      return [
        ...operacional,
        { to: '/produtos', label: 'Produtos' },
        { to: '/vendedores', label: 'Vendedores' },
        configuracoes,
      ]
    }
    if (role === 'vendedor') {
      return [...operacional, { to: '/produtos', label: 'Produtos' }, configuracoes]
    }
    return operacional
  }, [role, roleLoading])

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      const logoutLogin: PreferredLogin =
        role === 'vendedor'
          ? 'vendedor'
          : role === 'gerente'
            ? 'gerente'
            : getPreferredLoginKind() ?? 'gerente'
      setPreferredLogin(logoutLogin)
      if (supabaseStatus.kind === 'ready') {
        const { error: signOutError } = await supabaseStatus.client.auth.signOut()
        if (signOutError) {
          console.error('Erro ao fazer logout:', signOutError.message)
          toast.error('Erro ao fazer logout. Você será redirecionado mesmo assim.')
        }
      }
    } catch (err) {
      console.error('Erro inesperado ao fazer logout:', err)
      toast.error('Erro inesperado ao fazer logout.')
    } finally {
      setLoggingOut(false)
      navigate(getPreferredLoginPath(), { replace: true })
    }
  }

  return (
    <>
      <a href="#main-content" className={styles.skipLink}>
        Pular para o conteúdo
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <NavLink to="/" className={styles.brand} end>
            <img src={logoOrca} alt="Logo da NewOrca" className={styles.logoImage} />
          </NavLink>

          <button
            type="button"
            className={styles.menuToggle}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
          >
            <span className={menuOpen ? styles.hamburgerOpen : styles.hamburger} />
          </button>

          <nav
            className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}
            aria-label="Principal"
          >
            {navItems.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={Boolean(end)}
                className={({ isActive }) =>
                  isActive ? styles.navLinkActive : styles.navLink
                }
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className={styles.actions}>
            <NavLink to="/orcamentos/novo" className={styles.btnNovo}>
              + Novo Orçamento
            </NavLink>
            <button
              type="button"
              className={styles.btnSair}
              onClick={() => void handleLogout()}
              disabled={loggingOut}
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div
          role="presentation"
          className={styles.navBackdrop}
          aria-hidden
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <main id="main-content" className={styles.main}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </>
  )
}
