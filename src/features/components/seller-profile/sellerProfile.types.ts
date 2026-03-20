export type WalletPixKeyType = "EMAIL" | "CPF" | "CNPJ" | "PHONE" | "EVP";

export type BeneficiaryPixKeyType = "EMAIL" | "CPF" | "CNPJ" | "PHONE" | "RANDOM";

export type DestinationDTO = {
  id: string;
  walletId: string;
  pixKey: string;
  pixKeyType: WalletPixKeyType;
  holderName: string;
  holderDoc: string;
  bankName: string;
  notes?: string | null;
  pixKeyChangedAt?: string | null;
  payoutBlockedUntil?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProfileMeDTO = {
  email?: string;
  role?: string;
  seller?: { id: string; referralToken: string } | null;
};

export type WalletResp = {
  wallet?: { id: string; available: string; pending: string };
  destination?: DestinationDTO | null;
};

export type SellerBeneficiaryDTO = {
  id: string;
  sellerId: string;
  beneficiaryType: "SELLER";
  fullName: string;
  document: string;
  email?: string | null;
  phone?: string | null;
  birthDate?: string | null;

  pixKeyType?: BeneficiaryPixKeyType | null;
  pixKey?: string | null;

  bankCode?: string | null;
  bankName?: string | null;
  accountType?: "CHECKING" | "SAVINGS" | null;
  agency?: string | null;
  accountNumber?: string | null;
  accountDigit?: string | null;
  accountHolderName?: string | null;
  accountHolderDocument?: string | null;

  notes?: string | null;

  createdAt: string;
  updatedAt: string;
};

export type SellerBeneficiaryResp = {
  item: SellerBeneficiaryDTO | null;
};

export type SellerReferralCustomer = {
  id: string;
  type: "CUSTOMER";
  name: string;
  email: string;
  phone?: string | null;
  role?: string | null;
  createdAt: string;
};

export type SellerReferralSalon = {
  id: string;
  type: "SALON";
  name: string;
  email: string;
  city?: string | null;
  state?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  createdAt: string;
};

export type SellerReferralsResponse = {
  ok: boolean;
  referralToken?: string | null;
  summary: {
    totalCustomers: number;
    totalSalons: number;
    total: number;
  };
  customers: SellerReferralCustomer[];
  salons: SellerReferralSalon[];
};

export type ViewMode =
  | "HOME"
  | "TOKEN"
  | "PIX"
  | "DETAILS"
  | "LINK_SALON"
  | "BENEFICIARY"
  | "REFERRALS";

export type ModalState = null | { title: string; message: string };

export type BeneficiaryPayload = {
  fullName: string;
  document: string;
  email?: string;
  phone?: string;
  birthDate?: string;

  pixKeyType?: BeneficiaryPixKeyType;
  pixKey?: string;

  bankCode?: string;
  bankName?: string;
  accountType?: "CHECKING" | "SAVINGS";
  agency?: string;
  accountNumber?: string;
  accountDigit?: string;
  accountHolderName?: string;
  accountHolderDocument?: string;

  notes?: string;
};

export type WalletPixFormState = {
  pixKeyType: WalletPixKeyType;
  setPixKeyType: (v: WalletPixKeyType) => void;
  pixKey: string;
  setPixKey: (v: string) => void;
  holderName: string;
  setHolderName: (v: string) => void;
  holderDoc: string;
  setHolderDoc: (v: string) => void;
  bankName: string;
  setBankName: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  normalizedPixKey: string;
};

export type BeneficiaryFormState = {
  fullName: string;
  setFullName: (v: string) => void;
  document: string;
  setDocument: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  birthDate: string;
  setBirthDate: (v: string) => void;

  pixKeyType: BeneficiaryPixKeyType;
  setPixKeyType: (v: BeneficiaryPixKeyType) => void;
  pixKey: string;
  setPixKey: (v: string) => void;

  bankCode: string;
  setBankCode: (v: string) => void;
  bankName: string;
  setBankName: (v: string) => void;
  accountType: "CHECKING" | "SAVINGS";
  setAccountType: (v: "CHECKING" | "SAVINGS") => void;
  agency: string;
  setAgency: (v: string) => void;
  accountNumber: string;
  setAccountNumber: (v: string) => void;
  accountDigit: string;
  setAccountDigit: (v: string) => void;
  accountHolderName: string;
  setAccountHolderName: (v: string) => void;
  accountHolderDocument: string;
  setAccountHolderDocument: (v: string) => void;

  notes: string;
  setNotes: (v: string) => void;

  payload: BeneficiaryPayload;
};