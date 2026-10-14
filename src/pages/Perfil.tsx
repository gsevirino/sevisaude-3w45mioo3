import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  UserCircle,
  Bell,
  KeyRound,
  ShieldAlert,
  Save,
  CheckCircle2,
  AlertCircle,
  Leaf,
  Loader2,
  Lock,
  Palette,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function Perfil() {
  const { user, updateProfile, requestPasswordReset, deleteAccount } = useAuth()
  const navigate = useNavigate()

  // Profile Form
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [telefone, setTelefone] = useState(user?.meta?.telefone || '')
  const [dataNascimento, setDataNascimento] = useState(user?.meta?.dataNascimento || '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Notification static preferences
  const [remindMeds, setRemindMeds] = useState(user?.meta?.lembreteMedicamentos ?? true)
  const [remindConsultas, setRemindConsultas] = useState(user?.meta?.lembreteConsultas ?? true)
  const [remindExames, setRemindExames] = useState(user?.meta?.lembreteExames ?? true)

  // Password reset request
  const [resetRequested, setResetRequested] = useState(false)
  const [requestingReset, setRequestingReset] = useState(false)

  // Delete account confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      setTelefone(user.meta?.telefone || '')
      setDataNascimento(user.meta?.dataNascimento || '')
      setRemindMeds(user.meta?.lembreteMedicamentos ?? true)
      setRemindConsultas(user.meta?.lembreteConsultas ?? true)
      setRemindExames(user.meta?.lembreteExames ?? true)
    }
  }, [user])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      await updateProfile({
        name: name.trim(),
        meta: {
          ...user?.meta,
          telefone: telefone.trim(),
          dataNascimento,
          lembreteMedicamentos: remindMeds,
          lembreteConsultas: remindConsultas,
          lembreteExames: remindExames,
        },
      })
      toast({
        title: 'Perfil salvo!',
        description: 'Suas informações e preferências foram atualizadas com sucesso.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleRequestPasswordReset = async () => {
    if (!user?.email) return
    setRequestingReset(true)
    try {
      await requestPasswordReset(user.email)
      setResetRequested(true)
      toast({
        title: 'E-mail de redefinição enviado',
        description: `Enviamos o link de alteração de senha para ${user.email}.`,
      })
    } catch (err: any) {
      toast({
        title: 'Falha no envio',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setRequestingReset(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      await deleteAccount()
      toast({
        title: 'Conta encerrada',
        description: 'Seus dados foram excluídos definitivamente.',
      })
      navigate('/entrar')
    } catch (err: any) {
      toast({
        title: 'Erro ao encerrar conta',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
      setDeleting(false)
    }
  }

  const userInitials = (user?.name || user?.email || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="font-serif italic text-3xl md:text-4xl text-[#26362B] font-semibold tracking-tight">
          Meu perfil e configurações
        </h1>
        <p className="text-[#6B7A6F] text-sm mt-1">
          Gerencie seus dados pessoais, preferências de alertas e segurança da conta
        </p>
      </div>

      {/* Profile Form Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#D9E2D4] shadow-sm">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#D9E2D4]/60">
          <div className="w-16 h-16 rounded-full bg-[#E7F0E3] text-[#4C7A5A] font-serif text-2xl font-bold flex items-center justify-center border-2 border-[#DCE9D4] shadow-xs">
            {userInitials}
          </div>
          <div>
            <h2 className="font-serif italic text-2xl text-[#26362B] font-semibold">
              {user?.name || 'Seu nome'}
            </h2>
            <p className="text-xs text-[#6B7A6F]">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1.5 uppercase tracking-wider">
                Nome completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1.5 uppercase tracking-wider">
                E-mail (acesso e login)
              </label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1.5 uppercase tracking-wider">
                Telefone celular / WhatsApp
              </label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1.5 uppercase tracking-wider">
                Data de nascimento
              </label>
              <input
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
              />
            </div>
          </div>

          {/* Preferences of reminders */}
          <div className="pt-6 border-t border-[#D9E2D4]/60">
            <h3 className="font-serif italic text-lg text-[#26362B] font-semibold mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#4C7A5A]" />
              <span>Preferências de lembretes e avisos</span>
            </h3>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4]/60 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-[#26362B] block">
                    Lembretes diários de medicamentos
                  </span>
                  <span className="text-[11px] text-[#6B7A6F]">
                    Destacar faixa com os próximos horários no painel inicial
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={remindMeds}
                  onChange={(e) => setRemindMeds(e.target.checked)}
                  className="w-4 h-4 text-[#4C7A5A] rounded accent-[#4C7A5A] cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4]/60 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-[#26362B] block">
                    Avisos de consultas agendadas
                  </span>
                  <span className="text-[11px] text-[#6B7A6F]">
                    Indicar contagem regressiva para check-ups futuros
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={remindConsultas}
                  onChange={(e) => setRemindConsultas(e.target.checked)}
                  className="w-4 h-4 text-[#4C7A5A] rounded accent-[#4C7A5A] cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4]/60 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-[#26362B] block">
                    Alertas de exames solicitados
                  </span>
                  <span className="text-[11px] text-[#6B7A6F]">
                    Lembrar de anexar laudos e resultados pendentes
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={remindExames}
                  onChange={(e) => setRemindExames(e.target.checked)}
                  className="w-4 h-4 text-[#4C7A5A] rounded accent-[#4C7A5A] cursor-pointer"
                />
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold shadow transition disabled:opacity-50 cursor-pointer"
            >
              {savingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Visual Identity Note */}
      <div className="bg-white rounded-3xl p-6 border border-[#D9E2D4] shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E7F0E3] text-[#4C7A5A] flex items-center justify-center">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif italic text-lg text-[#26362B] font-semibold">
              Tema e Aparência
            </h3>
            <p className="text-xs text-[#6B7A6F]">
              Tema Orgânico VerdeVida (paleta sálvia, tipografia Lora serifa e fundo acolhedor)
            </p>
          </div>
        </div>

        <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#DCE9D4] text-[#26362B]">
          Padrão ativo
        </span>
      </div>

      {/* Security: Password Change Flow */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#D9E2D4] shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E7F0E3] text-[#4C7A5A] flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif italic text-xl text-[#26362B] font-semibold">
              Segurança e Senha
            </h3>
            <p className="text-xs text-[#6B7A6F]">
              Receba um link seguro em seu e-mail para atualizar sua senha de acesso
            </p>
          </div>
        </div>

        {resetRequested ? (
          <div className="p-4 rounded-2xl bg-[#DCE9D4]/70 border border-[#A8C3A0] flex items-center gap-3 text-xs text-[#26362B]">
            <CheckCircle2 className="w-5 h-5 text-[#4C7A5A] shrink-0" />
            <span>
              Link de redefinição enviado para <strong>{user?.email}</strong>. Acesse sua caixa de
              entrada para criar uma nova senha.
            </span>
          </div>
        ) : (
          <button
            onClick={handleRequestPasswordReset}
            disabled={requestingReset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#F6F4EF] hover:bg-[#E7F0E3] text-[#26362B] text-xs font-semibold border border-[#D9E2D4] transition cursor-pointer"
          >
            {requestingReset ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#4C7A5A]" />
            ) : (
              <Lock className="w-4 h-4 text-[#4C7A5A]" />
            )}
            <span>Solicitar e-mail de troca de senha</span>
          </button>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-red-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif italic text-xl text-red-900 font-semibold">Zona de Perigo</h3>
            <p className="text-xs text-red-700/80">
              Encerrar sua conta removerá seus acessos e registros permanentemente
            </p>
          </div>
        </div>

        <button
          onClick={() => setDeleteModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold border border-red-200 transition cursor-pointer"
        >
          <span>Encerrar minha conta</span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-red-200 text-center space-y-4 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif italic text-xl text-[#26362B] font-semibold">
                Tem certeza?
              </h3>
              <p className="text-xs text-[#6B7A6F] mt-1 leading-relaxed">
                Esta ação é irreversível e excluirá definitivamente sua conta no VerdeVida.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-5 py-2.5 rounded-full border border-[#D9E2D4] text-xs font-medium text-[#6B7A6F] hover:bg-[#F6F4EF]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteAccount}
                className="px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow transition disabled:opacity-50"
              >
                {deleting ? 'Encerrando...' : 'Sim, encerrar conta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
