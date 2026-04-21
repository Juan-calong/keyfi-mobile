export type CheckoutAddressValues = {
  zipCode: string;
  zipcode?: string;
  streetName: string;
  streetNumber: string;
  neighborhood: string;
  city: string;
  federalUnit: string;
  complement?: string;
};

export type CheckoutProfileMode = "customer" | "owner";

function onlyDigits(v: string) {
  return String(v || "").replace(/\D/g, "");
}

function maskCep(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function resolveCheckoutAddressFromProfile(
  me: any,
  mode: CheckoutProfileMode
): CheckoutAddressValues {
  const baseUser = me?.user ?? me ?? {};
  const userProfile = me?.profile ?? baseUser?.profile ?? {};
  const rootAddress = me?.address ?? {};
  const profileAddress = userProfile?.address ?? {};
  const userAddress = baseUser?.address ?? {};
  const salon = me?.salon ?? baseUser?.salon ?? userProfile?.salon ?? {};

  const customerSource = {
    zipCode:
      rootAddress?.cep ??
      rootAddress?.zipCode ??
      profileAddress?.cep ??
      profileAddress?.zipCode ??
      userAddress?.cep ??
      userAddress?.zipCode ??
      baseUser?.cep ??
      baseUser?.zipCode ??
      userProfile?.cep ??
      userProfile?.zipCode ??
      "",
    streetName:
      rootAddress?.street ??
      rootAddress?.streetName ??
      profileAddress?.street ??
      profileAddress?.streetName ??
      userAddress?.street ??
      userAddress?.streetName ??
      baseUser?.street ??
      baseUser?.streetName ??
      userProfile?.street ??
      userProfile?.streetName ??
      "",
    streetNumber:
      rootAddress?.number ??
      rootAddress?.streetNumber ??
      profileAddress?.number ??
      profileAddress?.streetNumber ??
      userAddress?.number ??
      userAddress?.streetNumber ??
      baseUser?.number ??
      baseUser?.streetNumber ??
      userProfile?.number ??
      userProfile?.streetNumber ??
      "",
    neighborhood:
      rootAddress?.district ??
      rootAddress?.neighborhood ??
      profileAddress?.district ??
      profileAddress?.neighborhood ??
      userAddress?.district ??
      userAddress?.neighborhood ??
      baseUser?.district ??
      baseUser?.neighborhood ??
      userProfile?.district ??
      userProfile?.neighborhood ??
      "",
    city:
      rootAddress?.city ??
      profileAddress?.city ??
      userAddress?.city ??
      baseUser?.city ??
      userProfile?.city ??
      "",
    federalUnit:
      rootAddress?.state ??
      rootAddress?.federalUnit ??
      profileAddress?.state ??
      profileAddress?.federalUnit ??
      userAddress?.state ??
      userAddress?.federalUnit ??
      baseUser?.state ??
      baseUser?.federalUnit ??
      userProfile?.state ??
      userProfile?.federalUnit ??
      "",
    complement:
      rootAddress?.complement ??
      profileAddress?.complement ??
      userAddress?.complement ??
      baseUser?.complement ??
      userProfile?.complement ??
      "",
  };

  const ownerSource = {
    zipCode:
      salon?.cep ??
      salon?.zipCode ??
      baseUser?.cep ??
      baseUser?.zipCode ??
      userProfile?.cep ??
      userProfile?.zipCode ??
      "",
    streetName:
      salon?.street ??
      salon?.streetName ??
      baseUser?.street ??
      baseUser?.streetName ??
      userProfile?.street ??
      userProfile?.streetName ??
      "",
    streetNumber:
      salon?.number ??
      salon?.streetNumber ??
      baseUser?.number ??
      baseUser?.streetNumber ??
      userProfile?.number ??
      userProfile?.streetNumber ??
      "",
    neighborhood:
      salon?.district ??
      salon?.neighborhood ??
      baseUser?.district ??
      baseUser?.neighborhood ??
      userProfile?.district ??
      userProfile?.neighborhood ??
      "",
    city:
      salon?.city ??
      baseUser?.city ??
      userProfile?.city ??
      "",
    federalUnit:
      salon?.state ??
      salon?.federalUnit ??
      baseUser?.state ??
      baseUser?.federalUnit ??
      userProfile?.state ??
      userProfile?.federalUnit ??
      "",
    complement:
      salon?.complement ??
      baseUser?.complement ??
      userProfile?.complement ??
      "",
  };

  const source = mode === "owner" ? ownerSource : customerSource;
  const cleanZip = onlyDigits(String(source.zipCode || ""));

  return {
    zipCode: maskCep(cleanZip),
    zipcode: cleanZip,
    streetName: String(source.streetName || ""),
    streetNumber: String(source.streetNumber || ""),
    neighborhood: String(source.neighborhood || ""),
    city: String(source.city || ""),
    federalUnit: String(source.federalUnit || "").toUpperCase(),
    complement: String(source.complement || ""),
  };
}
