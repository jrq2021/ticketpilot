import type {
  ActionDraft,
  AgentRecommendation,
  Customer,
  KnowledgeDoc,
  Product,
  ServiceOpsStore,
  Ticket,
  WarrantyPolicy,
} from "../../types/serviceops.ts";
import type { ServiceOpsRepository } from "./serviceops.repository.ts";

interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

export class SupabaseRepository implements ServiceOpsRepository {
  private config: SupabaseConfig;

  constructor(config: SupabaseConfig) {
    this.config = config;
  }

  private async supabaseFetch<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.config.url.replace(/\/$/, "")}/rest/v1/${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        apikey: this.config.serviceRoleKey,
        Authorization: `Bearer ${this.config.serviceRoleKey}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Supabase ${res.status} on ${path}: ${body.slice(0, 200)}`,
      );
    }

    return res.json();
  }

  async getStoreSnapshot(): Promise<ServiceOpsStore> {
    const [
      tickets,
      customers,
      products,
      policies,
      knowledgeDocs,
      recommendations,
      actionDrafts,
    ] = await Promise.all([
      this.listTickets(),
      this.listCustomers(),
      this.listProducts(),
      this.listWarrantyPolicies(),
      this.listKnowledgeDocs(),
      this.listRecommendations(),
      this.listActionDrafts(),
    ]);

    return {
      tickets,
      customers,
      products,
      policies,
      knowledgeDocs,
      recommendations,
      actionDrafts,
    };
  }

  async listTickets(): Promise<Ticket[]> {
    return this.supabaseFetch<Ticket[]>("tickets?select=*");
  }

  async getTicketById(id: string): Promise<Ticket | undefined> {
    const rows = await this.supabaseFetch<Ticket[]>(
      `tickets?select=*&id=eq.${encodeURIComponent(id)}`,
    );
    return rows[0];
  }

  async updateTicket(ticket: Ticket): Promise<void> {
    await this.supabaseFetch(`tickets?id=eq.${encodeURIComponent(ticket.id)}`, {
      method: "PATCH",
      body: JSON.stringify(ticket),
    });
  }

  async listCustomers(): Promise<Customer[]> {
    return this.supabaseFetch<Customer[]>("customers?select=*");
  }

  async listProducts(): Promise<Product[]> {
    return this.supabaseFetch<Product[]>("products?select=*");
  }

  async listWarrantyPolicies(): Promise<WarrantyPolicy[]> {
    return this.supabaseFetch<WarrantyPolicy[]>("warranty_policies?select=*");
  }

  async listKnowledgeDocs(): Promise<KnowledgeDoc[]> {
    return this.supabaseFetch<KnowledgeDoc[]>("knowledge_docs?select=*");
  }

  async listRecommendations(): Promise<AgentRecommendation[]> {
    return this.supabaseFetch<AgentRecommendation[]>(
      "recommendations?select=*",
    );
  }

  async getRecommendationByTicketId(
    ticketId: string,
  ): Promise<AgentRecommendation | undefined> {
    const rows = await this.supabaseFetch<AgentRecommendation[]>(
      `recommendations?select=*&ticketId=eq.${encodeURIComponent(ticketId)}`,
    );
    return rows[0];
  }

  async upsertRecommendation(rec: AgentRecommendation): Promise<void> {
    const existing = await this.getRecommendationByTicketId(rec.ticketId);
    if (existing) {
      await this.supabaseFetch(
        `recommendations?ticketId=eq.${encodeURIComponent(rec.ticketId)}`,
        {
          method: "PATCH",
          body: JSON.stringify(rec),
        },
      );
    } else {
      await this.supabaseFetch("recommendations", {
        method: "POST",
        body: JSON.stringify(rec),
      });
    }
  }

  async listActionDrafts(): Promise<ActionDraft[]> {
    return this.supabaseFetch<ActionDraft[]>("action_drafts?select=*");
  }

  async getActionDraftByTicketId(
    ticketId: string,
  ): Promise<ActionDraft | undefined> {
    const rows = await this.supabaseFetch<ActionDraft[]>(
      `action_drafts?select=*&ticketId=eq.${encodeURIComponent(ticketId)}`,
    );
    return rows[0];
  }

  async upsertActionDraft(draft: ActionDraft): Promise<void> {
    const existing = await this.getActionDraftByTicketId(draft.ticketId);
    if (existing) {
      await this.supabaseFetch(
        `action_drafts?ticketId=eq.${encodeURIComponent(draft.ticketId)}`,
        {
          method: "PATCH",
          body: JSON.stringify(draft),
        },
      );
    } else {
      await this.supabaseFetch("action_drafts", {
        method: "POST",
        body: JSON.stringify(draft),
      });
    }
  }
}
