import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  Download,
  Edit3,
  ImagePlus,
  Minus,
  Plus,
  QrCode,
  Trash2,
  UserRound,
  Users
} from "lucide-react";

import { EventHeaderCard } from "./components/EventHeaderCard";
import { Stepper } from "./components/Stepper";
import { TopBar } from "./components/TopBar";
import { Card } from "./components/ui/Card";
import { InputField } from "./components/ui/Input";
import { PrimaryButton } from "./components/ui/PrimaryButton";
import { SelectField } from "./components/ui/Select";
import { SummaryRow } from "./components/ui/SummaryRow";
import { RegistrationProvider, useRegistration } from "./store/registration-store";
import { formatCpf, formatCurrency, isCpfFormatValid } from "./utils/format";

const steps = [
  { label: "CPF", caption: "Respons\u00e1vel" },
  { label: "Unidade", caption: "Distrito e Igreja" },
  { label: "Participantes", caption: "Dados individuais" },
  { label: "Revis\u00e3o", caption: "Confira" }
];

const districtOptions = [
  { label: "Ipitiga", value: "Ipitiga" },
  { label: "Moju", value: "Moju" },
  { label: "Belem", value: "Belem" }
];

const churchOptions = [
  { label: "Ipitiga Do Moju", value: "Ipitiga Do Moju" },
  { label: "Central Ipitiga", value: "Central Ipitiga" },
  { label: "Nova Vida", value: "Nova Vida" }
];

const genderOptions = [
  { label: "Selecione", value: "" },
  { label: "Masculino", value: "Masculino" },
  { label: "Feminino", value: "Feminino" }
];

const StepCpf = ({ onNext }: { onNext: () => void }) => {
  const { cpfResponsavel, setCpfResponsavel } = useRegistration();
  const [error, setError] = useState("");

  const handleChange = (value: string) => {
    setCpfResponsavel(formatCpf(value));
    setError("");
  };

  const handleVerify = () => {
    if (!isCpfFormatValid(cpfResponsavel)) {
      setError("CPF inv\u00e1lido. Use o formato 000.000.000-00.");
      return;
    }
    onNext();
  };

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Identifica\u00e7\u00e3o</h3>
      </div>
      <InputField
        label="CPF do Respons\u00e1vel"
        placeholder="000.000.000-00"
        value={cpfResponsavel}
        onChange={handleChange}
        icon={<CreditCard size={18} />}
        helper="Informe o CPF do respons\u00e1vel financeiro pela inscri\u00e7\u00e3o."
        inputMode="numeric"
        error={error}
      />
      <PrimaryButton onClick={handleVerify}>
        Verificar CPF <ArrowRight size={18} />
      </PrimaryButton>
    </Card>
  );
};

const StepUnidade = ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => {
  const { district, setDistrict, church, setChurch, participants, setParticipantCount } = useRegistration();

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-semibold text-slate-900">Selecione sua Unidade</h3>
      </div>
      <Card className="space-y-4">
        <SelectField
          label="Distrito"
          value={district}
          onChange={setDistrict}
          options={districtOptions}
        />
        <SelectField
          label="Igreja"
          value={church}
          onChange={setChurch}
          options={churchOptions}
        />
        <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
              <Users size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Participantes</p>
              <p className="text-xs text-slate-400">Incluindo voc\u00ea</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
            <button
              type="button"
              onClick={() => setParticipantCount(participants.length - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
            >
              <Minus size={16} />
            </button>
            <span className="min-w-[24px] text-center text-sm font-semibold text-slate-700">
              {participants.length}
            </span>
            <button
              type="button"
              onClick={() => setParticipantCount(participants.length + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--primary)] text-white"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </Card>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base font-semibold text-slate-600"
        >
          <ArrowLeft size={18} /> Voltar
        </button>
        <PrimaryButton onClick={onNext} className="w-full">
          Avan\u00e7ar <ArrowRight size={18} />
        </PrimaryButton>
      </div>
    </div>
  );
};

const StepParticipantes = ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => {
  const { participants, addParticipant, removeParticipant, updateParticipant } = useRegistration();

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-semibold text-slate-900">Detalhes dos Participantes</h3>
        <p className="text-sm text-slate-400">
          Preencha as informa\u00e7\u00f5es de quem ir\u00e1 ao evento.
        </p>
      </div>

      <div className="space-y-4 stagger">
        {participants.map((participant, index) => {
          const isPrimary = index === 0;
          return (
            <Card key={participant.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <UserRound size={18} className="text-[color:var(--primary)]" />
                  <span>PARTICIPANTE {index + 1}</span>
                  {isPrimary ? (
                    <span className="ml-2 rounded-full bg-[color:var(--primary-soft)] px-2 py-1 text-[10px] font-semibold text-[color:var(--primary)]">
                      PRINCIPAL
                    </span>
                  ) : null}
                </div>
                {!isPrimary ? (
                  <button
                    type="button"
                    onClick={() => removeParticipant(participant.id)}
                    className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-500"
                  >
                    <Trash2 size={14} /> REMOVER
                  </button>
                ) : null}
              </div>

              <InputField
                label="CPF"
                placeholder="000.000.000-00"
                value={participant.cpf}
                onChange={(value) => updateParticipant(participant.id, { cpf: formatCpf(value) })}
                inputMode="numeric"
              />
              <InputField
                label="Nome Completo"
                placeholder="Ex: Joao Silva"
                value={participant.fullName}
                onChange={(value) => updateParticipant(participant.id, { fullName: value })}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="Nascimento"
                  placeholder="DD/MM"
                  value={participant.birthDate}
                  onChange={(value) => updateParticipant(participant.id, { birthDate: value })}
                />
                <SelectField
                  label="G\u00eanero"
                  value={participant.gender}
                  onChange={(value) => updateParticipant(participant.id, { gender: value })}
                  options={genderOptions}
                />
              </div>
              <SelectField
                label="Distrito"
                value={participant.district}
                onChange={(value) => updateParticipant(participant.id, { district: value })}
                options={districtOptions}
              />
              <SelectField
                label="Igreja"
                value={participant.church}
                onChange={(value) => updateParticipant(participant.id, { church: value })}
                options={churchOptions}
              />
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Foto do Participante</p>
                <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                      <ImagePlus size={18} />
                    </div>
                    <div className="text-xs text-slate-500">
                      <p className="font-semibold text-slate-600">Nenhum arquivo</p>
                      <p>JPG, PNG (Max 5mb)</p>
                    </div>
                  </div>
                  <label className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                    Escolher
                    <input type="file" className="hidden" />
                  </label>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addParticipant}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 py-3 text-sm font-semibold text-[color:var(--primary)]"
      >
        <Plus size={16} /> Adicionar participante
      </button>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base font-semibold text-slate-600"
        >
          <ArrowLeft size={18} /> Voltar
        </button>
        <PrimaryButton onClick={onNext} className="w-full">
          Avan\u00e7ar <ArrowRight size={18} />
        </PrimaryButton>
      </div>
    </div>
  );
};

const StepRevisao = ({ onBack, onConfirm }: { onBack: () => void; onConfirm: () => void }) => {
  const {
    cpfResponsavel,
    district,
    church,
    participants,
    paymentMethod,
    setPaymentMethod,
    totalAmount,
    pricePerParticipant
  } = useRegistration();

  const participantLabel = useMemo(() => `${participants.length}`, [participants.length]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          RETIRO ESPIRITUAL 2026
        </p>
        <h3 className="text-lg font-semibold text-slate-900">Distrito de Ipitiga</h3>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-base font-semibold text-slate-900">Revis\u00e3o dos dados</h4>
            <p className="text-xs text-slate-400">PASSO FINAL</p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-[color:var(--primary)]"
          >
            Editar
          </button>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            RESPONS\u00c1VEL
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800">THIAGO DE SOUZA TELES</p>
          <p className="text-xs text-slate-500">CPF: {cpfResponsavel || "042.292.442-31"}</p>
          <div className="mt-3 grid grid-cols-2 gap-4 text-xs text-slate-500">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Distrito</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{district}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Igreja</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{church}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <h4 className="text-base font-semibold text-slate-900">Forma de pagamento</h4>
        <button
          type="button"
          onClick={() => setPaymentMethod("PIX_MERCADO_PAGO")}
          className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
            paymentMethod === "PIX_MERCADO_PAGO"
              ? "border-[color:var(--primary)] bg-blue-50/60"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-[color:var(--primary)]">
              <QrCode size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">PIX (Mercado Pago)</p>
              <p className="text-xs text-slate-500">Pagamento autom\u00e1tico via Pix</p>
            </div>
          </div>
          <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[color:var(--primary)]">
            <div className="h-2.5 w-2.5 rounded-full bg-[color:var(--primary)]" />
          </div>
        </button>
        <p className="text-xs text-slate-400">Pagamento selecionado: PIX (Mercado Pago)</p>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-semibold text-slate-900">Participantes ({participantLabel})</h4>
          <p className="text-xs font-semibold text-[color:var(--primary)]">
            {formatCurrency(pricePerParticipant)} cada
          </p>
        </div>
        <div className="space-y-3 stagger">
          {participants.map((participant, index) => (
            <div
              key={participant.id}
              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <UserRound size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {participant.fullName || `Participante ${index + 1}`}
                  </p>
                    <p className="text-xs text-slate-400">{participant.gender || "Masculino"} \u2022 27 anos</p>
                </div>
              </div>
              <Edit3 size={18} className="text-slate-400" />
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-2">
          <SummaryRow label={`Inscri\u00e7\u00f5es (${participants.length}x)`} value={formatCurrency(totalAmount)} />
          <SummaryRow
            label="Taxas de processamento"
            value="Gr\u00e1tis"
            valueClassName="text-emerald-500"
          />
          <div className="h-px bg-slate-100" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">TOTAL A PAGAR</p>
              <p className="text-2xl font-bold text-[color:var(--primary)]">{formatCurrency(totalAmount)}</p>
            </div>
            <div className="text-right text-xs text-slate-400">
              <p>Lote vigente</p>
              <p className="text-sm font-semibold text-slate-700">3o Lote</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base font-semibold text-slate-600"
        >
          <ArrowLeft size={18} /> Voltar
        </button>
        <PrimaryButton onClick={onConfirm} className="w-full">
          Gerar pagamento <ArrowRight size={18} />
        </PrimaryButton>
      </div>
    </div>
  );
};

const PaymentScreen = ({ onBack }: { onBack: () => void }) => {
  const { totalAmount } = useRegistration();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-lg font-semibold text-slate-900">Pagamento</h2>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-500">
          <CheckCircle2 size={40} />
        </div>
        <h3 className="mt-4 text-2xl font-bold text-slate-900">Pedido Gerado!</h3>
        <p className="mt-2 max-w-xs text-sm text-slate-500">
          Sua vaga no retiro est\u00e1 reservada. Conclua o pagamento via PIX para garantir sua
          participa\u00e7\u00e3o.
        </p>
      </div>

      <Card className="space-y-5 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">VALOR A PAGAR</p>
          <p className="mt-2 text-2xl font-bold text-[color:var(--primary)]">
            {formatCurrency(totalAmount || 150)}
          </p>
        </div>
        <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-100 to-slate-200">
          <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-white shadow-soft">
            <QrCode size={64} className="text-slate-500" />
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-orange-500">
          <Clock3 size={16} />
          <span>Expira em 29:59</span>
        </div>
      </Card>

      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 py-3 text-sm font-semibold text-[color:var(--primary)]"
      >
        <Copy size={18} /> Copiar C\u00f3digo PIX
      </button>

      <p className="text-center text-xs text-slate-400">
        Abra o app do seu banco e escolha a opc\u00e3o "PIX Copia e Cola" para realizar o pagamento.
      </p>

      <PrimaryButton className="mt-2">
        J\u00e1 realizei o pagamento <ArrowRight size={18} />
      </PrimaryButton>

      <button
        type="button"
        className="mx-auto flex items-center gap-2 text-sm font-semibold text-slate-500"
      >
        <Download size={16} /> Baixar comprovante da reserva
      </button>
    </div>
  );
};

const AppContent = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPayment, setShowPayment] = useState(false);

  const goNext = () => setCurrentStep((step) => Math.min(4, step + 1));
  const goBack = () => setCurrentStep((step) => Math.max(1, step - 1));

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-4 pb-32 pt-6">
        <TopBar />

        {showPayment ? (
          <div className="page-enter">
            <PaymentScreen onBack={() => setShowPayment(false)} />
          </div>
        ) : (
          <div className="flex flex-col gap-6 page-enter">
            <EventHeaderCard />
            <Stepper steps={steps} currentStep={currentStep} />
            {currentStep === 1 ? <StepCpf onNext={goNext} /> : null}
            {currentStep === 2 ? <StepUnidade onNext={goNext} onBack={goBack} /> : null}
            {currentStep === 3 ? <StepParticipantes onNext={goNext} onBack={goBack} /> : null}
            {currentStep === 4 ? (
              <StepRevisao onBack={goBack} onConfirm={() => setShowPayment(true)} />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

const App = () => (
  <RegistrationProvider>
    <AppContent />
  </RegistrationProvider>
);

export default App;
