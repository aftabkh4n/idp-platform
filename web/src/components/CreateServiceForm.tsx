"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ApiError, createService } from "@/lib/api";
import { serviceKeys } from "@/lib/queries";
import { LANGUAGES, type ProvisionedService } from "@/lib/types";
import {
  DESCRIPTION_MAX,
  FIELD_ORDER,
  toServiceRequest,
  validateField,
  validateServiceForm,
  type FieldErrors,
  type ServiceFormValues,
} from "@/lib/validation";

const EMPTY: ServiceFormValues = { name: "", language: "dotnet", owner: "", description: "" };

type Field = keyof ServiceFormValues;

interface Props {
  onCreated: (id: string) => void;
}

export function CreateServiceForm({ onCreated }: Props) {
  const queryClient = useQueryClient();
  const formId = useId();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const fieldRefs = useRef<Partial<Record<Field, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>>({});
  const formErrorRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation({
    mutationFn: createService,
    onSuccess: (res, request) => {
      // Seed the detail cache so the live view renders straight away, before
      // its own fetch returns and before the first hub event.
      const now = new Date().toISOString();
      queryClient.setQueryData<ProvisionedService>(serviceKeys.detail(res.id), {
        id: res.id,
        ...request,
        status: res.status,
        repoUrl: null,
        serviceUrl: null,
        errorMessage: null,
        failedStep: null,
        createdAt: now,
        updatedAt: null,
      });
      void queryClient.invalidateQueries({ queryKey: serviceKeys.list() });
      onCreated(res.id);
    },
    onError: (error) => {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
        const serverErrors: FieldErrors = {};
        for (const field of FIELD_ORDER) {
          if (error.fieldErrors[field]) serverErrors[field] = error.fieldErrors[field];
        }
        setErrors(serverErrors);
        focusFirstError(serverErrors);
      }
    },
  });

  function focusFirstError(errs: FieldErrors) {
    const first = FIELD_ORDER.find((f) => errs[f]);
    if (first) fieldRefs.current[first]?.focus();
  }

  function update(field: Field, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    // Once a field has been left, re-check it as the user types so the error clears promptly.
    if (touched[field]) setErrors((e) => ({ ...e, [field]: validateField(field, next) }));
  }

  function blur(field: Field) {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors((e) => ({ ...e, [field]: validateField(field, values) }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (mutation.isPending) return;
    const errs = validateServiceForm(values);
    setErrors(errs);
    setTouched({ name: true, language: true, owner: true, description: true });
    if (Object.keys(errs).length > 0) {
      focusFirstError(errs);
      return;
    }
    mutation.mutate(toServiceRequest(values));
  }

  const fieldProps = (field: Field) => {
    const id = `${formId}-${field}`;
    const error = errors[field];
    return {
      id,
      name: field,
      value: values[field],
      "aria-invalid": error ? true : undefined,
      "aria-describedby": [`${id}-hint`, error ? `${id}-error` : null].filter(Boolean).join(" "),
      onBlur: () => blur(field),
      ref: (el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null) => {
        fieldRefs.current[field] = el;
      },
    };
  };

  const errorText = (field: Field) =>
    errors[field] ? (
      <p className="field-error" id={`${formId}-${field}-error`}>
        {errors[field]}
      </p>
    ) : null;

  const formError =
    mutation.isError &&
    !(mutation.error instanceof ApiError && Object.keys(mutation.error.fieldErrors).length > 0);

  // Move focus to the error summary so keyboard and screen reader users notice it.
  useEffect(() => {
    if (formError) formErrorRef.current?.focus();
  }, [formError, mutation.error]);

  return (
    <form className="form" onSubmit={submit} noValidate aria-busy={mutation.isPending}>
      {formError && (
        <div className="panel panel-danger" role="alert" tabIndex={-1} ref={formErrorRef}>
          <p className="panel-title">Couldn&apos;t start provisioning</p>
          <p>{mutation.error.message}</p>
        </div>
      )}

      <div className="field">
        <label htmlFor={`${formId}-name`}>Service name</label>
        <p className="hint" id={`${formId}-name-hint`}>
          Becomes the GitHub repo and Kubernetes namespace. Lowercase, hyphens allowed.
        </p>
        <input
          {...fieldProps("name")}
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="e.g. payments-api"
          onChange={(e) => update("name", e.target.value)}
        />
        {errorText("name")}
      </div>

      <div className="field">
        <label htmlFor={`${formId}-language`}>Language</label>
        <p className="hint" id={`${formId}-language-hint`}>
          Picks the Dockerfile and CI template.
        </p>
        <select {...fieldProps("language")} onChange={(e) => update("language", e.target.value)}>
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        {errorText("language")}
      </div>

      <div className="field">
        <label htmlFor={`${formId}-owner`}>Owner</label>
        <p className="hint" id={`${formId}-owner-hint`}>
          GitHub username of the team or person responsible.
        </p>
        <input
          {...fieldProps("owner")}
          type="text"
          autoComplete="username"
          spellCheck={false}
          placeholder="e.g. octocat"
          onChange={(e) => update("owner", e.target.value)}
        />
        {errorText("owner")}
      </div>

      <div className="field">
        <label htmlFor={`${formId}-description`}>
          Description <span className="optional">(optional)</span>
        </label>
        <p className="hint" id={`${formId}-description-hint`}>
          Used for the repo description and the generated README. {values.description.length}/{DESCRIPTION_MAX}
        </p>
        <textarea {...fieldProps("description")} rows={3} onChange={(e) => update("description", e.target.value)} />
        {errorText("description")}
      </div>

      <div className="form-actions">
        <button type="submit" className="button" disabled={mutation.isPending}>
          {mutation.isPending && <span className="spinner" aria-hidden="true" />}
          {mutation.isPending ? "Creating…" : "Create service"}
        </button>
      </div>
    </form>
  );
}
