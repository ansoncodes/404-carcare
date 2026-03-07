"use client";

import { create } from "zustand";

interface BookingWizardFields {
  vehicleId: string | null;
  airportId: string | null;
  date: string | null;
  serviceIds: string[];
  scheduledStart: string | null;
  parkingSlotId: string | null;
  parkingHours: number;
  notes: string;
}

interface BookingWizardState extends BookingWizardFields {
  setField: <K extends keyof BookingWizardFields>(key: K, value: BookingWizardFields[K]) => void;
  reset: () => void;
}

const initialState: BookingWizardFields = {
  vehicleId: null,
  airportId: null,
  date: null,
  serviceIds: [],
  scheduledStart: null,
  parkingSlotId: null,
  parkingHours: 1,
  notes: "",
};

export const useBookingStore = create<BookingWizardState>((set) => ({
  ...initialState,
  setField: (key, value) =>
    set((state) => ({
      ...state,
      [key]: value,
    })),
  reset: () => set(initialState),
}));
