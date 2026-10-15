import React, { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHealthProfile } from '@/context/HealthProfileContext'
import { Heart, UserCheck, Pill, Users, ArrowRight, Check, Shield, Sparkles } from 'lucide-react'
import { SeviSaudeIcon } from '@/components/SeviSaudeLogo'
import { updateHealthProfile } from '@/services/healthProfileService'
import { toast } from '@/hooks/use-toast'

interface OnboardingModalProps {
  onClose: () => void
}

export default function OnboardingModal({ onClose }: OnboardingModalProps) {
  const { user } = useAuth()
  const { activeProfile, refreshProfiles, completeOnboarding } = useHealthProfile()
  const [step, setStep] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(false)

  // Step 1: Confirmar dados básicos do titular
  const [nome, setNome] = useState(activeProfile?.nome || user?.name || '')
  const [dataNascimento, setDataNascimento] = useState(activeProfile?.data_nascimento || '')
  const [tipoSanguineo, setTipoSanguineo] = useState(activeProfile?.tipo_sanguineo || '')
  const [alergias, setAlergias] = useState(activeProfile?.alergias || '')
  const [condicoesSaude, setCondicoesSaude] = useState(activeProfile?.condicoes_saude || '')

  // Step 2: Informações de emergência opcionais
  const [contatoNome, setContatoNome] = useState(activeProfile?.contato_emergencia_nome || '')
  const [contatoTelefone, setContatoTelefone] = useState(
    activeProfile?.contato_emergencia_telefone || '',
  )
  const [contatoParentesco, setContatoParentesco] = useState(
    activeProfile?.contato_emergencia_parentesco || '',
  )

  const handleSaveStep1 = async (skip = false) => {
    if (!skip && activeProfile) {
      setLoading(true)
      try {
        await updateHealthProfile(activeProfile.id, {
          nome: nome.trim() || activeProfile.nome,
          data_nascimento: dataNascimento,
          tipo_sanguineo: tipoSanguineo,
          alergias,
          condicoes_saude: condicoesSaude,
        })
      } catch (err) {
        console.warn('Erro ao atualizar titular no onboarding:', err)
      } finally {
        setLoading(false)
      }
    }
    setStep(2)
  }

  const handleSaveStep2 = async (skip = false) => {
    if (!skip && activeProfile) {
      setLoading(true)
      try {
        await updateHealthProfile(activeProfile.id, {
          contato_emergencia_nome: contatoNome,
          contato_emergencia_telefone: contatoTelefone,
          contato_emergencia_parentesco: contatoParentesco,
        })
      } catch (err) {
        console.warn('Erro ao atualizar contato emergência no onboarding:', err)
      } finally {
        setLoading(false)
      }
    }
    setStep(3)
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
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
