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
import { getStore } from "../data/seed.ts";
import type { ServiceOpsRepository } from "./serviceops.repository.ts";

export class MemoryRepository implements ServiceOpsRepository {
  private store: ServiceOpsStore;

  constructor() {
    this.store = getStore();
  }

  async getStoreSnapshot(): Promise<ServiceOpsStore> {
    return this.store;
  }

  async listTickets(): Promise<Ticket[]> {
    return this.store.tickets;
  }

  async getTicketById(id: string): Promise<Ticket | undefined> {
    return this.store.tickets.find((t) => t.id === id);
  }

  async updateTicket(ticket: Ticket): Promise<void> {
    const index = this.store.tickets.findIndex((t) => t.id === ticket.id);
    if (index >= 0) {
      this.store.tickets[index] = ticket;
    }
  }

  async listCustomers(): Promise<Customer[]> {
    return this.store.customers;
  }

  async listProducts(): Promise<Product[]> {
    return this.store.products;
  }

  async listWarrantyPolicies(): Promise<WarrantyPolicy[]> {
    return this.store.policies;
  }

  async listKnowledgeDocs(): Promise<KnowledgeDoc[]> {
    return this.store.knowledgeDocs;
  }

  async listRecommendations(): Promise<AgentRecommendation[]> {
    return this.store.recommendations;
  }

  async getRecommendationByTicketId(
    ticketId: string,
  ): Promise<AgentRecommendation | undefined> {
    return this.store.recommendations.find((r) => r.ticketId === ticketId);
  }

  async upsertRecommendation(rec: AgentRecommendation): Promise<void> {
    const index = this.store.recommendations.findIndex(
      (r) => r.ticketId === rec.ticketId,
    );
    if (index >= 0) {
      this.store.recommendations[index] = rec;
    } else {
      this.store.recommendations.push(rec);
    }
  }

  async listActionDrafts(): Promise<ActionDraft[]> {
    return this.store.actionDrafts;
  }

  async getActionDraftByTicketId(
    ticketId: string,
  ): Promise<ActionDraft | undefined> {
    return this.store.actionDrafts.find((d) => d.ticketId === ticketId);
  }

  async upsertActionDraft(draft: ActionDraft): Promise<void> {
    const index = this.store.actionDrafts.findIndex(
      (d) => d.ticketId === draft.ticketId,
    );
    if (index >= 0) {
      this.store.actionDrafts[index] = draft;
    } else {
      this.store.actionDrafts.push(draft);
    }
  }
}
