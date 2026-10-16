import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHealthProfile } from '@/context/HealthProfileContext'
import { Heart, UserCheck, Pill, Users, ArrowRight, Check, Shield, Sparkles } from 'lucide-react'
import { SeviSaudeIcon } from '@/components/SeviSaudeLogo'
import { createHealthProfile, updateHealthProfile } from '@/services/healthProfileService'
import pb from '@/lib/pocketbase/client'
import { toast } from '@/hooks/use-toast'

interface OnboardingModalProps {
  onClose: () => void
}

export default function OnboardingModal({ onClose }: OnboardingModalProps) {
  const { user } = useAuth()
  const { activeProfile, profiles, refreshProfiles, completeOnboarding } = useHealthProfile()
  const [step, setStep] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(false)

  // Localizar perfil próprio ou ativo
  const ownProfile =
    profiles.find((p) => user && p.user === user.id && p.is_proprio) || activeProfile

  // Step 1: Confirmar dados básicos do titular
  const [nome, setNome] = useState(ownProfile?.nome || (user?.name ? user.name : ''))
  const [dataNascimento, setDataNascimento] = useState(
    ownProfile?.data_nascimento || (user?.meta?.dataNascimento ? user.meta.dataNascimento : ''),
  )
  const [tipoSanguineo, setTipoSanguineo] = useState(ownProfile?.tipo_sanguineo || '')
  const [alergias, setAlergias] = useState(ownProfile?.alergias || user?.alergias || '')
  const [condicoesSaude, setCondicoesSaude] = useState(
    ownProfile?.condicoes_saude || user?.condicoes_saude || '',
  )

  // Step 2: Informações de emergência opcionais
  const [contatoNome, setContatoNome] = useState(
    ownProfile?.contato_emergencia_nome ||
      user?.contato_emergencia_nome ||
      user?.meta?.contatoEmergenciaNome ||
      '',
  )
  const [contatoTelefone, setContatoTelefone] = useState(
    ownProfile?.contato_emergencia_telefone ||
      user?.contato_emergencia_telefone ||
      user?.meta?.contatoEmergenciaTelefone ||
      '',
  )
  const [contatoParentesco, setContatoParentesco] = useState(
    ownProfile?.contato_emergencia_parentesco ||
      user?.contato_emergencia_parentesco ||
      user?.meta?.contatoEmergenciaParentesco ||
      '',
  )

  // Atualizar os campos quando ownProfile ou user forem carregados se estiverem vazios
  useEffect(() => {
    if (ownProfile) {
      if (!nome && ownProfile.nome) setNome(ownProfile.nome)
      if (!dataNascimento && ownProfile.data_nascimento)
        setDataNascimento(ownProfile.data_nascimento)
      if (!tipoSanguineo && ownProfile.tipo_sanguineo) setTipoSanguineo(ownProfile.tipo_sanguineo)
      if (!alergias && ownProfile.alergias) setAlergias(ownProfile.alergias)
      if (!condicoesSaude && ownProfile.condicoes_saude)
        setCondicoesSaude(ownProfile.condicoes_saude)
      if (!contatoNome && ownProfile.contato_emergencia_nome)
        setContatoNome(ownProfile.contato_emergencia_nome)
      if (!contatoTelefone && ownProfile.contato_emergencia_telefone)
        setContatoTelefone(ownProfile.contato_emergencia_telefone)
      if (!contatoParentesco && ownProfile.contato_emergencia_parentesco)
        setContatoParentesco(ownProfile.contato_emergencia_parentesco)
    }
  }, [ownProfile])

  // Helper para salvar tanto no health_profile quanto no users
  const persistHealthData = async (dados: {
    nome?: string
    data_nascimento?: string
    tipo_sanguineo?: string
    alergias?: string
    condicoes_saude?: string
    contato_emergencia_nome?: string
    contato_emergencia_telefone?: string
    contato_emergencia_parentesco?: string
  }) => {
    if (!user) return

    // 1. Salvar ou criar health_profile
    let targetProfile = ownProfile
    if (!targetProfile) {
      try {
        targetProfile = await createHealthProfile({
          nome: dados.nome || nome.trim() || user.name || 'Titular',
          parentesco: 'titular',
          is_proprio: true,
          data_nascimento: dados.data_nascimento ?? dataNascimento,
          tipo_sanguineo: (dados.tipo_sanguineo ?? tipoSanguineo) as any,
          alergias: dados.alergias ?? alergias,
          condicoes_saude: dados.condicoes_saude ?? condicoesSaude,
          contato_emergencia_nome: dados.contato_emergencia_nome ?? contatoNome,
          contato_emergencia_telefone: dados.contato_emergencia_telefone ?? contatoTelefone,
          contato_emergencia_parentesco: dados.contato_emergencia_parentesco ?? contatoParentesco,
        })
      } catch (err) {
        console.warn('Erro ao criar perfil próprio no onboarding:', err)
      }
    } else {
      try {
        await updateHealthProfile(targetProfile.id, dados)
      } catch (err) {
        console.warn('Erro ao atualizar perfil próprio no onboarding:', err)
      }
    }

    // 2. Sincronizar simultaneamente no registro do usuário (users)
    try {
      const updatedMeta = {
        ...(user.meta || {}),
        dataNascimento: dados.data_nascimento ?? dataNascimento,
        contatoEmergenciaNome: dados.contato_emergencia_nome ?? contatoNome,
        contatoEmergenciaTelefone: dados.contato_emergencia_telefone ?? contatoTelefone,
        contatoEmergenciaParentesco: dados.contato_emergencia_parentesco ?? contatoParentesco,
      }
      const userUpdatePayload: Record<string, any> = {
        meta: updatedMeta,
      }
      if (dados.nome) userUpdatePayload.name = dados.nome
      if (dados.alergias !== undefined) userUpdatePayload.alergias = dados.alergias
      if (dados.condicoes_saude !== undefined)
        userUpdatePayload.condicoes_saude = dados.condicoes_saude
      if (dados.contato_emergencia_nome !== undefined)
        userUpdatePayload.contato_emergencia_nome = dados.contato_emergencia_nome
      if (dados.contato_emergencia_telefone !== undefined)
        userUpdatePayload.contato_emergencia_telefone = dados.contato_emergencia_telefone
      if (dados.contato_emergencia_parentesco !== undefined)
        userUpdatePayload.contato_emergencia_parentesco = dados.contato_emergencia_parentesco

      await pb.collection('users').update(user.id, userUpdatePayload)
      await pb.collection('users').authRefresh()
    } catch (uErr) {
      console.warn('Erro ao sincronizar dados no usuário (users):', uErr)
    }
  }

  const handleSaveStep1 = async (skip = false) => {
    if (!skip) {
      setLoading(true)
      try {
        await persistHealthData({
          nome: nome.trim() || user?.name || 'Titular',
          data_nascimento: dataNascimento,
          tipo_sanguineo: tipoSanguineo,
          alergias,
          condicoes_saude: condicoesSaude,
        })
        await refreshProfiles()
      } catch (err) {
        console.warn('Erro ao persistir etapa 1 do onboarding:', err)
      } finally {
        setLoading(false)
      }
    }
    setStep(2)
  }

  const handleSaveStep2 = async (skip = false) => {
    if (!skip) {
      setLoading(true)
      try {
        await persistHealthData({
          contato_emergencia_nome: contatoNome,
          contato_emergencia_telefone: contatoTelefone,
          contato_emergencia_parentesco: contatoParentesco,
        })
        await refreshProfiles()
      } catch (err) {
        console.warn('Erro ao persistir etapa 2 do onboarding:', err)
      } finally {
        setLoading(false)
      }
    }
    setStep(3)
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      // Garantir persistência final de todos os valores preenchidos
      await persistHealthData({
        nome: nome.trim() || user?.name || 'Titular',
        data_nascimento: dataNascimento,
        tipo_sanguineo: tipoSanguineo,
        alergias,
        condicoes_saude: condicoesSaude,
        contato_emergencia_nome: contatoNome,
        contato_emergencia_telefone: contatoTelefone,
        contato_emergencia_parentesco: contatoParentesco,
      })
      await completeOnboarding()
      await refreshProfiles()
      toast({
        title: 'Prontuário pronto!',
        description: 'Seu perfil de titular foi configurado com sucesso.',
      })
      onClose()
    } catch {
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 border border-[#D9E2D4] shadow-2xl relative space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-between border-b border-[#D9E2D4] pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#E7F0E3] text-[#4C7A5A] flex items-center justify-center font-bold text-xs">
              {step} / 3
            </div>
            <div>
              <h2 className="font-serif italic font-semibold text-lg text-[#26362B]">
                Boas-vindas ao SeviSaúde
              </h2>
              <p className="text-xs text-[#6B7A6F]">
                {step === 1 && 'Etapa 1: Confirmação do seu titular de saúde'}
                {step === 2 && 'Etapa 2: Contato de emergência para o cartão de saúde'}
                {step === 3 && 'Etapa 3: Prontuário multiusuário e próximos passos'}
              </p>
            </div>
          </div>
          <button
            onClick={handleFinish}
            className="text-xs text-[#6B7A6F] hover:text-[#26362B] underline"
          >
            Pular tudo
          </button>
        </div>

        {/* Step 1 Content */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-2xl bg-[#E7F0E3]/60 border border-[#D9E2D4] flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-[#4C7A5A] shrink-0 mt-0.5" />
              <p className="text-xs text-[#26362B] leading-relaxed">
                Você pode começar agora mesmo. Nenhum dado médico é obrigatório neste momento — você
                pode preencher ou alterar quando desejar.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1">
                  Nome do titular de saúde
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D9E2D4] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1">
                    Data de nascimento (opcional)
                  </label>
                  <input
                    type="date"
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1">
                    Tipo sanguíneo (opcional)
                  </label>
                  <input
                    type="text"
                    value={tipoSanguineo}
                    onChange={(e) => setTipoSanguineo(e.target.value)}
                    placeholder="Ex.: A+, O-, B+"
                    className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1">
                  Alergias conhecidas (opcional)
                </label>
                <input
                  type="text"
                  value={alergias}
                  onChange={(e) => setAlergias(e.target.value)}
                  placeholder="Ex.: Penicilina, Dipirona, Frutos do mar"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D9E2D4] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#D9E2D4]">
              <button
                type="button"
                onClick={() => handleSaveStep1(true)}
                className="text-xs text-[#6B7A6F] hover:text-[#26362B] px-3 py-2"
              >
                Pular etapa
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSaveStep1(false)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold transition shadow"
              >
                <span>Avançar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 Content */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4] flex items-start gap-3">
              <Shield className="w-5 h-5 text-[#4C7A5A] shrink-0 mt-0.5" />
              <p className="text-xs text-[#26362B] leading-relaxed">
                Este contato será exibido com destaque no seu Cartão de Saúde de emergência
                (carteira frente/verso). Pode ser preenchido a qualquer momento.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1">
                  Nome do contato de emergência
                </label>
                <input
                  type="text"
                  value={contatoNome}
                  onChange={(e) => setContatoNome(e.target.value)}
                  placeholder="Ex.: Carlos Eduardo"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D9E2D4] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1">
                    Telefone de contato
                  </label>
                  <input
                    type="text"
                    value={contatoTelefone}
                    onChange={(e) => setContatoTelefone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1">
                    Parentesco / Vínculo
                  </label>
                  <input
                    type="text"
                    value={contatoParentesco}
                    onChange={(e) => setContatoParentesco(e.target.value)}
                    placeholder="Ex.: Cônjuge, Filho(a)"
                    className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#D9E2D4]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-[#6B7A6F] hover:text-[#26362B] px-3 py-2"
              >
                Voltar
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveStep2(true)}
                  className="text-xs text-[#6B7A6F] hover:text-[#26362B] px-3 py-2"
                >
                  Pular etapa
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSaveStep2(false)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold transition shadow"
                >
                  <span>Avançar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 Content */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-2xl bg-[#DCE9D4] text-[#4C7A5A] mx-auto flex items-center justify-center mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-serif italic font-semibold text-xl text-[#26362B]">
                Você no controle da saúde da família
              </h3>
              <p className="text-xs text-[#6B7A6F] mt-1 max-w-md mx-auto leading-relaxed">
                Agora o SeviSaúde suporta <strong>múltiplos titulares de saúde</strong> e{' '}
                <strong>convite a familiares ou cuidadores</strong> com permissões granulares.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4]">
                <div className="w-8 h-8 rounded-full bg-[#4C7A5A] text-white flex items-center justify-center shrink-0 text-xs">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#26362B]">Cadastrar medicações</h4>
                  <p className="text-[11px] text-[#6B7A6F]">
                    Controle posologias, horários e trilha imutável de alterações.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4]">
                <div className="w-8 h-8 rounded-full bg-[#5B9A8B] text-white flex items-center justify-center shrink-0 text-xs">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#26362B]">
                    Adicionar profissionais e consultas
                  </h4>
                  <p className="text-[11px] text-[#6B7A6F]">
                    Registro pós-consulta estruturado e histórico completo.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4]">
                <div className="w-8 h-8 rounded-full bg-[#4C7A5A] text-white flex items-center justify-center shrink-0 text-xs">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#26362B]">Convidar familiares</h4>
                  <p className="text-[11px] text-[#6B7A6F]">
                    Conceda acesso controlado em "Meu perfil e configurações".
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#D9E2D4]">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs text-[#6B7A6F] hover:text-[#26362B] px-3 py-2"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleFinish}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold transition shadow"
              >
                <Check className="w-4 h-4" />
                <span>Começar a usar o SeviSaúde</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
