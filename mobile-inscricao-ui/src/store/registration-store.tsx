import React, { createContext, useContext, useMemo, useState } from "react";
import { clamp } from "../utils/format";

export type Participant = {
  id: string;
  cpf: string;
  fullName: string;
  birthDate: string;
  gender: string;
  district: string;
  church: string;
  photoName: string;
};

type RegistrationContextValue = {
  cpfResponsavel: string;
  setCpfResponsavel: (value: string) => void;
  district: string;
  setDistrict: (value: string) => void;
  church: string;
  setChurch: (value: string) => void;
  participants: Participant[];
  setParticipantCount: (count: number) => void;
  addParticipant: () => void;
  removeParticipant: (id: string) => void;
  updateParticipant: (id: string, patch: Partial<Participant>) => void;
  paymentMethod: string;
  setPaymentMethod: (value: string) => void;
  pricePerParticipant: number;
  totalAmount: number;
};

const createParticipant = (index: number, district: string, church: string): Participant => ({
  id: `participant-${Date.now()}-${index}`,
  cpf: "",
  fullName: "",
  birthDate: "",
  gender: "",
  district,
  church,
  photoName: ""
});

const RegistrationContext = createContext<RegistrationContextValue | null>(null);

export const RegistrationProvider = ({ children }: { children: React.ReactNode }) => {
  const [cpfResponsavel, setCpfResponsavel] = useState("");
  const [district, setDistrict] = useState("Ipitiga");
  const [church, setChurch] = useState("Ipitiga Do Moju");
  const [participants, setParticipants] = useState<Participant[]>([
    createParticipant(1, district, church)
  ]);
  const [paymentMethod, setPaymentMethod] = useState("PIX_MERCADO_PAGO");

  const pricePerParticipant = 30;
  const totalAmount = participants.length * pricePerParticipant;

  const setParticipantCount = (count: number) => {
    const nextCount = clamp(count, 1, 10);
    setParticipants((prev) => {
      if (prev.length === nextCount) return prev;
      if (prev.length < nextCount) {
        const extra = Array.from({ length: nextCount - prev.length }).map((_, index) =>
          createParticipant(prev.length + index + 1, district, church)
        );
        return [...prev, ...extra];
      }
      return prev.slice(0, nextCount);
    });
  };

  const addParticipant = () => setParticipantCount(participants.length + 1);

  const removeParticipant = (id: string) => {
    setParticipants((prev) => {
      const filtered = prev.filter((participant) => participant.id !== id);
      return filtered.length ? filtered : prev;
    });
  };

  const updateParticipant = (id: string, patch: Partial<Participant>) => {
    setParticipants((prev) =>
      prev.map((participant) => (participant.id === id ? { ...participant, ...patch } : participant))
    );
  };

  const value = useMemo(
    () => ({
      cpfResponsavel,
      setCpfResponsavel,
      district,
      setDistrict,
      church,
      setChurch,
      participants,
      setParticipantCount,
      addParticipant,
      removeParticipant,
      updateParticipant,
      paymentMethod,
      setPaymentMethod,
      pricePerParticipant,
      totalAmount
    }),
    [
      cpfResponsavel,
      district,
      church,
      participants,
      paymentMethod,
      pricePerParticipant,
      totalAmount
    ]
  );

  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>;
};

export const useRegistration = () => {
  const context = useContext(RegistrationContext);
  if (!context) {
    throw new Error("useRegistration must be used within RegistrationProvider");
  }
  return context;
};
