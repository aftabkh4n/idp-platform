export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5107").replace(/\/$/, "");

export const HUB_URL = `${API_URL}/hubs/provisioning`;
