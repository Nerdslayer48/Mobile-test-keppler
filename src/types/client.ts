export interface ClientInput {
  clientType: "individual" | "company";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  otherContact: string;
  companyName: string;
  companyAddress: string;
  hotline: string;
}
export interface Client extends ClientInput {
  id: string;
  name: string;
}
export const emptyClient: ClientInput = {
  clientType: "individual", firstName: "", lastName: "", email: "",
  phone: "", address: "", otherContact: "", companyName: "",
  companyAddress: "", hotline: "",
};
export function clientDisplayName(client: ClientInput) {
  return client.clientType === "company" ? client.companyName.trim()
    : [client.firstName.trim(), client.lastName.trim()].filter(Boolean).join(" ");
}
