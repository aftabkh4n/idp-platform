import { LANGUAGES, type Language, type ServiceRequest } from "./types";

export interface ServiceFormValues {
  name: string;
  language: string;
  owner: string;
  description: string;
}

export type FieldErrors = Partial<Record<keyof ServiceFormValues, string>>;

// The name becomes a GitHub repo and a Kubernetes namespace, so it has to be
// a valid DNS-1123 label: lowercase alphanumerics and '-', max 63 characters.
const SERVICE_NAME = /^[a-z]([a-z0-9-]*[a-z0-9])?$/;
// GitHub usernames: alphanumerics and single hyphens, not at either end.
const GITHUB_USER = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export const NAME_MAX = 63;
export const DESCRIPTION_MAX = 350;

export function validateField(field: keyof ServiceFormValues, values: ServiceFormValues) {
  const value = values[field].trim();
  switch (field) {
    case "name":
      if (!value) return "Enter a service name.";
      if (value.length < 3) return "Use at least 3 characters.";
      if (value.length > NAME_MAX) return `Use ${NAME_MAX} characters or fewer.`;
      if (!SERVICE_NAME.test(value))
        return "Use lowercase letters, numbers and hyphens, starting with a letter (e.g. payments-api).";
      return undefined;
    case "language":
      if (!LANGUAGES.some((l) => l.value === value)) return "Choose a language.";
      return undefined;
    case "owner":
      if (!value) return "Enter the GitHub username that owns the service.";
      if (!GITHUB_USER.test(value)) return "That isn't a valid GitHub username.";
      return undefined;
    case "description":
      if (value.length > DESCRIPTION_MAX) return `Keep it under ${DESCRIPTION_MAX} characters.`;
      return undefined;
  }
}

export const FIELD_ORDER: (keyof ServiceFormValues)[] = ["name", "language", "owner", "description"];

export function validateServiceForm(values: ServiceFormValues): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of FIELD_ORDER) {
    const message = validateField(field, values);
    if (message) errors[field] = message;
  }
  return errors;
}

export function toServiceRequest(values: ServiceFormValues): ServiceRequest {
  const description = values.description.trim();
  return {
    name: values.name.trim(),
    language: values.language as Language,
    owner: values.owner.trim(),
    description: description || null,
  };
}
