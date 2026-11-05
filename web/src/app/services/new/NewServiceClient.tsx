"use client";

import { useRouter } from "next/navigation";
import { CreateServiceForm } from "@/components/CreateServiceForm";

export function NewServiceClient() {
  const router = useRouter();
  return <CreateServiceForm onCreated={(id) => router.push(`/services/${id}`)} />;
}
