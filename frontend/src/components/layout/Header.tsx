import { Menu, LogOut, Bell } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

interface Props {
  onMenuClick: () => void
  title: string
}

export default function Header({ onMenuClick, title }: Props) {
  const { logout } = useAuth()

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
        >
          <Menu size={20} />
        </button>
        <h1 className="font-semibold text-gray-800 text-sm md:text-base">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <Bell size={18} />
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  )
}
