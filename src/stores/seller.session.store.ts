import { create } from "zustand";

type SellerSessionState = {
  activeSalonId: string | null;
  setActiveSalonId: (id: string | null) => void;
  clearActiveSalon: () => void;
};

export const useSellerSessionStore = create<SellerSessionState>((set) => ({
  activeSalonId: null,
  setActiveSalonId: (id) => set({ activeSalonId: id }),
  clearActiveSalon: () => set({ activeSalonId: null }),
}));
