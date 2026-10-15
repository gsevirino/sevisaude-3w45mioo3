import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHealthProfile } from '@/context/HealthProfileContext'
import TitularesManager from '@/components/TitularesManager'
import pb from '@/lib/pocketbase/client'
import {
  User as UserIcon,
  Shield,
  Bell,
  Lock,
  Heart,
  AlertTriangle,
  PhoneCall,
  Save,
  Users,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function Perfil() {
  const { user } = useAuth()
  const { activeProfile, refreshProfiles } = useHealthProfile()
  const [activeTab, setActiveTab] = useState<'perfil' | 'titulares' | 'seguranca'>('perfil')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')

  // Novos campos do prontuário do prompt mestre
  const [alergias, setAlergias] = useState('')
  const [condicoesSaude, setCondicoesSaude] = useState('')
  const [contatoEmergenciaNome, setContatoEmergenciaNome] = useState('')
  const [contatoEmergenciaTelefone, setContatoEmergenciaTelefone] = useState('')
  const [contatoEmergenciaParentesco, setContatoEmergenciaParentesco] = useState('')

  const [lembreteMedicamentos, setLembreteMedicamentos] = useState(true)
  const [lembreteConsultas, setLembreteConsultas] = useState(true)
  const [lembreteExames, setLembreteExames] = useState(true)

  const [oldPassword, setOldPassword] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  const [savingProfile, setSavingProfile] = useState(false)
  const [savingSecurity, setSavingSecurity] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      setTelefone(user.meta?.telefone || '')
      setDataNascimento(user.meta?.dataNascimento || '')
      setAlergias(user.alergias || '')
      setCondicoesSaude(user.condicoes_saude || '')
      setContatoEmergenciaNome(user.contato_emergencia_nome || '')
      setContatoEmergenciaTelefone(user.contato_emergencia_telefone || '')
      setContatoEmergenciaParentesco(user.contato_emergencia_parentesco || '')
      setLembreteMedicamentos(user.meta?.lembreteMedicamentos ?? true)
      setLembreteConsultas(user.meta?.lembreteConsultas ?? true)
      setLembreteExames(user.meta?.lembreteExames ?? true)
    }
  }, [user])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSavingProfile(true)
    try {
      const updatedMeta = {
        ...(user.meta || {}),
        telefone,
        dataNascimento,
        lembreteMedicamentos,
        lembreteConsultas,
        lembreteExames,
      }

      await pb.collection('users').update(user.id, {
        name,
        alergias,
        condicoes_saude: condicoesSaude,
        contato_emergencia_nome: contatoEmergenciaNome,
        contato_emergencia_telefone: contatoEmergenciaTelefone,
        contato_emergencia_parentesco: contatoEmergenciaParentesco,
        meta: updatedMeta,
      })

      // Refresh auth store model
      await pb.collection('users').authRefresh()

      toast({
        title: 'Perfil atualizado!',
        description: 'Seus dados de saúde, emergência e preferências foram salvos.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar perfil',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (password !== passwordConfirm) {
      toast({
        title: 'Senhas não conferem',
        description: 'A nova senha e a confirmação devem ser iguais.',
        variant: 'destructive',
      })
      return
    }

    setSavingSecurity(true)
    try {
      await pb.collection('users').update(user.id, {
        oldPassword,
        password,
        passwordConfirm,
      })
      toast({
        title: 'Senha alterada!',
        description: 'Sua senha foi redefinida com sucesso.',
      })
      setOldPassword('')
      setPassword('')
      setPasswordConfirm('')
    } catch (err: any) {
      toast({
        title: 'Erro ao trocar senha',
        description: err?.message || 'Verifique sua senha atual.',
        variant: 'destructive',
      })
    } finally {
      setSavingSecurity(false)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl animate-fade-in">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#4C7A5A] mb-1">
          <Users className="w-3.5 h-3.5" />
          <span>Gestão de conta e saúde da família</span>
        </div>
        <h1 className="font-serif italic text-3xl md:text-4xl text-[#26362B] font-semibold tracking-tight">
          Meu perfil e configurações
        </h1>
        <p className="text-[#6B7A6F] text-sm mt-1">
          Gerencie seu prontuário pessoal, titulares vinculados, permissões de familiares e
          segurança
        </p>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-2 border-b border-[#D9E2D4] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('perfil')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
            activeTab === 'perfil'
              ? 'bg-[#4C7A5A] text-white shadow'
              : 'text-[#6B7A6F] hover:bg-[#E7F0E3]/70 hover:text-[#26362B]'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5" />
          <span>Dados do Titular</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('titulares')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
            activeTab === 'titulares'
              ? 'bg-[#4C7A5A] text-white shadow'
              : 'text-[#6B7A6F] hover:bg-[#E7F0E3]/70 hover:text-[#26362B]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Titulares e Familiares</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('seguranca')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
            activeTab === 'seguranca'
              ? 'bg-[#4C7A5A] text-white shadow'
              : 'text-[#6B7A6F] hover:bg-[#E7F0E3]/70 hover:text-[#26362B]'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Segurança da Conta</span>
        </button>
      </div>

      {/* Tab 1: Perfil e Prontuário */}
      {activeTab === 'perfil' && (
        <form
          onSubmit={handleSaveProfile}
          className="bg-white rounded-3xl p-6 md:p-8 border border-[#D9E2D4] shadow-sm space-y-6"
        >
          <div className="flex items-center gap-3 pb-4 border-b border-[#D9E2D4]">
            <div className="w-10 h-10 rounded-2xl bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif italic text-xl text-[#26362B] font-semibold">
                Identificação do Titular
              </h2>
              <p className="text-xs text-[#6B7A6F]">
                Sem CPF ou endereço completo expostos por padrão para segurança
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                Nome completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                E-mail de acesso
              </label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-gray-100 text-[#6B7A6F] text-xs cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                Data de nascimento
              </label>
              <input
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
              />
            </div>
          </div>

          {/* Informações Clínicas Críticas */}
          <div className="p-5 rounded-3xl bg-[#F6F4EF]/70 border border-[#D9E2D4] space-y-4">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-[#4C7A5A]" />
              <h3 className="font-serif italic text-lg text-[#26362B] font-semibold">
                Informações Clínicas de Relevância
              </h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Alergias e reações adversas a medicamentos conhecidas
              </label>
              <textarea
                rows={2}
                value={alergias}
                onChange={(e) => setAlergias(e.target.value)}
                placeholder="Ex.: Penicilina e derivados (urticária e choque anafilático leve), Dipirona..."
                className="w-full px-4 py-2 rounded-2xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                Condições de saúde relevantes / Diagnósticos prévios
              </label>
              <textarea
                rows={2}
                value={condicoesSaude}
                onChange={(e) => setCondicoesSaude(e.target.value)}
                placeholder="Ex.: Hipertensão Arterial Sistêmica, Diabetes Tipo 2, Asma crônica..."
                className="w-full px-4 py-2 rounded-2xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
              />
            </div>
          </div>

          {/* Contato de Emergência */}
          <div className="p-5 rounded-3xl bg-[#F6F4EF]/70 border border-[#D9E2D4] space-y-4">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-[#4C7A5A]" />
              <h3 className="font-serif italic text-lg text-[#26362B] font-semibold">
                Contato de Emergência (exibido no Cartão de Saúde)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1">
                  Nome do contato
                </label>
                <input
                  type="text"
                  value={contatoEmergenciaNome}
                  onChange={(e) => setContatoEmergenciaNome(e.target.value)}
                  placeholder="Ex.: Carlos Eduardo"
                  className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1">
                  Grau de parentesco
                </label>
                <input
                  type="text"
                  value={contatoEmergenciaParentesco}
                  onChange={(e) => setContatoEmergenciaParentesco(e.target.value)}
                  placeholder="Ex.: Cônjuge, Filho(a), Irmão"
                  className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1">
                  Telefone de emergência
                </label>
                <input
                  type="text"
                  value={contatoEmergenciaTelefone}
                  onChange={(e) => setContatoEmergenciaTelefone(e.target.value)}
                  placeholder="Ex.: (11) 98111-2233"
                  className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* Lembretes e Preferências */}
          <div className="p-5 rounded-3xl bg-white border border-[#D9E2D4] space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#4C7A5A]" />
              <h3 className="font-serif italic text-lg text-[#26362B] font-semibold">
                Notificações e Lembretes
              </h3>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2.5 text-xs text-[#26362B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={lembreteMedicamentos}
                  onChange={(e) => setLembreteMedicamentos(e.target.checked)}
                  className="rounded text-[#4C7A5A] focus:ring-[#4C7A5A]"
                />
                <span>Receber avisos sobre horários de medicamentos</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-[#26362B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={lembreteConsultas}
                  onChange={(e) => setLembreteConsultas(e.target.checked)}
                  className="rounded text-[#4C7A5A] focus:ring-[#4C7A5A]"
                />
                <span>Receber alertas sobre consultas marcadas na véspera</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-[#26362B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={lembreteExames}
                  onChange={(e) => setLembreteExames(e.target.checked)}
                  className="rounded text-[#4C7A5A] focus:ring-[#4C7A5A]"
                />
                <span>Receber avisos de preparo e agendamento de exames</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{savingProfile ? 'Salvando...' : 'Salvar dados do prontuário'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Gestão de Titulares, Convites e Permissões Granulares */}
      {activeTab === 'titulares' && <TitularesManager />}

      {/* Tab 3: Segurança */}
      {activeTab === 'seguranca' && (
        <form
          onSubmit={handleChangePassword}
          className="bg-white rounded-3xl p-6 md:p-8 border border-[#D9E2D4] shadow-sm space-y-4"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-[#D9E2D4]">
            <div className="w-10 h-10 rounded-2xl bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif italic text-xl text-[#26362B] font-semibold">
                Segurança e Acesso
              </h2>
              <p className="text-xs text-[#6B7A6F]">Altere sua senha de autenticação</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                Senha atual
              </label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                Nova senha
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                Confirmar nova senha
              </label>
              <input
                type="password"
                required
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingSecurity}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#26362B] hover:bg-black text-white text-xs font-semibold shadow transition disabled:opacity-50 cursor-pointer"
            >
              <Shield className="w-4 h-4" />
              <span>{savingSecurity ? 'Alterando senha...' : 'Atualizar senha'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
