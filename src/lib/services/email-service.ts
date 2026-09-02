/**
 * MockEmailProvider — writes emails to the local dev inbox (emails collection).
 * Never sends anything. Reset links land here; they are NOT exposed via the UI.
 */

import type { EmailMessage } from "@/domain/entities";
import { repos } from "@/data/repositories";

export async function sendEmail(input: {
  to: string;
  subject: string;
  body: string;
  template: string;
}): Promise<EmailMessage> {
  const at = new Date().toISOString();
  return repos().emails.create({
    at,
    to: input.to,
    subject: input.subject,
    body: input.body,
    template: input.template,
  });
}

export async function listInbox(to?: string): Promise<EmailMessage[]> {
  const rows = to
    ? await repos().emails.findMany((m) => m.to === to)
    : await repos().emails.list();
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function findLatestByTemplate(template: string, to: string): Promise<EmailMessage | null> {
  const rows = await listInbox(to);
  return rows.find((m) => m.template === template) ?? null;
}
