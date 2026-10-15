import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHealthProfile } from '@/context/HealthProfileContext'
import { useSearchParams, Link } from 'react-router-dom'
import TitularesManager from '@/components/TitularesManager'
import { MeuPlanoTab } from '@/components/MeuPlanoTab'
import pb from '@/lib/pocketbase/client'
import {
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  getNotificationJobs,
  triggerProcessReminders,
} from '@/services/notificationService'
import type { NotificationPreferences, NotificationJob, PlanoKey } from '@/types/health'
import { formatarDataHora } from '@/lib/dateUtils'
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
  Mail,
  Calendar,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  CreditCard,
  ShieldAlert,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function Perfil() {
  const { user } = useAuth()
  const { activeProfile, refreshProfiles } = useHealthProfile()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialTab =
    (searchParams.get('tab') as 'perfil' | 'plano' | 'titulares' | 'lembretes' | 'seguranca') ||
    'perfil'
  const chosenPlanParam = (searchParams.get('escolhido') as PlanoKey) || undefined

  const [activeTab, setActiveTab] = useState<
    'perfil' | 'plano' | 'titulares' | 'lembretes' | 'seguranca'
  >(
    ['perfil', 'plano', 'titulares', 'lembretes', 'seguranca'].includes(initialTab)
      ? initialTab
      : 'perfil',
  )

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

  // Estados de Notificações Backend
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences | null>(null)
  const [notifEnabled, setNotifEnabled] = useState(true)
  const [notifAppointments, setNotifAppointments] = useState(true)
  const [notifExams, setNotifExams] = useState(true)
  const [daysAdvance, setDaysAdvance] = useState(2)
  const [notifyDayBefore, setNotifyDayBefore] = useState(true)
  const [notifySameDay, setNotifySameDay] = useState(true)
  const [familyOptIn, setFamilyOptIn] = useState(true)
  const [savingNotif, setSavingNotif] = useState(false)
  const [notifJobs, setNotifJobs] = useState<NotificationJob[]>([])
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [processingNow, setProcessingNow] = useState(false)

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

      // Carregar preferências de lembretes backend
      getUserNotificationPreferences().then((prefs) => {
        if (prefs) {
          setNotifPrefs(prefs)
          setNotifEnabled(prefs.enabled)
          setNotifAppointments(prefs.appointments_enabled)
          setNotifExams(prefs.exams_enabled)
          setDaysAdvance(prefs.days_advance || 2)
          setNotifyDayBefore(prefs.notify_day_before)
          setNotifySameDay(prefs.notify_same_day)
          setFamilyOptIn(prefs.family_opt_in)
        }
      })
    }
  }, [user])

  const loadJobsHistory = async () => {
    setLoadingJobs(true)
    try {
      const jobs = await getNotificationJobs(15)
      setNotifJobs(jobs)
    } finally {
      setLoadingJobs(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'lembretes') {
      loadJobsHistory()
    }
  }, [activeTab])

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
      <div className="flex items-center gap-2 border-b border-[#D9E2D4] pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setActiveTab('perfil')
            setSearchParams({ tab: 'perfil' })
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
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
          onClick={() => {
            setActiveTab('plano')
            setSearchParams({ tab: 'plano' })
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
            activeTab === 'plano'
              ? 'bg-[#4C7A5A] text-white shadow'
              : 'text-[#6B7A6F] hover:bg-[#E7F0E3]/70 hover:text-[#26362B]'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Meu Plano</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('titulares')
            setSearchParams({ tab: 'titulares' })
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
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
          onClick={() => setActiveTab('lembretes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
            activeTab === 'lembretes'
              ? 'bg-[#4C7A5A] text-white shadow'
              : 'text-[#6B7A6F] hover:bg-[#E7F0E3]/70 hover:text-[#26362B]'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Lembretes por E-mail</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('seguranca')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
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

      {/* Tab: Meu Plano e Pagamento PIX */}
      {activeTab === 'plano' && <MeuPlanoTab initialChosenPlan={chosenPlanParam} />}

      {/* Tab 2: Gestão de Titulares, Convites e Permissões Granulares */}
      {activeTab === 'titulares' && <TitularesManager />}

      {/* Tab 3: Lembretes por E-mail no Backend */}
      {activeTab === 'lembretes' && (
        <div className="space-y-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!notifPrefs) return
              setSavingNotif(true)
              try {
                const updated = await updateUserNotificationPreferences(notifPrefs.id, {
                  enabled: notifEnabled,
                  appointments_enabled: notifAppointments,
                  exams_enabled: notifExams,
                  days_advance: Number(daysAdvance),
                  notify_day_before: notifyDayBefore,
                  notify_same_day: notifySameDay,
                  family_opt_in: familyOptIn,
                })
                setNotifPrefs(updated)
                toast({
                  title: 'Preferências salvas!',
                  description: 'Suas configurações de lembretes por e-mail foram atualizadas.',
                })
              } catch (err: any) {
                toast({
                  title: 'Erro ao salvar',
                  description: err?.message || 'Tente novamente.',
                  variant: 'destructive',
                })
              } finally {
                setSavingNotif(false)
              }
            }}
            className="bg-white rounded-3xl p-6 md:p-8 border border-[#D9E2D4] shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#D9E2D4]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-serif italic text-xl text-[#26362B] font-semibold">
                    Lembretes por E-mail (Backend)
                  </h2>
                  <p className="text-xs text-[#6B7A6F]">
                    Disparos automáticos mesmo com o navegador fechado (cron job periódica)
                  </p>
                </div>
              </div>

              {/* Status de verificação do e-mail */}
              <div className="text-right">
                <span
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                    user?.verified
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {user?.verified ? '✓ E-mail verificado' : '⚠ E-mail não verificado'}
                </span>
              </div>
            </div>

            {!user?.verified && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong>Atenção:</strong> Por segurança e respeito às diretrizes de envio,
                  lembretes só são disparados para contas com <strong>e-mail verificado</strong>.
                  Confirme seu e-mail na caixa de entrada para receber os avisos.
                </div>
              </div>
            )}

            {/* Chave Geral de Ativação */}
            <div className="p-4 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4] flex items-center justify-between">
              <div>
                <span className="font-semibold text-sm text-[#26362B] block">
                  Ativar lembretes por e-mail
                </span>
                <span className="text-xs text-[#6B7A6F]">
                  Habilita o envio automático de avisos para {user?.email}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifEnabled}
                  onChange={(e) => setNotifEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4C7A5A]"></div>
              </label>
            </div>

            <div className={`space-y-6 ${!notifEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
              {/* O que gera lembrete */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#26362B] uppercase tracking-wider">
                  Eventos com lembrete automático
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="p-4 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] flex items-start gap-3 cursor-pointer hover:bg-[#F6F4EF]/60">
                    <input
                      type="checkbox"
                      checked={notifAppointments}
                      onChange={(e) => setNotifAppointments(e.target.checked)}
                      className="mt-0.5 rounded text-[#4C7A5A] focus:ring-[#4C7A5A]"
                    />
                    <div>
                      <span className="text-xs font-semibold text-[#26362B] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#4C7A5A]" />
                        Consultas Médicas Agendadas
                      </span>
                      <p className="text-[11px] text-[#6B7A6F] mt-0.5">
                        Lembrete com nome do titular, data, horário, profissional e local.
                      </p>
                    </div>
                  </label>

                  <label className="p-4 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] flex items-start gap-3 cursor-pointer hover:bg-[#F6F4EF]/60">
                    <input
                      type="checkbox"
                      checked={notifExams}
                      onChange={(e) => setNotifExams(e.target.checked)}
                      className="mt-0.5 rounded text-[#4C7A5A] focus:ring-[#4C7A5A]"
                    />
                    <div>
                      <span className="text-xs font-semibold text-[#26362B] flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#4C7A5A]" />
                        Exames Agendados
                      </span>
                      <p className="text-[11px] text-[#6B7A6F] mt-0.5">
                        Avisos de data/hora marcada e orientações gerais de preparo (ex.: jejum).
                      </p>
                    </div>
                  </label>
                </div>

                <div className="p-3 rounded-xl bg-[#F6F4EF]/60 border border-[#D9E2D4] text-[11px] text-[#6B7A6F]">
                  ℹ <strong>Diferenciação importante:</strong> notificações de administração pontual
                  de medicamentos não são enviadas por e-mail, permanecendo apenas no app para maior
                  privacidade e pontualidade.
                </div>
              </div>

              {/* Antecedência e Frequência */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#26362B] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#4C7A5A]" />
                  Antecedência dos Disparos
                </h3>

                <div className="space-y-3 bg-[#FDFCFB] p-4 rounded-2xl border border-[#D9E2D4]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#D9E2D4]/60">
                    <div>
                      <span className="text-xs font-semibold text-[#26362B] block">
                        Aviso prévio configurável
                      </span>
                      <span className="text-[11px] text-[#6B7A6F]">
                        Quantos dias antes do compromisso você quer receber o primeiro alerta?
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={daysAdvance}
                        onChange={(e) => setDaysAdvance(Number(e.target.value))}
                        className="px-3 py-1.5 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                      >
                        <option value={1}>1 dia antes</option>
                        <option value={2}>2 dias antes (recomendado)</option>
                        <option value={3}>3 dias antes</option>
                        <option value={5}>5 dias antes</option>
                        <option value={7}>7 dias (1 semana antes)</option>
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center justify-between text-xs text-[#26362B] cursor-pointer py-1">
                    <div>
                      <span className="font-semibold block">Aviso na véspera (1 dia antes)</span>
                      <span className="text-[11px] text-[#6B7A6F]">
                        Receba uma confirmação no dia anterior ao compromisso
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyDayBefore}
                      onChange={(e) => setNotifyDayBefore(e.target.checked)}
                      className="rounded text-[#4C7A5A] focus:ring-[#4C7A5A]"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-[#26362B] cursor-pointer py-1">
                    <div>
                      <span className="font-semibold block">Aviso no dia do compromisso</span>
                      <span className="text-[11px] text-[#6B7A6F]">
                        Receba um lembrete na manhã da data marcada
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifySameDay}
                      onChange={(e) => setNotifySameDay(e.target.checked)}
                      className="rounded text-[#4C7A5A] focus:ring-[#4C7A5A]"
                    />
                  </label>
                </div>
              </div>

              {/* Lembretes de Titulares Vinculados / Cuidadores */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#26362B] uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#4C7A5A]" />
                  Avisos de Titulares Vinculados (Familiares e Dependentes)
                </h3>

                <label className="p-4 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={familyOptIn}
                    onChange={(e) => setFamilyOptIn(e.target.checked)}
                    className="mt-0.5 rounded text-[#4C7A5A] focus:ring-[#4C7A5A]"
                  />
                  <div>
                    <span className="text-xs font-semibold text-[#26362B]">
                      Aceito receber e-mails sobre compromissos de titulares que me autorizaram
                    </span>
                    <p className="text-[11px] text-[#6B7A6F] mt-0.5">
                      Você só receberá notificações se o titular principal tiver concedido
                      expressamente a permissão de <strong>Lembretes e Notificações</strong> no
                      painel de familiares.
                    </p>
                  </div>
                </label>
              </div>

              {/* Minimização de Dados Sensíveis */}
              <div className="p-4 rounded-2xl bg-[#F6F4EF]/80 border border-[#D9E2D4] text-xs text-[#4C7A5A] flex items-start gap-2.5">
                <Shield className="w-4 h-4 shrink-0 mt-0.5 text-[#4C7A5A]" />
                <div>
                  <strong>Privacidade Médica por Padrão:</strong> os e-mails enviados pelo SeviSaúde
                  contêm apenas dados essenciais de logística (nome do titular, data/hora, tipo de
                  evento e local/profissional). Diagnósticos, laudos e anotações médicas
                  confidenciais nunca trafegam por e-mail.
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingNotif}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold shadow transition disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{savingNotif ? 'Salvando...' : 'Salvar Preferências'}</span>
              </button>
            </div>
          </form>

          {/* Histórico e Status dos Disparos */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#D9E2D4] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D9E2D4]">
              <div>
                <h3 className="font-serif italic text-lg text-[#26362B] font-semibold">
                  Registro de Disparos de Lembretes (Backend)
                </h3>
                <p className="text-xs text-[#6B7A6F]">
                  Auditoria com chave de deduplicação e status de entrega dos jobs
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setProcessingNow(true)
                    try {
                      const res = await triggerProcessReminders(false)
                      toast({
                        title: 'Processamento executado!',
                        description: `Processados: ${res?.data?.processed || 0}, Enviados: ${res?.data?.sent || 0}`,
                      })
                      await loadJobsHistory()
                    } catch (err: any) {
                      toast({
                        title: 'Erro ao processar',
                        description: err?.message || 'Tente novamente.',
                        variant: 'destructive',
                      })
                    } finally {
                      setProcessingNow(false)
                    }
                  }}
                  disabled={processingNow}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E7F0E3] hover:bg-[#DCE9D4] text-[#26362B] text-xs font-semibold transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-[#4C7A5A]" />
                  <span>{processingNow ? 'Processando...' : 'Executar cron agora'}</span>
                </button>

                <button
                  type="button"
                  onClick={loadJobsHistory}
                  disabled={loadingJobs}
                  className="p-1.5 rounded-full border border-[#D9E2D4] hover:bg-[#F6F4EF] text-[#6B7A6F] cursor-pointer"
                  title="Atualizar lista"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${loadingJobs ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {notifJobs.length === 0 ? (
              <p className="text-xs text-[#6B7A6F] italic py-4 text-center">
                Nenhum lembrete gerado ou disparado recentemente.
              </p>
            ) : (
              <div className="space-y-2.5">
                {notifJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-3.5 rounded-2xl bg-[#F6F4EF]/60 border border-[#D9E2D4] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#26362B] capitalize">
                          {job.event_type} ({job.trigger_timing})
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            job.status === 'sent'
                              ? 'bg-emerald-100 text-emerald-800'
                              : job.status === 'failed'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {job.status === 'sent' && <CheckCircle2 className="w-3 h-3" />}
                          {job.status === 'failed' && <AlertCircle className="w-3 h-3" />}
                          {job.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#6B7A6F] mt-0.5 truncate max-w-md">
                        {job.subject || `Destinatário: ${job.recipient_email}`}
                      </p>
                      {job.error_message && (
                        <p className="text-[11px] text-red-600 mt-0.5">Erro: {job.error_message}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 text-[11px] text-[#6B7A6F]">
                      <div>Data: {job.scheduled_date}</div>
                      <div>
                        {job.sent_at
                          ? formatarDataHora(
                              job.sent_at.split('T')[0],
                              job.sent_at.split('T')[1]?.slice(0, 5) || '',
                            )
                          : 'Pendente'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Segurança */}
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
